import uuid
from collections import Counter
from datetime import date

from sqlmodel import Session, col, select

from app.analysis.models import Analysis
from app.applications.models import STATUSES, Application
from app.applications.schemas import ApplicationCreate, ApplicationOut, ApplicationStats, ApplicationUpdate
from app.auth.models import User
from app.core.time import utc_now
from app.cvs.models import CV
from app.cvs.service import get_cv
from app.jobs.models import Job

# Being in one of these means the user has applied, so it gets an applied date.
APPLIED_OR_LATER = ("applied", "interviewing", "offer")
# Still worth a follow-up reminder.
IN_PROGRESS = ("saved", "applied", "interviewing")


class ApplicationNotFound(Exception):
    pass


class AnalysisNotFound(Exception):
    pass


class AlreadyTracked(Exception):
    """This result already has an application; `existing_id` is it."""

    def __init__(self, existing_id: uuid.UUID):
        self.existing_id = existing_id


class MissingDetails(Exception):
    """No company or role: not typed in, and the result's job doesn't say."""


def _today() -> date:
    # UTC: the server doesn't know the user's timezone. Users can change it.
    return utc_now().date()


def _set_status(application: Application, status: str) -> None:
    now = utc_now()
    application.status = status
    application.status_changed_at = now
    # Reassigned, not appended: JSON columns only save on assignment.
    application.history = [*application.history, {"status": status, "at": now.isoformat()}]
    if status in APPLIED_OR_LATER and application.applied_on is None:
        application.applied_on = _today()


def _query(user: User):
    # Outer joins: the CV or result may be gone (SET NULL) or never linked.
    return (
        select(Application, CV.name, Analysis.score)
        .outerjoin(CV, col(CV.id) == Application.cv_id)
        .outerjoin(Analysis, col(Analysis.id) == Application.analysis_id)
        .where(Application.user_id == user.id)
    )


def _out(application: Application, cv_name: str | None, score: int | None) -> ApplicationOut:
    return ApplicationOut.model_validate(
        {**application.model_dump(), "cv_name": cv_name, "match_score": score}
    )


def get_application(session: Session, user: User, application_id: uuid.UUID) -> ApplicationOut:
    row = session.exec(_query(user).where(Application.id == application_id)).first()
    if row is None:
        raise ApplicationNotFound
    return _out(*row)


def _owned(session: Session, user: User, application_id: uuid.UUID) -> Application:
    application = session.exec(
        select(Application).where(Application.id == application_id, Application.user_id == user.id)
    ).first()
    if application is None:
        raise ApplicationNotFound
    return application


def create_application(session: Session, user: User, data: ApplicationCreate) -> ApplicationOut:
    """Raise AnalysisNotFound, AlreadyTracked, CVNotFound or MissingDetails."""
    company, role, url, cv_id, job_id = data.company, data.role, data.url, data.cv_id, None
    if data.analysis_id:
        analysis = session.exec(
            select(Analysis).where(Analysis.id == data.analysis_id, Analysis.user_id == user.id)
        ).first()
        if analysis is None:
            raise AnalysisNotFound
        existing = session.exec(
            select(Application.id).where(Application.user_id == user.id, Application.analysis_id == analysis.id)
        ).first()
        if existing:
            raise AlreadyTracked(existing)
        job = session.get(Job, analysis.job_id)
        company = company or (job.company if job else None)
        role = role or (job.title if job else None)
        url = url or (job.url if job else None)
        cv_id, job_id = cv_id or analysis.cv_id, analysis.job_id
    if not company or not role:
        raise MissingDetails
    if cv_id:
        get_cv(session, user, cv_id)  # raises CVNotFound for someone else's

    application = Application(
        user_id=user.id, analysis_id=data.analysis_id, cv_id=cv_id, job_id=job_id,
        company=company, role=role, url=url, applied_on=data.applied_on,
        follow_up_on=data.follow_up_on, notes=data.notes or None,
    )
    _set_status(application, data.status)
    session.add(application)
    session.commit()
    return get_application(session, user, application.id)


def update_application(
    session: Session, user: User, application_id: uuid.UUID, data: ApplicationUpdate
) -> ApplicationOut:
    """Raise ApplicationNotFound or CVNotFound."""
    application = _owned(session, user, application_id)
    changes = data.model_dump(exclude_unset=True)
    if changes.get("cv_id"):
        get_cv(session, user, changes["cv_id"])
    status = changes.pop("status", None)
    for name, value in changes.items():
        if name == "notes":
            value = value or None  # blank notes are no notes
        setattr(application, name, value)
    if status and status != application.status:
        _set_status(application, status)
    session.add(application)
    session.commit()
    return get_application(session, user, application_id)


def list_applications(session: Session, user: User, status: str | None = None) -> list[ApplicationOut]:
    query = _query(user).order_by(col(Application.updated_at).desc())
    if status:
        query = query.where(Application.status == status)
    return [_out(*row) for row in session.exec(query).all()]


def stats(session: Session, user: User) -> ApplicationStats:
    rows = session.exec(
        select(Application.status, Application.follow_up_on).where(Application.user_id == user.id)
    ).all()
    counts = Counter(status for status, _ in rows)
    today = _today()
    return ApplicationStats(
        total=len(rows),
        by_status={status: counts.get(status, 0) for status in STATUSES},
        follow_ups_due=sum(1 for status, due in rows if due and due <= today and status in IN_PROGRESS),
    )


def delete_application(session: Session, user: User, application_id: uuid.UUID) -> None:
    session.delete(_owned(session, user, application_id))
    session.commit()
