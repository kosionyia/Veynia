from datetime import timedelta
from urllib.parse import parse_qs, urlparse

import jwt
import pytest
from sqlmodel import select

from app.auth.dependencies import PASSWORD_CHANGED_DETAIL
from app.auth.models import User
from app.auth.router import FORGOT_PASSWORD_REPLY, FORGOT_PER_EMAIL, LOGIN_FAILURES_PER_EMAIL
from app.core import email
from app.core.config import settings
from app.core.security import JWT_ALGORITHM, RESET_AUDIENCE, password_fingerprint
from app.core.time import utc_now
from tests.auth.test_auth import PASSWORD, bearer, login, register
from tests.auth.test_rate_limit import login_from

NEW_PASSWORD = "Fresh!pw2"


@pytest.fixture
def outbox(monkeypatch) -> list[dict[str, str]]:
    """Emails the app tried to send, instead of sending them."""
    sent: list[dict[str, str]] = []
    monkeypatch.setattr(
        email, "send_email", lambda to, subject, body: sent.append({"to": to, "body": body})
    )
    return sent


def forgot(client, address="ada@example.com"):
    return client.post("/auth/forgot-password", json={"email": address})


def reset(client, token, password=NEW_PASSWORD):
    return client.post("/auth/reset-password", json={"token": token, "password": password})


def token_from(message: dict[str, str]) -> str:
    link = next(line for line in message["body"].splitlines() if "/reset-password?" in line)
    return parse_qs(urlparse(link).query)["token"][0]


# --- forgot password --------------------------------------------------------

def test_forgot_password_emails_a_link(client, outbox):
    register(client)
    r = forgot(client, "Ada@Example.com")
    assert r.status_code == 202
    assert r.json() == FORGOT_PASSWORD_REPLY
    assert [m["to"] for m in outbox] == ["ada@example.com"]
    assert f"{settings.frontend_url}/reset-password?token=" in outbox[0]["body"]


def test_forgot_password_unknown_email_looks_the_same(client, outbox):
    r = forgot(client, "nobody@example.com")
    assert r.status_code == 202
    assert r.json() == FORGOT_PASSWORD_REPLY
    assert outbox == []


def test_forgot_password_limits_emails_per_address(client, outbox):
    register(client)
    for _ in range(FORGOT_PER_EMAIL.amount):
        assert forgot(client).status_code == 202
    assert forgot(client).status_code == 429
    assert len(outbox) == FORGOT_PER_EMAIL.amount


# --- reset password ---------------------------------------------------------

def test_reset_sets_new_password(client, outbox):
    register(client)
    forgot(client)
    assert reset(client, token_from(outbox[0])).status_code == 204
    assert login(client, password=PASSWORD).status_code == 401
    assert login(client, password=NEW_PASSWORD).status_code == 200


def test_reset_link_works_only_once(client, outbox):
    register(client)
    forgot(client)
    token = token_from(outbox[0])
    assert reset(client, token).status_code == 204
    r = reset(client, token, password="Another!pw3")
    assert r.status_code == 400
    assert "invalid or has expired" in r.json()["detail"]


def test_older_links_die_when_password_changes(client, outbox):
    register(client)
    forgot(client)
    forgot(client)
    first, second = token_from(outbox[0]), token_from(outbox[1])
    assert reset(client, second).status_code == 204
    assert reset(client, first, password="Another!pw3").status_code == 400


def test_expired_reset_link_is_rejected(client, session):
    register(client)
    user = session.exec(select(User)).one()
    past = utc_now() - timedelta(hours=1)
    token = jwt.encode(
        {
            "sub": str(user.id),
            "aud": RESET_AUDIENCE,
            "pwd": password_fingerprint(user.hashed_password),
            "iat": past - timedelta(minutes=30),
            "exp": past,
        },
        settings.jwt_secret,
        algorithm=JWT_ALGORITHM,
    )
    assert reset(client, token).status_code == 400


def test_reset_token_is_not_a_session(client, outbox):
    register(client)
    forgot(client)
    assert client.get("/auth/me", headers=bearer(token_from(outbox[0]))).status_code == 401


def test_session_token_is_not_a_reset_token(client):
    register(client)
    access_token = login(client).json()["access_token"]
    assert reset(client, access_token).status_code == 400


def test_reset_rejects_weak_password(client, outbox):
    register(client)
    forgot(client)
    assert reset(client, token_from(outbox[0]), password="weak").status_code == 422


def test_google_only_account_can_set_a_password(client, session, outbox):
    session.add(User(full_name="Grace Hopper", email="grace@example.com", google_sub="g-123"))
    session.commit()
    forgot(client, "grace@example.com")
    assert reset(client, token_from(outbox[0])).status_code == 204
    assert login(client, email="grace@example.com", password=NEW_PASSWORD).status_code == 200


def test_reset_lifts_login_lockout(client, outbox):
    register(client)
    for i in range(LOGIN_FAILURES_PER_EMAIL.amount):
        login_from(client, f"10.0.0.{i}")
    assert login_from(client, "10.0.0.99", password=PASSWORD).status_code == 429
    forgot(client)
    reset(client, token_from(outbox[0]))
    assert login_from(client, "10.0.0.98", password=NEW_PASSWORD).status_code == 200


# --- signed-in sessions -----------------------------------------------------

def test_reset_signs_out_existing_sessions(client, outbox):
    register(client)
    old_session = login(client).json()["access_token"]
    assert client.get("/auth/me", headers=bearer(old_session)).status_code == 200

    forgot(client)
    reset(client, token_from(outbox[0]))

    r = client.get("/auth/me", headers=bearer(old_session))
    assert r.status_code == 401
    assert r.json() == {"detail": PASSWORD_CHANGED_DETAIL}
    new_session = login(client, password=NEW_PASSWORD).json()["access_token"]
    assert client.get("/auth/me", headers=bearer(new_session)).status_code == 200


def test_google_session_ends_when_a_password_is_set(client, session, outbox, google):
    google(email="grace@example.com")
    google_session = client.post("/auth/google", json={"credential": "ok"}).json()["access_token"]
    forgot(client, "grace@example.com")
    reset(client, token_from(outbox[0]))
    assert client.get("/auth/me", headers=bearer(google_session)).status_code == 401
