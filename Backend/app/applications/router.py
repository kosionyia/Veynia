import uuid

from fastapi import APIRouter, HTTPException, Response, status
from limits import parse

from app.applications import service
from app.applications.schemas import ApplicationCreate, ApplicationOut, ApplicationStats, ApplicationUpdate, Status
from app.auth.dependencies import CurrentUser
from app.core import rate_limit
from app.core.db import SessionDep
from app.cvs.service import CVNotFound

router = APIRouter(prefix="/applications", tags=["applications"])

APPLICATIONS_PER_USER = parse("120/hour")

_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
_CV_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "CV not found")


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(data: ApplicationCreate, user: CurrentUser, session: SessionDep):
    rate_limit.hit(APPLICATIONS_PER_USER, "application-create", str(user.id))
    try:
        return service.create_application(session, user, data)
    except service.AnalysisNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Result not found")
    except CVNotFound:
        raise _CV_NOT_FOUND
    except service.AlreadyTracked as exc:
        # The id lets the page go straight to the existing one.
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            {"message": "You're already tracking this application.", "application_id": str(exc.existing_id)},
        )
    except service.MissingDetails:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Add the company and the role.")


@router.get("", response_model=list[ApplicationOut])
def list_applications(user: CurrentUser, session: SessionDep, status: Status | None = None):
    """Most recently updated first; ?status= to filter."""
    return service.list_applications(session, user, status)


# Declared before /{application_id}, or "stats" would be read as an id.
@router.get("/stats", response_model=ApplicationStats)
def application_stats(user: CurrentUser, session: SessionDep):
    return service.stats(session, user)


@router.get("/{application_id}", response_model=ApplicationOut)
def get_application(application_id: uuid.UUID, user: CurrentUser, session: SessionDep):
    try:
        return service.get_application(session, user, application_id)
    except service.ApplicationNotFound:
        raise _NOT_FOUND


@router.patch("/{application_id}", response_model=ApplicationOut)
def update_application(application_id: uuid.UUID, data: ApplicationUpdate, user: CurrentUser, session: SessionDep):
    try:
        return service.update_application(session, user, application_id, data)
    except service.ApplicationNotFound:
        raise _NOT_FOUND
    except CVNotFound:
        raise _CV_NOT_FOUND


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(application_id: uuid.UUID, user: CurrentUser, session: SessionDep):
    try:
        service.delete_application(session, user, application_id)
    except service.ApplicationNotFound:
        raise _NOT_FOUND
    return Response(status_code=status.HTTP_204_NO_CONTENT)
