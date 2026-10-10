"""Rate limiting for endpoints attackers hammer: login, register, Google sign-in.

Counters live in RATE_LIMIT_STORAGE_URL. memory:// is per process and resets
on restart: fine for one dev server. Use redis:// once there's more than one
worker, or each worker counts separately.
"""

import hmac
import time
from math import ceil

from fastapi import HTTPException, Request, status
from limits import RateLimitItem
from limits.storage import storage_from_string
from limits.strategies import MovingWindowRateLimiter

from app.core.config import settings

storage = storage_from_string(settings.rate_limit_storage_url)
limiter = MovingWindowRateLimiter(storage)

# Keys are attacker-supplied (IPs, emails); cap them so they can't bloat storage.
MAX_KEY_LENGTH = 255


def client_ip(request: Request) -> str:
    """The browser's IP address, for per-IP limits.

    The browser never calls us: Next.js does, so request.client is the Next
    server. Next passes the browser's IP in X-Client-IP, and the shared secret
    proves the header came from Next. Without the secret, the caller is talking
    to us directly and is limited by its own address.
    """
    forwarded = request.headers.get("x-client-ip")
    secret = request.headers.get("x-internal-secret", "")
    if forwarded and hmac.compare_digest(
        secret.encode(), settings.internal_api_secret.encode()
    ):
        return forwarded[:MAX_KEY_LENGTH]
    return request.client.host if request.client else "unknown"


def _too_many_requests(limit: RateLimitItem, *keys: str) -> HTTPException:
    reset_at, _ = limiter.get_window_stats(limit, *keys)
    return HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        "Too many attempts. Try again later.",
        headers={"Retry-After": str(max(1, ceil(reset_at - time.time())))},
    )


def _keys(keys: tuple[str, ...]) -> tuple[str, ...]:
    return tuple(key[:MAX_KEY_LENGTH] for key in keys)


def hit(limit: RateLimitItem, *keys: str) -> None:
    """Count this request; raise 429 if it goes over the limit."""
    keys = _keys(keys)
    if not limiter.hit(limit, *keys):
        raise _too_many_requests(limit, *keys)


def check(limit: RateLimitItem, *keys: str) -> None:
    """Raise 429 if the limit is already used up, without counting this request.

    Pair with record() to count only some outcomes, such as failed logins.
    """
    keys = _keys(keys)
    if not limiter.test(limit, *keys):
        raise _too_many_requests(limit, *keys)


def record(limit: RateLimitItem, *keys: str) -> None:
    limiter.hit(limit, *_keys(keys))


def clear(limit: RateLimitItem, *keys: str) -> None:
    limiter.clear(limit, *_keys(keys))
