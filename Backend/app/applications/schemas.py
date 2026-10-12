import uuid
from datetime import date, datetime
from typing import Annotated, Literal, Self

from pydantic import AfterValidator, BaseModel, StringConstraints, model_validator

Status = Literal["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"]
Label = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Notes = Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)]


def _web_link(url: str) -> str:
    # Shown as a link on the page, so only real web links: no javascript: etc.
    if not url.lower().startswith(("http://", "https://")):
        raise ValueError("Use a link starting with http:// or https://")
    return url


Link = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2048), AfterValidator(_web_link)]


class ApplicationCreate(BaseModel):
    """By hand, or from a result (analysis_id): then company, role, link and CV
    come from the result unless given here."""

    analysis_id: uuid.UUID | None = None
    cv_id: uuid.UUID | None = None
    company: Label | None = None
    role: Label | None = None
    url: Link | None = None
    status: Status = "saved"
    applied_on: date | None = None
    follow_up_on: date | None = None
    notes: Notes | None = None


class ApplicationUpdate(BaseModel):
    """Only the fields sent are changed; send null to clear an optional one."""

    cv_id: uuid.UUID | None = None
    company: Label | None = None
    role: Label | None = None
    url: Link | None = None
    status: Status | None = None
    applied_on: date | None = None
    follow_up_on: date | None = None
    notes: Notes | None = None

    @model_validator(mode="after")
    def required_stay_set(self) -> Self:
        # These can be changed but not removed.
        for name in ("company", "role", "status"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} can't be empty")
        return self


class HistoryEntry(BaseModel):
    status: Status
    at: datetime


class ApplicationOut(BaseModel):
    id: uuid.UUID
    analysis_id: uuid.UUID | None
    cv_id: uuid.UUID | None
    job_id: uuid.UUID | None
    company: str
    role: str
    url: str | None
    status: Status
    applied_on: date | None
    follow_up_on: date | None
    notes: str | None
    history: list[HistoryEntry]
    created_at: datetime
    updated_at: datetime
    status_changed_at: datetime | None
    # From the linked CV and result, while they still exist.
    cv_name: str | None
    match_score: int | None


class ApplicationStats(BaseModel):
    total: int
    by_status: dict[Status, int]
    # Follow-up date today or earlier, still in progress (saved/applied/interviewing).
    follow_ups_due: int
