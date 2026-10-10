import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

CVName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class CVSummary(BaseModel):
    """For lists: everything except the text."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    filename: str
    file_type: str
    file_size: int
    page_count: int | None
    char_count: int
    extraction_warning: str | None
    created_at: datetime
    updated_at: datetime


class CVDetail(CVSummary):
    text: str


class CVRename(BaseModel):
    name: CVName
