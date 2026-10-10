import pytest

from app.auth import service
from app.core.config import settings


@pytest.fixture
def google(monkeypatch):
    """Replace Google's network verification with a canned identity."""
    monkeypatch.setattr(settings, "google_client_id", "test-client-id")
    identity = {"value": None}

    def fake_verify(credential: str) -> service.GoogleIdentity:
        if settings.google_client_id is None:
            raise service.GoogleNotConfigured
        if credential == "bad":
            raise service.GoogleLoginError("Invalid Google credential")
        return identity["value"]

    monkeypatch.setattr(service, "verify_google_credential", fake_verify)

    def set_identity(**kw):
        identity["value"] = service.GoogleIdentity(
            **{"sub": "google-123", "email": "ada@example.com", "email_verified": True,
               "name": "Ada Lovelace", **kw}
        )

    return set_identity
