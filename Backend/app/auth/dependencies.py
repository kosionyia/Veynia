from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.auth.models import User
from app.core.db import SessionDep
from app.core.security import InvalidTokenError, decode_access_token

# tokenUrl powers Swagger's "Authorize" button; the username field takes the email.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)], session: SessionDep
) -> User:
    try:
        user_id = decode_access_token(token)
    except InvalidTokenError:
        raise _UNAUTHORIZED
    # A valid token for a deleted user is still rejected.
    user = session.get(User, user_id)
    if user is None:
        raise _UNAUTHORIZED
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
