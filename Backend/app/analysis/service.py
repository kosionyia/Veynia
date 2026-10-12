import copy
import uuid
from datetime import timedelta
from typing import Any

from sqlalchemy.orm import defer
from sqlmodel import Session, col, func, select

from app.analysis.models import ACTIVE_STATUSES, Analysis
from app.analysis.schemas import AnalysisDetail, AnalysisSummary, Comparison, ComparisonCell, ComparisonRow
from app.analysis.scoring import apply_rewrites, effective_status, rescore
from app.auth.models import User
from app.core.time import utc_now
from app.cvs.models import CV
from app.cvs.service import get_cv
from app.jobs.models import Job
from app.jobs.service import get_job

# One CPU-bound model: more than this at once just makes every user wait longer.
MAX_ACTIVE_PER_USER = 2
# Two steps of at most ollama_timeout_seconds (10 min) each, plus slack. Still
# running after this means the server restarted mid-run and the work was lost.
STALE_AFTER = timedelta(minutes=30)
INTERRUPTED = "The analysis was interrupted. Run it again."
SUGGESTIONS_ACTIVE = ("queued", "running")
SUGGESTIONS_STALE_AFTER = timedelta(minutes=15)


class AnalysisNotFound(Exception):
    pass


class TooManyActive(Exception):
    pass


class NotFinished(Exception):
    """Corrections, suggestions, downloads and comparisons need a finished analysis."""


class RequirementNotFound(Exception):
    pass


class SuggestionNotFound(Exception):
    pass


class SuggestionNotApplicable(Exception):
    """Its original text isn't in the CV, so there's nothing to replace."""


class SuggestionsRunning(Exception):
    pass


class NothingAccepted(Exception):
    pass


class DifferentJobs(Exception):
    pass


def _expire_stale(session: Session, analyses: list[Analysis]) -> None:
    now = utc_now()
    stale = [a for a in analyses if a.status in ACTIVE_STATUSES and a.created_at < now - STALE_AFTER]
    for analysis in stale:
        analysis.status, analysis.error, analysis.finished_at = "failed", INTERRUPTED, now
        session.add(analysis)
    # Suggestions are one model call, so they get a shorter limit.
    stale_suggestions = [
        a for a in analyses
        if a.suggestions_status in SUGGESTIONS_ACTIVE
        and a.suggestions_requested_at is not None
        and a.suggestions_requested_at < now - SUGGESTIONS_STALE_AFTER
    ]
    for analysis in stale_suggestions:
        analysis.suggestions_status, analysis.suggestions_error = "failed", INTERRUPTED
        session.add(analysis)
    stale += [a for a in stale_suggestions if a not in stale]
    if stale:
        session.commit()
        # Commit marks loaded rows stale; reload them before they're read again.
        for analysis in stale:
            session.refresh(analysis)


def _active_count(session: Session, user: User) -> int:
    cutoff = utc_now() - STALE_AFTER
    query = select(func.count()).select_from(Analysis).where(
        Analysis.user_id == user.id,
        col(Analysis.status).in_(ACTIVE_STATUSES),
        Analysis.created_at >= cutoff,
    )
    return session.exec(query).one()


def create_analysis(session: Session, user: User, cv_id: uuid.UUID, job_id: uuid.UUID) -> Analysis:
    """Raise CVNotFound / JobNotFound (not the user's) or TooManyActive."""
    get_cv(session, user, cv_id)
    get_job(session, user, job_id)
    if _active_count(session, user) >= MAX_ACTIVE_PER_USER:
        raise TooManyActive
    analysis = Analysis(user_id=user.id, cv_id=cv_id, job_id=job_id)
    session.add(analysis)
    session.commit()
    session.refresh(analysis)
    return analysis


def _summary_fields(analysis: Analysis, cv_name: str, title: str | None, company: str | None) -> dict[str, Any]:
    return {
        **analysis.model_dump(exclude={"result", "suggestions"}),
        "cv_name": cv_name,
        "job_title": title,
        "job_company": company,
    }


def _query(user: User):
    return (
        select(Analysis, CV.name, Job.title, Job.company)
        .join(CV, col(CV.id) == Analysis.cv_id)
        .join(Job, col(Job.id) == Analysis.job_id)
        .where(Analysis.user_id == user.id)
    )


def list_analyses(session: Session, user: User) -> list[AnalysisSummary]:
    query = (
        _query(user)
        .options(defer(Analysis.result), defer(Analysis.suggestions))  # type: ignore[arg-type]
        .order_by(col(Analysis.created_at).desc())
    )
    rows = session.exec(query).all()
    _expire_stale(session, [row[0] for row in rows])
    return [AnalysisSummary.model_validate(_summary_fields(*row)) for row in rows]


def get_analysis(session: Session, user: User, analysis_id: uuid.UUID) -> AnalysisDetail:
    row = session.exec(_query(user).where(Analysis.id == analysis_id)).first()
    if row is None:
        raise AnalysisNotFound
    analysis = row[0]
    _expire_stale(session, [analysis])
    return AnalysisDetail.model_validate(
        {**_summary_fields(*row), "result": analysis.result, "suggestions": analysis.suggestions}
    )


