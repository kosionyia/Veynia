import uuid
from datetime import timedelta

import jwt
import pytest
from sqlmodel import select

from app.auth.models import User
from app.core.config import settings
from app.core.security import password_fingerprint
from app.core.time import utc_now

PASSWORD = "Secret!pw1"


def register(client, email="ada@example.com", password=PASSWORD, full_name="Ada Lovelace"):
    return client.post(
        "/auth/register",
        json={"full_name": full_name, "email": email, "password": password},
    )


def login(client, email="ada@example.com", password=PASSWORD):
    # OAuth2 password form: form-encoded, email goes in "username".
    return client.post("/auth/login", data={"username": email, "password": password})


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# --- register ---------------------------------------------------------------

def test_register_returns_user_without_password(client):
    r = register(client, email="Ada@Example.COM")
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "ada@example.com"  # lowercased
    assert body["full_name"] == "Ada Lovelace"
    assert set(body) == {"id", "full_name", "email"}


def test_register_stores_bcrypt_hash(client, session):
    register(client)
    user = session.exec(select(User)).one()
    assert user.hashed_password.startswith("$2b$12$")
    assert PASSWORD not in user.hashed_password


def test_register_duplicate_email_is_case_insensitive(client):
    register(client, email="ada@example.com")
    r = register(client, email="ADA@example.com")
    assert r.status_code == 409
    assert r.json()["detail"] == "Email already registered"


@pytest.mark.parametrize(
    "password",
    ["Ab!c", "secret!pw1", "SECRET!PW1", "SecretPw1", "Aa!" + "x" * 70],
    ids=["short", "no-upper", "no-lower", "no-symbol", "over-72-bytes"],
)
def test_register_rejects_weak_password(client, password):
    assert register(client, password=password).status_code == 422


def test_register_rejects_invalid_email(client):
    assert register(client, email="not-an-email").status_code == 422


# --- login ------------------------------------------------------------------

def test_login_returns_hs512_token(client):
    user_id = register(client).json()["id"]
    r = login(client, email="ADA@example.com")  # any case works
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["user_id"] == user_id
    assert jwt.get_unverified_header(body["access_token"])["alg"] == "HS512"


def test_login_wrong_password_and_unknown_email_look_identical(client):
    register(client)
    wrong_pw = login(client, password="Wrong!pw1")
    unknown = login(client, email="nobody@example.com")
    assert wrong_pw.status_code == unknown.status_code == 401
    assert wrong_pw.json() == unknown.json() == {"detail": "Invalid email or password"}


def test_google_only_account_cannot_password_login(client, session):
    session.add(User(full_name="G", email="g@example.com", google_sub="google-123"))
    session.commit()
    assert login(client, email="g@example.com").status_code == 401


# --- /auth/me ---------------------------------------------------------------

def test_me_with_token(client):
    register(client)
    token = login(client).json()["access_token"]
    r = client.get("/auth/me", headers=bearer(token))
    assert r.status_code == 200
    assert r.json()["email"] == "ada@example.com"


def test_me_without_token(client):
    r = client.get("/auth/me")
    assert r.status_code == 401
    assert r.headers["www-authenticate"] == "Bearer"


def _token(
    user: User | None = None, *, minutes: int = 60, secret: str | None = None, alg: str = "HS512"
) -> str:
    """A session token that's valid in every way except the one each test changes."""
    now = utc_now()
    payload = {
        "sub": str(user.id if user else uuid.uuid4()),
        "pwd": password_fingerprint(user.hashed_password if user else None),
        "iat": now,
        "exp": now + timedelta(minutes=minutes),
    }
    return jwt.encode(payload, secret or settings.jwt_secret, algorithm=alg)


def _registered_user(client, session) -> User:
    register(client)
    return session.exec(select(User)).one()


def test_me_accepts_well_formed_token(client, session):
    # Guards the helper: the rejections below must come from the one change.
    user = _registered_user(client, session)
    assert client.get("/auth/me", headers=bearer(_token(user))).status_code == 200


def test_me_rejects_expired_token(client, session):
    user = _registered_user(client, session)
    assert client.get("/auth/me", headers=bearer(_token(user, minutes=-1))).status_code == 401


def test_me_rejects_token_signed_with_other_secret(client, session):
    user = _registered_user(client, session)
    forged = _token(user, secret="x" * 64)
    assert client.get("/auth/me", headers=bearer(forged)).status_code == 401


def test_me_rejects_other_algorithm(client, session):
    user = _registered_user(client, session)
    hs256 = _token(user, alg="HS256")
    assert client.get("/auth/me", headers=bearer(hs256)).status_code == 401


def test_me_rejects_token_for_deleted_user(client):
    assert client.get("/auth/me", headers=bearer(_token())).status_code == 401


def test_me_rejects_token_without_password_fingerprint(client, session):
    user = _registered_user(client, session)
    now = utc_now()
    old_style = jwt.encode(
        {"sub": str(user.id), "iat": now, "exp": now + timedelta(minutes=60)},
        settings.jwt_secret,
        algorithm="HS512",
    )
    assert client.get("/auth/me", headers=bearer(old_style)).status_code == 401


# --- Google (the `google` fixture is in conftest.py) -----------------------

def google_login(client, credential="ok"):
    return client.post("/auth/google", json={"credential": credential})


def test_google_creates_new_user(client, session, google):
    google()
    r = google_login(client)
    assert r.status_code == 200
    user = session.exec(select(User)).one()
    assert user.google_sub == "google-123"
    assert user.hashed_password is None


def test_google_returning_user_matches_on_sub_not_email(client, session, google):
    google()
    first = google_login(client).json()["user_id"]
    google(email="new-address@example.com")  # user changed their Google email
    assert google_login(client).json()["user_id"] == first
    assert len(session.exec(select(User)).all()) == 1


def test_google_links_existing_password_account(client, session, google):
    user_id = register(client).json()["id"]
    google()
    assert google_login(client).json()["user_id"] == user_id
    user = session.exec(select(User)).one()
    assert user.google_sub == "google-123"


def test_google_link_removes_unproven_password(client, session, google):
    # Pre-hijack: someone registers the victim's email with their own password,
    # then the victim signs in with Google and starts using the account.
    register(client, password="Attacker!pw1")
    attacker_session = login(client, password="Attacker!pw1").json()["access_token"]
    google()
    assert google_login(client).status_code == 200

    assert session.exec(select(User)).one().hashed_password is None
    assert login(client, password="Attacker!pw1").status_code == 401
    assert client.get("/auth/me", headers=bearer(attacker_session)).status_code == 401


def test_google_unverified_email_does_not_link(client, google):
    register(client)
    google(email_verified=False)
    assert google_login(client).status_code == 401


def test_google_invalid_credential(client, google):
    google()
    assert google_login(client, credential="bad").status_code == 401


def test_google_not_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", None)
    assert google_login(client).status_code == 503
