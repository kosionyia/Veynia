import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint
from sqlmodel import Field, SQLModel

from app.core.time import created_at_field


class User(SQLModel, table=True):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "hashed_password IS NOT NULL OR google_sub IS NOT NULL",
            name="users_has_login_method",
        ),
    )


    id: uuid.UUID = Field(default_factory=uuid.uuid7, primary_key=True)
    full_name: str = Field(max_length=100)

    email: str = Field(max_length=255, unique=True, index=True)

    hashed_password: str | None = Field(default=None, max_length=255)
    google_sub: str | None = Field(default=None, max_length=255, unique=True)
    created_at: datetime = created_at_field()
