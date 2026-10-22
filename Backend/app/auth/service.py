import hmac
from dataclasses import dataclass

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.auth.models import User
from app.auth.schemas import MeOut, ProfileUpdate, RegisterIn
from app.core.config import settings
from app.core.security import (
    InvalidTokenError,
    burn_password_check,
    decode_password_reset_token,
    hash_password,
    password_fingerprint,
    verify_password,
)


class EmailAlreadyRegistered(Exception):
    pass


class GoogleLoginError(Exception):
    pass


class GoogleNotConfigured(Exception):
    pass


def get_user_by_email(session: Session, email: str) -> User | None:
    return session.exec(select(User).where(User.email == email.lower())).first()


def register(session: Session, data: RegisterIn) -> User:
    if get_user_by_email(session, data.email):
        raise EmailAlreadyRegistered
    user = User(
        full_name=data.full_name,
        email=data.email,
        hashed_password=hash_password(data.password),
    )
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        # Two registrations for the same email at once: the unique index wins.
        session.rollback()
        raise EmailAlreadyRegistered
    session.refresh(user)
    return user


def authenticate(session: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(session, email)
    if user is None or user.hashed_password is None:
        # Unknown email, or a Google-only account: same answer, same timing.
        burn_password_check(password)
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


@dataclass(frozen=True)
class GoogleIdentity:
    sub: str
    email: str
    email_verified: bool
    name: str


def verify_google_credential(credential: str) -> GoogleIdentity:
    """Check the ID token's signature, audience, issuer and expiry with Google's keys."""
    if not settings.google_client_id:
        raise GoogleNotConfigured
    try:
        claims = id_token.verify_oauth2_token(
            credential, google_requests.Request(), audience=settings.google_client_id
        )
    except ValueError as exc:
        raise GoogleLoginError("Invalid Google credential") from exc
    return GoogleIdentity(
        sub=claims["sub"],
        email=claims["email"].lower(),
        email_verified=bool(claims.get("email_verified")),
        name=claims.get("name") or claims["email"].split("@")[0],
    )


def login_with_google(session: Session, identity: GoogleIdentity) -> User:
    # 1. Returning Google user: match on the permanent id, not the email.
    user = session.exec(select(User).where(User.google_sub == identity.sub)).first()
    if user:
        return user

    # 2. Existing password account with the same email: link it, but only if
    #    Google vouches that this person owns the address.
    user = get_user_by_email(session, identity.email)
    if user:
        if not identity.email_verified or user.google_sub is not None:
            raise GoogleLoginError("This email is linked to a different sign-in method")
        user.google_sub = identity.sub
        # Registering never proved anyone owned this email; Google just did. Drop
        # the password so whoever set it (maybe an attacker who pre-registered the
        # address) loses access. Changing it also ends their sessions. The owner
        # can set a password again with "Forgot password".
        user.hashed_password = None
    else:
        # 3. New user, Google-only (no password).
        if not identity.email_verified:
            raise GoogleLoginError("Google email is not verified")
        user = User(full_name=identity.name[:100], email=identity.email, google_sub=identity.sub)

    session.add(user)
    session.commit()
    session.refresh(user)
    return user


class InvalidResetToken(Exception):
    pass


def reset_password(session: Session, token: str, new_password: str) -> User:
    """Set a new password from an emailed reset token. Works for Google-only
    accounts too: the link proves they own the address."""
    try:
        user_id, fingerprint = decode_password_reset_token(token)
    except InvalidTokenError as exc:
        raise InvalidResetToken from exc
    user = session.get(User, user_id)
    # A used token (or one issued before a later password change) no longer
    # matches the stored hash.
    if user is None or not hmac.compare_digest(
        fingerprint, password_fingerprint(user.hashed_password)
    ):
        raise InvalidResetToken
    user.hashed_password = hash_password(new_password)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


class WrongPassword(Exception):
    pass


class NoPassword(Exception):
    """Google-only account: there's no current password to check."""


class SamePassword(Exception):
    pass


def me(user: User) -> MeOut:
    return MeOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        has_password=user.hashed_password is not None,
        google_linked=user.google_sub is not None,
        created_at=user.created_at,
    )


def update_profile(session: Session, user: User, data: ProfileUpdate) -> User:
    user.full_name = data.full_name
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def change_password(session: Session, user: User, current: str, new: str) -> User:
    """Changing it also changes the password fingerprint in every token, so all
    older sessions (other devices included) stop working."""
    if user.hashed_password is None:
        raise NoPassword
    if not verify_password(current, user.hashed_password):
        raise WrongPassword
    if verify_password(new, user.hashed_password):
        raise SamePassword
    user.hashed_password = hash_password(new)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def delete_account(session: Session, user: User, password: str | None, email: str | None) -> None:
    """Confirmed with the password, or the email for Google-only accounts.
    Everything the user owns goes with them (ON DELETE CASCADE)."""
    if user.hashed_password is not None:
        if not password or not verify_password(password, user.hashed_password):
            raise WrongPassword
    elif not email or not hmac.compare_digest(email.strip().lower(), user.email):
        raise WrongPassword
    session.delete(user)
    session.commit()
