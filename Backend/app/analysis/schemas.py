import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, StringConstraints

Status = Literal["queued", "extracting", "matching", "done", "failed"]


class AnalysisCreate(BaseModel):
    cv_id: uuid.UUID
    job_id: uuid.UUID


class RequirementResult(BaseModel):
    requirement: str
    importance: Literal["required", "preferred"]
    status: Literal["matched", "partial", "missing"]
    cv_evidence: str
    # True: the quote is in the CV. False: it isn't, so the verdict earns no
    # points. None: nothing to check ("missing").
    evidence_verified: bool | None
    reason: str
    points: float
    max_points: float
    # The user's correction of the model's verdict, if any. It decides the points.
    user_status: Literal["matched", "partial", "missing"] | None = None
    user_note: str | None = None


class Scoring(BaseModel):
    weights: dict[str, float]
    credit: dict[str, float]
    earned: float
    possible: float


class AnalysisResult(BaseModel):
    summary: str
    requirements: list[RequirementResult]
    scoring: Scoring
    warnings: list[str]
    # The score before user corrections (older results don't have it).
    model_score: int | None = None


class Suggestion(BaseModel):
    number: int  # the requirement's position in `requirements`, from 1
    requirement: str
    # Both empty: nothing in the CV relates to it, so it's a gap to work on.
    original: str
    rewritten: str
    explanation: str
    # The original was found in the CV, so the rewrite can replace it.
    applicable: bool
    # Terms the rewrite adds that the CV never mentions: only keep if true.
    new_terms: list[str]
    accepted: bool


SuggestionsStatus = Literal["queued", "running", "done", "failed"]


class AnalysisSummary(BaseModel):
    id: uuid.UUID
    cv_id: uuid.UUID
    job_id: uuid.UUID
    cv_name: str
    job_title: str | None
    job_company: str | None
    status: Status
    score: int | None
    error: str | None
    created_at: datetime
    finished_at: datetime | None


class AnalysisDetail(AnalysisSummary):
    result: AnalysisResult | None
    model: str | None
    prompt_version: str | None
    started_at: datetime | None
    suggestions_status: SuggestionsStatus | None
    suggestions_error: str | None
    suggestions: list[Suggestion] | None
    suggestions_prompt_version: str | None


class Correction(BaseModel):
    """status None removes the correction and restores the model's verdict."""

    status: Literal["matched", "partial", "missing"] | None
    note: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] | None = None


class SuggestionUpdate(BaseModel):
    accepted: bool


class ComparisonCell(BaseModel):
    status: Literal["matched", "partial", "missing"]  # after any correction
    corrected: bool
    cv_evidence: str
    evidence_verified: bool | None
    points: float
    max_points: float


class ComparisonRow(BaseModel):
    requirement: str
    importance: Literal["required", "preferred"]
    first: ComparisonCell | None
    second: ComparisonCell | None


class Comparison(BaseModel):
    first: AnalysisSummary
    second: AnalysisSummary
    rows: list[ComparisonRow]
