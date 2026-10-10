from app.auth.router import LOGIN_FAILURES_PER_EMAIL, LOGIN_PER_IP
from app.core.config import settings
from tests.auth.test_auth import PASSWORD, google_login, login, register


def from_browser(ip: str, secret: str | None = None) -> dict[str, str]:
    """Headers Next.js sends when forwarding a browser's request."""
    return {"X-Client-IP": ip, "X-Internal-Secret": secret or settings.internal_api_secret}


def login_from(client, ip: str, email="ada@example.com", password="Wrong!pw1", secret=None):
    return client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers=from_browser(ip, secret),
    )


# Read from the router, so changing a limit there doesn't break these tests.
IP_PER_MINUTE = LOGIN_PER_IP[0].amount
EMAIL_FAILURES = LOGIN_FAILURES_PER_EMAIL.amount


# --- login: per IP ----------------------------------------------------------

def test_login_blocks_ip_after_too_many_attempts_a_minute(client):
    for i in range(IP_PER_MINUTE):
        assert login(client, email=f"user{i}@example.com").status_code == 401
    r = login(client, email="one-more@example.com")
    assert r.status_code == 429
    assert r.json() == {"detail": "Too many attempts. Try again later."}
    assert 0 < int(r.headers["retry-after"]) <= 60


def test_login_ip_limit_is_per_client_ip(client):
    for i in range(IP_PER_MINUTE):
        login_from(client, "1.1.1.1", email=f"user{i}@example.com")
    assert login_from(client, "1.1.1.1", email="x@example.com").status_code == 429
    assert login_from(client, "2.2.2.2", email="x@example.com").status_code == 401


def test_client_ip_header_ignored_without_secret(client):
    # A direct caller can't dodge the IP limit by inventing a new IP each time.
    for i in range(IP_PER_MINUTE):
        login_from(client, f"10.0.0.{i}", email=f"user{i}@example.com", secret="wrong")
    assert login_from(client, "10.0.0.99", email="x@example.com", secret="wrong").status_code == 429


# --- login: per email -------------------------------------------------------

def test_login_locks_email_after_too_many_failures_from_any_ip(client):
    register(client)
    for i in range(EMAIL_FAILURES):
        assert login_from(client, f"10.0.0.{i}").status_code == 401
    # Right password, fresh IP: still locked, so a botnet can't keep guessing.
    r = login_from(client, "10.0.0.99", password=PASSWORD)
    assert r.status_code == 429
    assert "retry-after" in r.headers


def test_email_lockout_ignores_case(client):
    for i in range(EMAIL_FAILURES):
        login_from(client, f"10.0.0.{i}", email="Ada@Example.com")
    assert login_from(client, "10.0.0.99", email="ada@example.com").status_code == 429


def test_unknown_email_locks_like_known_email(client):
    # Same behaviour either way, so lockouts don't reveal who has an account.
    for i in range(EMAIL_FAILURES):
        login_from(client, f"10.0.0.{i}", email="nobody@example.com")
    assert login_from(client, "10.0.0.99", email="nobody@example.com").status_code == 429


def test_successful_login_resets_email_failures(client):
    register(client)
    # One short of the lockout, then a success, then the full allowance again.
    for i in range(EMAIL_FAILURES - 1):
        login_from(client, f"10.0.0.{i}")
    assert login_from(client, "10.0.1.1", password=PASSWORD).status_code == 200
    for i in range(EMAIL_FAILURES - 1):
        assert login_from(client, f"10.0.2.{i}").status_code == 401


# --- register and Google ----------------------------------------------------

def test_register_blocks_ip_after_5_an_hour(client):
    for i in range(5):
        assert register(client, email=f"user{i}@example.com").status_code == 201
    assert register(client, email="user5@example.com").status_code == 429


def test_google_blocks_ip_after_10_a_minute(client, google):
    google()
    for _ in range(10):
        assert google_login(client).status_code == 200
    assert google_login(client).status_code == 429
