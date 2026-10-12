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
    email_from: str = "Veynia <no-reply@veynia.local>"
    # Local LLM. In docker-compose the backend reaches it as http://ollama:11434.
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    # Ollama's default context is smaller and silently cuts off long input (the
    # spike lost half the CV that way), so always set it.
    ollama_num_ctx: int = 8192
    # CPU-only inference: one step can take minutes.
    ollama_timeout_seconds: float = 600

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
