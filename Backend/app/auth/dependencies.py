import hmac
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.auth.models import User
from app.core.db import SessionDep
from app.core.security import InvalidTokenError, decode_access_token, password_fingerprint

# tokenUrl powers Swagger's "Authorize" button; the username field takes the email.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)
# Its own message, so the frontend can say why the user was signed out.
PASSWORD_CHANGED_DETAIL = "Password changed"
_PASSWORD_CHANGED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail=PASSWORD_CHANGED_DETAIL,
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)], session: SessionDep
) -> User:
    try:
        user_id, fingerprint = decode_access_token(token)
    except InvalidTokenError:
        raise _UNAUTHORIZED
    # A valid token for a deleted user is still rejected.
    user = session.get(User, user_id)
    if user is None:
        raise _UNAUTHORIZED
    # Signed in before the password last changed: that session is over.
    if not hmac.compare_digest(fingerprint, password_fingerprint(user.hashed_password)):
        raise _PASSWORD_CHANGED
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
