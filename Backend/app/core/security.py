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


def create_access_token(user_id: uuid.UUID) -> str:
    now = utc_now()
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


class InvalidTokenError(Exception):
    pass


def decode_access_token(token: str) -> uuid.UUID:
    """Return the user id in a valid token, or raise InvalidTokenError."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            # Pinning the algorithm blocks "alg: none" and algorithm-swap attacks.
            algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "exp", "iat"]},
        )
        return uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, ValueError) as exc:
        raise InvalidTokenError from exc
