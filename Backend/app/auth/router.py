from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from limits import RateLimitItem, parse

from app.auth import service
from app.auth.dependencies import CurrentUser
from app.auth.schemas import (
    ForgotPasswordIn,
    GoogleLoginIn,
    RegisterIn,
    ResetPasswordIn,
    TokenOut,
    UserOut,
)
from app.core import email, rate_limit
from app.core.db import SessionDep
from app.core.security import create_access_token, create_password_reset_token

router = APIRouter(prefix="/auth", tags=["auth"])

# Per IP: slows one machine guessing passwords or spraying many accounts.
LOGIN_PER_IP = [parse("5/minute"), parse("100/hour")]
# Per email, failures only: protects one account even from many IPs.
# Trade-off: an attacker can lock a user's password login for up to 15 minutes.
LOGIN_FAILURES_PER_EMAIL = parse("5 per 15 minutes")
REGISTER_PER_IP = [parse("5/hour")]
GOOGLE_PER_IP = [parse("10/minute"), parse("100/hour")]
FORGOT_PER_IP = [parse("5/hour")]
# Stops anyone flooding one inbox with reset emails.
FORGOT_PER_EMAIL = parse("3/hour")
RESET_PER_IP = [parse("10/hour")]

FORGOT_PASSWORD_REPLY = {"detail": "If that email has an account, we've sent a reset link."}


def _limit_ip(request: Request, scope: str, limits: list[RateLimitItem]) -> None:
    ip = rate_limit.client_ip(request)
    for limit in limits:
        rate_limit.hit(limit, scope, ip)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, request: Request, session: SessionDep):
    _limit_ip(request, "register", REGISTER_PER_IP)
    try:
        return service.register(session, data)
    except service.EmailAlreadyRegistered:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")


@router.post("/login", response_model=TokenOut)
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    request: Request,
    session: SessionDep,
):
    # OAuth2 form field is called "username"; it carries the email.
    email = form.username.lower()
    _limit_ip(request, "login", LOGIN_PER_IP)
    # Checked before bcrypt runs, so a locked account costs no CPU.
    rate_limit.check(LOGIN_FAILURES_PER_EMAIL, "login-email", email)

    user = service.authenticate(session, email, form.password)
    if user is None:
        rate_limit.record(LOGIN_FAILURES_PER_EMAIL, "login-email", email)
        # One message for unknown email and wrong password: no account enumeration.
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    rate_limit.clear(LOGIN_FAILURES_PER_EMAIL, "login-email", email)
    return TokenOut(access_token=create_access_token(user.id, user.hashed_password), user_id=user.id)


@router.post("/google", response_model=TokenOut)
def google_login(data: GoogleLoginIn, request: Request, session: SessionDep):
    _limit_ip(request, "google", GOOGLE_PER_IP)
    try:
        identity = service.verify_google_credential(data.credential)
        user = service.login_with_google(session, identity)
    except service.GoogleNotConfigured:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Google sign-in is not configured")
    except service.GoogleLoginError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc))
    return TokenOut(access_token=create_access_token(user.id, user.hashed_password), user_id=user.id)


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
def forgot_password(
    data: ForgotPasswordIn, request: Request, session: SessionDep, background: BackgroundTasks
):
    _limit_ip(request, "forgot", FORGOT_PER_IP)
    rate_limit.hit(FORGOT_PER_EMAIL, "forgot-email", data.email)
    user = service.get_user_by_email(session, data.email)
    if user:
        token = create_password_reset_token(user.id, user.hashed_password)
        # Sent after the response, so a slow mail server doesn't make known
        # emails answer slower than unknown ones.
        background.add_task(email.send_password_reset, user.email, user.full_name, token)
    # Same reply either way: this endpoint must not reveal who has an account.
    return FORGOT_PASSWORD_REPLY


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(data: ResetPasswordIn, request: Request, session: SessionDep):
    _limit_ip(request, "reset", RESET_PER_IP)
    try:
        user = service.reset_password(session, data.token, data.password)
    except service.InvalidResetToken:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This reset link is invalid or has expired. Request a new one.",
        )
    # They've proven they own the email, so lift any failed-login lockout.
    rate_limit.clear(LOGIN_FAILURES_PER_EMAIL, "login-email", user.email)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user
