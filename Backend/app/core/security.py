import hashlib
import hmac
import uuid
from datetime import timedelta

import bcrypt
import jwt

from app.core.config import settings
from app.core.time import utc_now

JWT_ALGORITHM = "HS512"
BCRYPT_ROUNDS = 12  # ~250 ms per hash on a laptop: slow for attackers, fine for logins


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(BCRYPT_ROUNDS)).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


# Checked against when the email doesn't exist, so a login for an unknown email
# takes as long as one for a known email. Otherwise response time reveals which
# emails are registered.
_DUMMY_HASH = hash_password("dummy-password-for-timing")


def burn_password_check(password: str) -> None:
    verify_password(password, _DUMMY_HASH)


def password_fingerprint(hashed_password: str | None) -> str:
    """Changes whenever the password does (bcrypt salts every hash). Session and
    reset tokens carry it, so a password change ends every session and kills
    every older reset link."""
    digest = hmac.new(
        settings.jwt_secret.encode(), (hashed_password or "").encode(), hashlib.sha256
    )
    return digest.hexdigest()[:32]


def create_access_token(user_id: uuid.UUID, hashed_password: str | None) -> str:
    now = utc_now()
    payload = {
        "sub": str(user_id),
        # Ties the session to the current password: changing it ends every session.
        "pwd": password_fingerprint(hashed_password),
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


class InvalidTokenError(Exception):
    pass


# Reset tokens carry this audience. decode_access_token() passes no audience,
# and PyJWT rejects a token with an unexpected "aud", so a reset link can never
# be used as a login session.
RESET_AUDIENCE = "password-reset"


def create_password_reset_token(user_id: uuid.UUID, hashed_password: str | None) -> str:
    now = utc_now()
    payload = {
        "sub": str(user_id),
        "aud": RESET_AUDIENCE,
        "pwd": password_fingerprint(hashed_password),
        "iat": now,
        "exp": now + timedelta(minutes=settings.password_reset_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def decode_password_reset_token(token: str) -> tuple[uuid.UUID, str]:
    """Return (user id, password fingerprint), or raise InvalidTokenError."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[JWT_ALGORITHM],
            audience=RESET_AUDIENCE,
            options={"require": ["sub", "aud", "pwd", "exp", "iat"]},
        )
        return uuid.UUID(payload["sub"]), str(payload["pwd"])
    except (jwt.PyJWTError, ValueError) as exc:
        raise InvalidTokenError from exc


def decode_access_token(token: str) -> tuple[uuid.UUID, str]:
    """Return (user id, password fingerprint) from a valid token, or raise InvalidTokenError."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            # Pinning the algorithm blocks "alg: none" and algorithm-swap attacks.
            algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "pwd", "exp", "iat"]},
        )
        return uuid.UUID(payload["sub"]), str(payload["pwd"])
    except (jwt.PyJWTError, ValueError) as exc:
        raise InvalidTokenError from exc
