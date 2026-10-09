from dataclasses import dataclass

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.auth.models import User
from app.auth.schemas import RegisterIn
from app.core.config import settings
from app.core.security import burn_password_check, hash_password, verify_password


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
    else:
        # 3. New user, Google-only (no password).
        if not identity.email_verified:
            raise GoogleLoginError("Google email is not verified")
        user = User(full_name=identity.name[:100], email=identity.email, google_sub=identity.sub)

    session.add(user)
    session.commit()
    session.refresh(user)
    return user
