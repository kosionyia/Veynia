import uuid
from datetime import timedelta
from typing import Any

from sqlalchemy.orm import defer
from sqlmodel import Session, col, func, select

from app.analysis.models import ACTIVE_STATUSES, Analysis
from app.analysis.schemas import AnalysisDetail, AnalysisSummary
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


class AnalysisNotFound(Exception):
    pass


class TooManyActive(Exception):
    pass


def _expire_stale(session: Session, analyses: list[Analysis]) -> None:
    cutoff = utc_now() - STALE_AFTER
    stale = [a for a in analyses if a.status in ACTIVE_STATUSES and a.created_at < cutoff]
    for analysis in stale:
        analysis.status, analysis.error, analysis.finished_at = "failed", INTERRUPTED, utc_now()
        session.add(analysis)
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
        **analysis.model_dump(exclude={"result"}),
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
    query = _query(user).options(defer(Analysis.result)).order_by(col(Analysis.created_at).desc())  # type: ignore[arg-type]
    rows = session.exec(query).all()
    _expire_stale(session, [row[0] for row in rows])
    return [AnalysisSummary.model_validate(_summary_fields(*row)) for row in rows]


def get_analysis(session: Session, user: User, analysis_id: uuid.UUID) -> AnalysisDetail:
    row = session.exec(_query(user).where(Analysis.id == analysis_id)).first()
    if row is None:
        raise AnalysisNotFound
    _expire_stale(session, [row[0]])
    return AnalysisDetail.model_validate({**_summary_fields(*row), "result": row[0].result})


def delete_analysis(session: Session, user: User, analysis_id: uuid.UUID) -> None:
    analysis = session.exec(
        select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user.id)
    ).first()
    if analysis is None:
        raise AnalysisNotFound
    session.delete(analysis)
    session.commit()
