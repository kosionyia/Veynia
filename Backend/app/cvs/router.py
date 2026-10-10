import uuid

from fastapi import APIRouter, HTTPException, Response, UploadFile, status
from limits import parse

from app.auth.dependencies import CurrentUser
from app.core import rate_limit
from app.core.db import SessionDep
from app.cvs import service
from app.cvs.extraction import MAX_FILE_BYTES, ExtractionError, UnsupportedFileType
from app.cvs.schemas import CVDetail, CVRename, CVSummary

router = APIRouter(prefix="/cvs", tags=["cvs"])

# Parsing PDFs costs CPU; per user, since uploads need a session anyway.
UPLOADS_PER_USER = parse("20/hour")

_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, "CV not found")


@router.post("", response_model=CVDetail, status_code=status.HTTP_201_CREATED)
def upload_cv(file: UploadFile, user: CurrentUser, session: SessionDep):
    rate_limit.hit(UPLOADS_PER_USER, "cv-upload", str(user.id))
    # Read one byte past the limit: enough to know it's too big, no more.
    data = file.file.read(MAX_FILE_BYTES + 1)
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"The file is larger than {MAX_FILE_BYTES // (1024 * 1024)} MB.",
        )
    if not data:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "The file is empty.")

    try:
        return service.create_cv(session, user, file.filename, data)
    except service.CVLimitReached:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"You can keep up to {service.MAX_CVS_PER_USER} CVs. Delete one to upload another.",
        )
    except UnsupportedFileType as exc:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, str(exc))
    except ExtractionError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc))


@router.get("", response_model=list[CVSummary])
def list_cvs(user: CurrentUser, session: SessionDep):
    return service.list_cvs(session, user)


@router.get("/{cv_id}", response_model=CVDetail)
def get_cv(cv_id: uuid.UUID, user: CurrentUser, session: SessionDep):
    try:
        return service.get_cv(session, user, cv_id)
    except service.CVNotFound:
        raise _NOT_FOUND


@router.patch("/{cv_id}", response_model=CVSummary)
def rename_cv(cv_id: uuid.UUID, data: CVRename, user: CurrentUser, session: SessionDep):
    try:
        return service.rename_cv(session, user, cv_id, data.name)
    except service.CVNotFound:
        raise _NOT_FOUND


@router.delete("/{cv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cv(cv_id: uuid.UUID, user: CurrentUser, session: SessionDep):
    try:
        service.delete_cv(session, user, cv_id)
    except service.CVNotFound:
        raise _NOT_FOUND
    return Response(status_code=status.HTTP_204_NO_CONTENT)
