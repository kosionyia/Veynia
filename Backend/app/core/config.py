from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    jwt_secret: str
    jwt_expire_minutes: int = 60
    # OAuth client ID from Google Cloud Console. Unset = Google sign-in disabled.
    google_client_id: str | None = None
    # Shared with Next.js; proves the X-Client-IP header came from our own server.
    internal_api_secret: str
    rate_limit_storage_url: str = "memory://"
    # Where emailed links (password reset) point.
    frontend_url: str = "http://localhost:3000"
    password_reset_expire_minutes: int = 30
    # Unset = emails are printed to the console instead of sent (dev).
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    email_from: str = "ResumeRadar <no-reply@resumeradar.local>"

    @field_validator("internal_api_secret")
    @classmethod
    def internal_secret_long_enough(cls, value: str) -> str:
        if len(value.encode()) < 32:
            raise ValueError("INTERNAL_API_SECRET must be at least 32 bytes")
        return value

    @field_validator("jwt_secret")
    @classmethod
    def secret_long_enough(cls, value: str) -> str:
        # HS512 should be keyed with at least 64 bytes; fail at startup, not in production.
        if len(value.encode()) < 64:
            raise ValueError("JWT_SECRET must be at least 64 bytes")
        return value


settings = Settings()  # type: ignore[call-arg]  # values come from .env, which mypy can't see
