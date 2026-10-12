import uuid
from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, BackgroundTasks, HTTPException, Response, status
from limits import parse

from app.analysis import export, service
from app.analysis.pipeline import run_analysis, run_suggestions
from app.analysis.schemas import (
    AnalysisCreate,
    AnalysisDetail,
    AnalysisSummary,
    Comparison,
    Correction,
    SuggestionUpdate,
)
from app.auth.dependencies import CurrentUser
from app.core import rate_limit
from app.core.db import SessionDep
from app.cvs.service import CVNotFound
from app.jobs.service import JobNotFound

router = APIRouter(prefix="/analyses", tags=["analyses"])

# Each analysis keeps the local model busy for minutes.
ANALYSES_PER_USER = parse("20/hour")
SUGGESTIONS_PER_USER = parse("20/hour")

_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found")
_NOT_FINISHED = HTTPException(status.HTTP_409_CONFLICT, "The analysis hasn't finished yet.")

DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def _download(content: bytes, media_type: str, name: str) -> Response:
    # filename= for old clients (ASCII only), filename*= for the real name.
    disposition = f'attachment; filename="{name}"; filename*=UTF-8\'\'{quote(name)}'
    return Response(content, media_type=media_type, headers={"Content-Disposition": disposition})


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


# Declared before /{analysis_id}, or "compare" would be read as an id.
@router.get("/compare", response_model=Comparison)
def compare(first: uuid.UUID, second: uuid.UUID, user: CurrentUser, session: SessionDep):
    try:
        return service.compare(session, user, first, second)
    except service.AnalysisNotFound:
        raise _NOT_FOUND
    except service.NotFinished:
        raise _NOT_FINISHED
    except service.DifferentJobs:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "Only analyses of the same job can be compared."
        )


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


@router.patch("/{analysis_id}/requirements/{number}", response_model=AnalysisDetail)
def correct_requirement(
    analysis_id: uuid.UUID, number: int, data: Correction, user: CurrentUser, session: SessionDep
):
    """Correct one verdict (number = position from 1). status null undoes it."""
    try:
        return service.correct_requirement(session, user, analysis_id, number, data.status, data.note)
    except service.AnalysisNotFound:
        raise _NOT_FOUND
    except service.NotFinished:
        raise _NOT_FINISHED
    except service.RequirementNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Requirement not found")


@router.post("/{analysis_id}/suggestions", response_model=AnalysisDetail, status_code=status.HTTP_202_ACCEPTED)
def request_suggestions(
    analysis_id: uuid.UUID, user: CurrentUser, session: SessionDep, background: BackgroundTasks
):
    """Queue CV rewrite suggestions for the partly matched and missing
    requirements. Poll GET /analyses/{id} for suggestions_status."""
    rate_limit.hit(SUGGESTIONS_PER_USER, "suggestions", str(user.id))
    try:
        analysis = service.request_suggestions(session, user, analysis_id)
    except service.AnalysisNotFound:
        raise _NOT_FOUND
    except service.NotFinished:
        raise _NOT_FINISHED
    except service.SuggestionsRunning:
        raise HTTPException(status.HTTP_409_CONFLICT, "Suggestions are already being written.")
    background.add_task(run_suggestions, analysis.id, session.get_bind())
    return service.get_analysis(session, user, analysis_id)


@router.patch("/{analysis_id}/suggestions/{number}", response_model=AnalysisDetail)
def update_suggestion(
    analysis_id: uuid.UUID, number: int, data: SuggestionUpdate, user: CurrentUser, session: SessionDep
):
    """Accept or un-accept a rewrite (number = the requirement's number)."""
    try:
        return service.set_suggestion_accepted(session, user, analysis_id, number, data.accepted)
    except service.AnalysisNotFound:
        raise _NOT_FOUND
    except service.NotFinished:
        raise _NOT_FINISHED
    except service.SuggestionNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Suggestion not found")
    except service.SuggestionNotApplicable:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This suggestion's original text isn't in your CV, so it can't be applied."
        )


@router.get("/{analysis_id}/report")
def report(analysis_id: uuid.UUID, user: CurrentUser, session: SessionDep, format: Literal["pdf", "docx"] = "pdf"):
    """The result as a PDF or Word document."""
    try:
        detail = service.finished_detail(session, user, analysis_id)
    except service.AnalysisNotFound:
        raise _NOT_FOUND
    except service.NotFinished:
        raise _NOT_FINISHED
    name = export.filename(f"Veynia {export.job_label(detail)}", format)
    if format == "pdf":
        return _download(export.report_pdf(detail), "application/pdf", name)
    return _download(export.report_docx(detail), DOCX, name)


@router.get("/{analysis_id}/cv-rewrite")
def cv_rewrite(analysis_id: uuid.UUID, user: CurrentUser, session: SessionDep):
    """The CV's text with the accepted rewrites applied, as a Word file."""
    try:
        cv_name, text = service.rewritten_cv(session, user, analysis_id)
    except service.AnalysisNotFound:
        raise _NOT_FOUND
    except service.NotFinished:
        raise _NOT_FINISHED
    except service.NothingAccepted:
        raise HTTPException(status.HTTP_409_CONFLICT, "Accept at least one suggestion first.")
    return _download(export.cv_docx(text), DOCX, export.filename(f"{cv_name} rewritten", "docx"))
