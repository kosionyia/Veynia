"""Settings page endpoints: profile, change password, delete account."""

from sqlmodel import select

from app.analysis.models import Analysis
from app.auth.models import User
from app.cvs.models import CV
from app.jobs.models import Job
from tests.auth.test_auth import PASSWORD, bearer, login, register

NEW_PASSWORD = "Fresh!pw2"


def signed_in(client) -> dict[str, str]:
    register(client)
    return bearer(login(client).json()["access_token"])


def google_only(session) -> User:
    user = User(full_name="Grace Hopper", email="grace@example.com", google_sub="google-9")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def google_headers(client, session, google) -> dict[str, str]:
    google(sub="google-9", email="grace@example.com", name="Grace Hopper")
    google_only(session)
    return bearer(client.post("/auth/google", json={"credential": "ok"}).json()["access_token"])


# --- GET /auth/me -------------------------------------------------------------

def test_me_says_how_the_user_signs_in(client):
    body = client.get("/auth/me", headers=signed_in(client)).json()
    assert body["has_password"] is True
    assert body["google_linked"] is False
    assert body["created_at"]


def test_me_for_google_only_account(client, session, google):
    body = client.get("/auth/me", headers=google_headers(client, session, google)).json()
    assert body["has_password"] is False
    assert body["google_linked"] is True


# --- PATCH /auth/me -----------------------------------------------------------

def test_update_name(client, session):
    headers = signed_in(client)
    r = client.patch("/auth/me", json={"full_name": "  Ada King  "}, headers=headers)
    assert r.status_code == 200
    assert r.json()["full_name"] == "Ada King"  # trimmed
    assert session.exec(select(User)).one().full_name == "Ada King"


def test_update_name_rejects_blank(client):
    assert client.patch("/auth/me", json={"full_name": "   "}, headers=signed_in(client)).status_code == 422


def test_update_cannot_change_email(client, session):
    headers = signed_in(client)
    client.patch("/auth/me", json={"full_name": "Ada", "email": "evil@example.com"}, headers=headers)
    assert session.exec(select(User)).one().email == "ada@example.com"


def test_update_needs_sign_in(client):
    assert client.patch("/auth/me", json={"full_name": "Ada"}).status_code == 401


# --- POST /auth/change-password ------------------------------------------------

def change(client, headers, current=PASSWORD, new=NEW_PASSWORD):
    return client.post("/auth/change-password", json={"current_password": current, "new_password": new}, headers=headers)


def test_change_password_returns_a_working_token_and_ends_old_sessions(client):
    old = signed_in(client)
    r = change(client, old)
    assert r.status_code == 200
    fresh = bearer(r.json()["access_token"])
    assert client.get("/auth/me", headers=fresh).status_code == 200
    # The old session (and any other device) is signed out.
    assert client.get("/auth/me", headers=old).status_code == 401
    assert login(client, password=NEW_PASSWORD).status_code == 200
    assert login(client, password=PASSWORD).status_code == 401


def test_change_password_wrong_current(client):
    headers = signed_in(client)
    r = change(client, headers, current="Wrong!pw1")
    assert r.status_code == 400
    assert r.json()["detail"] == "Your current password is wrong."
    assert login(client).status_code == 200  # unchanged


def test_change_password_checks_the_new_one(client):
    assert change(client, signed_in(client), new="weak").status_code == 422


def test_change_password_must_differ(client):
    r = change(client, signed_in(client), new=PASSWORD)
    assert r.status_code == 400


def test_change_password_limits_wrong_guesses(client):
    # A stolen session shouldn't be able to guess the current password forever.
    headers = signed_in(client)
    codes = [change(client, headers, current=f"Wrong!pw{i}").status_code for i in range(6)]
    assert codes[:5] == [400] * 5
    assert codes[5] == 429


def test_google_only_account_cannot_change_password_here(client, session, google):
    # They set one through the emailed reset link, which proves they own the address.
    r = change(client, google_headers(client, session, google), current="")
    assert r.status_code == 400
    assert "reset link" in r.json()["detail"]


# --- DELETE /auth/me -----------------------------------------------------------

def test_delete_account_needs_the_password(client, session):
    headers = signed_in(client)
    r = client.request("DELETE", "/auth/me", json={"password": "Wrong!pw1"}, headers=headers)
    assert r.status_code == 400
    assert session.exec(select(User)).first() is not None


def test_delete_account_removes_everything(client, session):
    headers = signed_in(client)
    user = session.exec(select(User)).one()
    cv = CV(user_id=user.id, name="cv", filename="cv.pdf", file_type="pdf", file_size=1, char_count=1, text="x")
    job = Job(user_id=user.id, source="pasted", text="x", char_count=1)
    session.add_all([cv, job])
    session.commit()
    session.add(Analysis(user_id=user.id, cv_id=cv.id, job_id=job.id))
    session.commit()

    r = client.request("DELETE", "/auth/me", json={"password": PASSWORD}, headers=headers)
    assert r.status_code == 204
    session.expire_all()
    assert session.exec(select(User)).first() is None
    assert session.exec(select(CV)).first() is None
    assert session.exec(select(Analysis)).first() is None
    assert client.get("/auth/me", headers=headers).status_code == 401


def test_delete_google_only_account_confirms_with_email(client, session, google):
    headers = google_headers(client, session, google)
    wrong = client.request("DELETE", "/auth/me", json={"email": "other@example.com"}, headers=headers)
    assert wrong.status_code == 400
    r = client.request("DELETE", "/auth/me", json={"email": "Grace@Example.com"}, headers=headers)
    assert r.status_code == 204
    assert session.exec(select(User)).first() is None
