import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, Response, status
from limits import parse

from app.analysis import service
from app.analysis.pipeline import run_analysis
from app.analysis.schemas import AnalysisCreate, AnalysisDetail, AnalysisSummary
from app.auth.dependencies import CurrentUser
from app.core import rate_limit
from app.core.db import SessionDep
from app.cvs.service import CVNotFound
from app.jobs.service import JobNotFound

router = APIRouter(prefix="/analyses", tags=["analyses"])

# Each analysis keeps the local model busy for minutes.
ANALYSES_PER_USER = parse("20/hour")

_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found")


@router.post("", response_model=AnalysisDetail, status_code=status.HTTP_202_ACCEPTED)
def create_analysis(
    data: AnalysisCreate, user: CurrentUser, session: SessionDep, background: BackgroundTasks
):
    """Queues the analysis and returns at once (202). Poll GET /analyses/{id}
    until status is "done" or "failed": on a CPU it takes a few minutes."""
    rate_limit.hit(ANALYSES_PER_USER, "analysis-create", str(user.id))
    try:
        analysis = service.create_analysis(session, user, data.cv_id, data.job_id)
    except CVNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CV not found")
    except JobNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    except service.TooManyActive:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"You already have {service.MAX_ACTIVE_PER_USER} analyses running. Wait for one to finish.",
        )
    # Runs after the response is sent. The engine of this request's session, so
    # tests (which use their own database) stay on it.
    background.add_task(run_analysis, analysis.id, session.get_bind())
    return service.get_analysis(session, user, analysis.id)


@router.get("", response_model=list[AnalysisSummary])
def list_analyses(user: CurrentUser, session: SessionDep):
    return service.list_analyses(session, user)


@router.get("/{analysis_id}", response_model=AnalysisDetail)
def get_analysis(analysis_id: uuid.UUID, user: CurrentUser, session: SessionDep):
    try:
        return service.get_analysis(session, user, analysis_id)
    except service.AnalysisNotFound:
        raise _NOT_FOUND


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(analysis_id: uuid.UUID, user: CurrentUser, session: SessionDep):
    try:
        service.delete_analysis(session, user, analysis_id)
    except service.AnalysisNotFound:
        raise _NOT_FOUND
    return Response(status_code=status.HTTP_204_NO_CONTENT)
