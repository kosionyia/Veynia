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

    @field_validator("jwt_secret")
    @classmethod
    def secret_long_enough(cls, value: str) -> str:
        # HS512 should be keyed with at least 64 bytes; fail at startup, not in production.
        if len(value.encode()) < 64:
            raise ValueError("JWT_SECRET must be at least 64 bytes")
        return value


settings = Settings()  # type: ignore[call-arg]  # values come from .env, which mypy can't see
