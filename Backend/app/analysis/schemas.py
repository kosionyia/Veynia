import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

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
