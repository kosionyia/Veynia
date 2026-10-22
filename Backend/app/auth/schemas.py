import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    EmailStr,
    StringConstraints,
)

# bcrypt only reads the first 72 bytes of a password, and recent versions
# reject longer input, so the limit is in bytes, not characters.
BCRYPT_MAX_BYTES = 72


def _lowercase(email: str) -> str:
    return email.lower()


def _check_password(password: str) -> str:
    problems = []
    if len(password) < 8:
        problems.append("at least 8 characters")
    if not any(c.islower() for c in password):
        problems.append("a lowercase letter")
    if not any(c.isupper() for c in password):
        problems.append("an uppercase letter")
    if not any(not c.isalnum() and not c.isspace() for c in password):
        problems.append("a symbol")
    if problems:
        raise ValueError("Password must contain " + ", ".join(problems))
    if len(password.encode()) > BCRYPT_MAX_BYTES:
        raise ValueError(f"Password must be at most {BCRYPT_MAX_BYTES} bytes")
    return password


Email = Annotated[EmailStr, AfterValidator(_lowercase)]
FullName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]
Password = Annotated[str, AfterValidator(_check_password)]


class RegisterIn(BaseModel):
    full_name: FullName
    email: Email
    password: Password


class UserOut(BaseModel):
    # Lets FastAPI build this from a User row. Has no password field, so it can never leak.
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str


class MeOut(UserOut):
    """The signed-in user, for the settings page."""

    has_password: bool
    google_linked: bool
    created_at: datetime


class ProfileUpdate(BaseModel):
    # Only the name for now: changing the email needs a confirmation email first.
    full_name: FullName


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: Password


class DeleteAccountIn(BaseModel):
    """The password, or for Google-only accounts (no password) the email."""

    password: str | None = None
    email: str | None = None


class GoogleLoginIn(BaseModel):
    # The ID token (JWT) Google Identity Services hands the browser.
    credential: str


class TokenOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user_id: uuid.UUID


class ForgotPasswordIn(BaseModel):
    email: Email


class ResetPasswordIn(BaseModel):
    # From the emailed link.
    token: str
    password: Password
