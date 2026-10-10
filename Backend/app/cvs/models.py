import uuid
from datetime import datetime

from sqlalchemy import Text
from sqlmodel import Field, SQLModel

from app.core.time import created_at_field, updated_at_field


class CV(SQLModel, table=True):
    __tablename__ = "cvs"

    id: uuid.UUID = Field(default_factory=uuid.uuid7, primary_key=True)
    # Deleting a user deletes their CVs.
    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE", index=True)
    # What the user calls it ("Backend CV"); starts as the file name.
    name: str = Field(max_length=100)
    filename: str = Field(max_length=255)
    file_type: str = Field(max_length=10)  # "pdf" | "docx"
    file_size: int
    page_count: int | None = None  # PDFs only
    # Only the extracted text is kept, not the file: matching needs nothing
    # else, and it's less personal data to hold.
    text: str = Field(sa_type=Text)
    char_count: int
    # Set when the text looks incomplete (scan, images) or was cut short.
    extraction_warning: str | None = Field(default=None, max_length=500)
    created_at: datetime = created_at_field()
    updated_at: datetime = updated_at_field()
