"""All app timestamps: timezone-aware, stored in UTC.

Store UTC, convert to the viewer's timezone only when displaying (frontend).
"""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime
from sqlmodel import Field


def utc_now() -> datetime:
    """Timezone-aware 'now' in UTC. Never use naive datetime.now() for stored values."""
    return datetime.now(UTC)


def timestamp_field(*, nullable: bool = False) -> Any:
    """A TIMESTAMP WITH TIME ZONE column with no default (e.g. applied_at)."""
    return Field(default=None, sa_type=DateTime(timezone=True), nullable=nullable)


def created_at_field() -> Any:
    """Set once, when the row is created."""
    return Field(default_factory=utc_now, sa_type=DateTime(timezone=True))


def updated_at_field() -> Any:
    """Set on create and refreshed by SQLAlchemy on every UPDATE of the row."""
    return Field(
        default_factory=utc_now,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"onupdate": utc_now},
    )
