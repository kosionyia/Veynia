import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, Date, Text
from sqlmodel import Field, SQLModel

from app.core.time import created_at_field, timestamp_field, updated_at_field

# Saved → Applied → Interviewing → Offer; Rejected and Withdrawn can end it at any point.
STATUSES = ("saved", "applied", "interviewing", "offer", "rejected", "withdrawn")


class Application(SQLModel, table=True):
    __tablename__ = "applications"

    id: uuid.UUID = Field(default_factory=uuid.uuid7, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    # Where it came from, if anywhere. Deleting the result, CV or job only
    # unlinks it (SET NULL): the record of having applied is still worth keeping.
    analysis_id: uuid.UUID | None = Field(default=None, foreign_key="analyses.id", ondelete="SET NULL", index=True)
    cv_id: uuid.UUID | None = Field(default=None, foreign_key="cvs.id", ondelete="SET NULL")
    job_id: uuid.UUID | None = Field(default=None, foreign_key="jobs.id", ondelete="SET NULL")
    # Copied in, not looked up, so they survive the job being deleted.
    company: str = Field(max_length=200)
    role: str = Field(max_length=200)
    url: str | None = Field(default=None, max_length=2048)
    status: str = Field(default="saved", max_length=20)
    applied_on: date | None = Field(default=None, sa_type=Date)
    # When to chase it up; the list highlights it once it's past.
    follow_up_on: date | None = Field(default=None, sa_type=Date)
    notes: str | None = Field(default=None, sa_type=Text)
    # Every status it has had, oldest first: [{"status": str, "at": ISO datetime}]
    history: list[dict[str, Any]] = Field(default_factory=list, sa_type=JSON)
    created_at: datetime = created_at_field()
    updated_at: datetime = updated_at_field()
    status_changed_at: datetime | None = timestamp_field(nullable=True)