def delete_analysis(session: Session, user: User, analysis_id: uuid.UUID) -> None:
    analysis = session.exec(
        select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user.id)
    ).first()
    if analysis is None:
        raise AnalysisNotFound
    session.delete(analysis)
    session.commit()


# --- results: corrections, suggestions, downloads, comparison ---------------

def _finished(session: Session, user: User, analysis_id: uuid.UUID) -> Analysis:
    analysis = session.exec(
        select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user.id)
    ).first()
    if analysis is None:
        raise AnalysisNotFound
    if analysis.status != "done" or not analysis.result:
        raise NotFinished
    return analysis


def correct_requirement(
    session: Session, user: User, analysis_id: uuid.UUID, number: int, status: str | None, note: str | None
) -> AnalysisDetail:
    """Override the model's verdict for requirement `number` (from 1), or undo
    the override with status None. The score is recalculated either way."""
    analysis = _finished(session, user, analysis_id)
    # JSON columns only save when reassigned, not when changed in place.
    result = copy.deepcopy(analysis.result)
    rows = result["requirements"]
    if not 1 <= number <= len(rows):
        raise RequirementNotFound
    row = rows[number - 1]
    # The model's own verdict is no correction, unless its quote wasn't found:
    # then "yes, matched" means the user vouches for it, which earns the points.
    same_as_model = status == row["status"] and row["evidence_verified"] is not False
    row["user_status"] = None if same_as_model else status
    row["user_note"] = (note or None) if row["user_status"] else None
    result.setdefault("model_score", analysis.score)  # results from before corrections existed
    analysis.score, result["scoring"] = rescore(rows)
    analysis.result = result
    session.add(analysis)
    session.commit()
    return get_analysis(session, user, analysis_id)


def request_suggestions(session: Session, user: User, analysis_id: uuid.UUID) -> Analysis:
    """Queue (or redo) the rewrite suggestions. Redoing drops the old ones."""
    analysis = _finished(session, user, analysis_id)
    _expire_stale(session, [analysis])
    if analysis.suggestions_status in SUGGESTIONS_ACTIVE:
        raise SuggestionsRunning
    analysis.suggestions_status, analysis.suggestions_error = "queued", None
    analysis.suggestions, analysis.suggestions_requested_at = None, utc_now()
    session.add(analysis)
    session.commit()
    return analysis


def set_suggestion_accepted(
    session: Session, user: User, analysis_id: uuid.UUID, number: int, accepted: bool
) -> AnalysisDetail:
    analysis = _finished(session, user, analysis_id)
    suggestions = copy.deepcopy(analysis.suggestions or [])
    suggestion = next((s for s in suggestions if s["number"] == number), None)
    if suggestion is None:
        raise SuggestionNotFound
    if accepted and not suggestion["applicable"]:
        raise SuggestionNotApplicable
    suggestion["accepted"] = accepted
    analysis.suggestions = suggestions
    session.add(analysis)
    session.commit()
    return get_analysis(session, user, analysis_id)


def rewritten_cv(session: Session, user: User, analysis_id: uuid.UUID) -> tuple[str, str]:
    """(CV name, CV text with the accepted rewrites applied)."""
    analysis = _finished(session, user, analysis_id)
    if not any(s["accepted"] for s in analysis.suggestions or []):
        raise NothingAccepted
    cv = get_cv(session, user, analysis.cv_id)
    return cv.name, apply_rewrites(cv.text, analysis.suggestions or [])


def finished_detail(session: Session, user: User, analysis_id: uuid.UUID) -> AnalysisDetail:
    _finished(session, user, analysis_id)
    return get_analysis(session, user, analysis_id)


def _cell(row: dict[str, Any]) -> ComparisonCell:
    return ComparisonCell(
        status=effective_status(row),
        corrected=bool(row.get("user_status")),
        cv_evidence=row["cv_evidence"],
        evidence_verified=row["evidence_verified"],
        points=row["points"],
        max_points=row["max_points"],
    )


def compare(session: Session, user: User, first_id: uuid.UUID, second_id: uuid.UUID) -> Comparison:
    """Two finished analyses of the same job, lined up requirement by requirement."""
    first, second = finished_detail(session, user, first_id), finished_detail(session, user, second_id)
    if first.job_id != second.job_id:
        raise DifferentJobs
    a = {r["requirement"].lower(): r for r in first.model_dump()["result"]["requirements"]}
    b = {r["requirement"].lower(): r for r in second.model_dump()["result"]["requirements"]}
    rows = []
    # Normally identical lists (the job's requirements are extracted once), but
    # a job could be re-extracted later, so keep anything only one side has.
    for key in [*a, *(k for k in b if k not in a)]:
        row = a.get(key) or b[key]
        rows.append(ComparisonRow(
            requirement=row["requirement"],
            importance=row["importance"],
            first=_cell(a[key]) if key in a else None,
            second=_cell(b[key]) if key in b else None,
        ))
    return Comparison(
        first=AnalysisSummary.model_validate(first.model_dump()),
        second=AnalysisSummary.model_validate(second.model_dump()),
        rows=rows,
    )
