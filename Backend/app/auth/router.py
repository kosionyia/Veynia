from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.auth import service
from app.auth.dependencies import CurrentUser
from app.auth.schemas import GoogleLoginIn, RegisterIn, TokenOut, UserOut
from app.core.db import SessionDep
from app.core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, session: SessionDep):
    try:
        return service.register(session, data)
    except service.EmailAlreadyRegistered:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")


@router.post("/login", response_model=TokenOut)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], session: SessionDep):
    # OAuth2 form field is called "username"; it carries the email.
    user = service.authenticate(session, form.username, form.password)
    if user is None:
        # One message for unknown email and wrong password: no account enumeration.
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenOut(access_token=create_access_token(user.id), user_id=user.id)


@router.post("/google", response_model=TokenOut)
def google_login(data: GoogleLoginIn, session: SessionDep):
    try:
        identity = service.verify_google_credential(data.credential)
        user = service.login_with_google(session, identity)
    except service.GoogleNotConfigured:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Google sign-in is not configured")
    except service.GoogleLoginError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc))
    return TokenOut(access_token=create_access_token(user.id), user_id=user.id)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user
