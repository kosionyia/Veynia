import uuid

from fastapi import APIRouter, HTTPException, Response, status
from limits import parse

from app.auth.dependencies import CurrentUser
from app.core import rate_limit
from app.core.db import SessionDep
from app.jobs import service
from app.jobs.schemas import JobCreate, JobDetail, JobSummary
from app.jobs.scraping import ScrapeError

router = APIRouter(prefix="/jobs", tags=["jobs"])

# Fetching links makes our server call other sites; keep that modest.
JOBS_PER_USER = parse("60/hour")

_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")


@router.post("", response_model=JobDetail, status_code=status.HTTP_201_CREATED)
def create_job(data: JobCreate, user: CurrentUser, session: SessionDep):
    rate_limit.hit(JOBS_PER_USER, "job-create", str(user.id))
    try:
        return service.create_job(session, user, data)
    except (ScrapeError, service.JobTextError) as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc))


@router.get("", response_model=list[JobSummary])
def list_jobs(user: CurrentUser, session: SessionDep):
    return service.list_jobs(session, user)


@router.get("/{job_id}", response_model=JobDetail)
def get_job(job_id: uuid.UUID, user: CurrentUser, session: SessionDep):
    try:
        return service.get_job(session, user, job_id)
    except service.JobNotFound:
        raise _NOT_FOUND


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(job_id: uuid.UUID, user: CurrentUser, session: SessionDep):
    try:
        service.delete_job(session, user, job_id)
    except service.JobNotFound:
        raise _NOT_FOUND
    return Response(status_code=status.HTTP_204_NO_CONTENT)
