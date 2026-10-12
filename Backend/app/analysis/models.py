import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON
from sqlmodel import Field, SQLModel

from app.core.time import created_at_field, timestamp_field

# queued → extracting (step 1, skipped when the job's requirements are cached)
# → matching (step 2) → done | failed
ACTIVE_STATUSES = ("queued", "extracting", "matching")


class Analysis(SQLModel, table=True):
    __tablename__ = "analyses"

    id: uuid.UUID = Field(default_factory=uuid.uuid7, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    # Deleting the CV or the job deletes its analyses: they're derived from them.
    cv_id: uuid.UUID = Field(foreign_key="cvs.id", ondelete="CASCADE", index=True)
    job_id: uuid.UUID = Field(foreign_key="jobs.id", ondelete="CASCADE", index=True)
    status: str = Field(default="queued", max_length=20)
    # Shown to the user when status is "failed".
    error: str | None = Field(default=None, max_length=500)
    score: int | None = None  # 0-100, calculated in code from the verdicts
    # {"summary", "requirements": [verdict...], "scoring": {...}, "warnings": [...]}
    result: dict[str, Any] | None = Field(default=None, sa_type=JSON)
    # Which model and prompt produced the result, so results stay comparable.
    model: str | None = Field(default=None, max_length=100)
    prompt_version: str | None = Field(default=None, max_length=50)
    created_at: datetime = created_at_field()
    started_at: datetime | None = timestamp_field(nullable=True)
    finished_at: datetime | None = timestamp_field(nullable=True)

    # CV rewrite suggestions: asked for separately, after the analysis is done.
    # None (never asked) → queued → running → done | failed
    suggestions_status: str | None = Field(default=None, max_length=20)
    suggestions_error: str | None = Field(default=None, max_length=500)
    # [{"number", "requirement", "original", "rewritten", "explanation",
    #   "applicable", "new_terms", "accepted"}]
    suggestions: list[dict[str, Any]] | None = Field(default=None, sa_type=JSON)
    suggestions_prompt_version: str | None = Field(default=None, max_length=50)
    suggestions_requested_at: datetime | None = timestamp_field(nullable=True)
