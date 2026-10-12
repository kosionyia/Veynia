import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Text
from sqlmodel import Field, SQLModel

from app.core.time import created_at_field, timestamp_field


class Job(SQLModel, table=True):
    __tablename__ = "jobs"

    id: uuid.UUID = Field(default_factory=uuid.uuid7, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    title: str | None = Field(default=None, max_length=200)
    company: str | None = Field(default=None, max_length=200)
    url: str | None = Field(default=None, max_length=2048)
    source: str = Field(max_length=10)  # "pasted" | "link"
    text: str = Field(sa_type=Text)
    char_count: int
    # Step 1 of an analysis: the job's requirements, extracted once by the LLM
    # and reused for every CV compared with this job.
    # [{"requirement": str, "importance": "required" | "preferred"}]
    requirements: list[dict[str, Any]] | None = Field(default=None, sa_type=JSON)
    requirements_model: str | None = Field(default=None, max_length=100)
    requirements_extracted_at: datetime | None = timestamp_field(nullable=True)
    created_at: datetime = created_at_field()
