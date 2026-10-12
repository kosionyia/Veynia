import uuid
from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

Label = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]


class JobCreate(BaseModel):
    """Paste the text, give a link to fetch it from, or both (the link is then
    kept for reference and nothing is fetched)."""

    title: Label | None = None
    company: Label | None = None
    text: Annotated[str, StringConstraints(strip_whitespace=True)] | None = None
    url: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2048)] | None = None

    @model_validator(mode="after")
    def text_or_url(self) -> Self:
        # Blank strings from a form mean "not given".
        self.title, self.company = self.title or None, self.company or None
        self.text, self.url = self.text or None, self.url or None
        if not self.text and not self.url:
            raise ValueError("Paste the job description or give a link to it")
        return self


class Requirement(BaseModel):
    requirement: str
    importance: Literal["required", "preferred"]


class JobSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str | None
    company: str | None
    url: str | None
    source: str
    char_count: int
    created_at: datetime


class JobDetail(JobSummary):
    text: str
    requirements: list[Requirement] | None
