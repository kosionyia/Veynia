import re
import uuid
from pathlib import PurePath

from sqlalchemy.orm import defer
from sqlmodel import Session, col, func, select

from app.auth.models import User
from app.cvs.extraction import extract_cv
from app.cvs.models import CV

MAX_CVS_PER_USER = 20


class CVNotFound(Exception):
    pass


class CVLimitReached(Exception):
    pass


def _safe_filename(filename: str | None) -> str:
    # Browsers send just a name, but anyone calling the API can send a path or
    # control characters. Keep the last path part, printable characters only.
    name = PurePath((filename or "").replace("\\", "/")).name
    name = re.sub(r"[\x00-\x1f\x7f]", "", name).strip()
    return name[:255] or "cv"


def create_cv(session: Session, user: User, filename: str | None, data: bytes) -> CV:
    """Raise CVLimitReached, or ExtractionError if the file can't be read."""
    count = session.exec(select(func.count()).select_from(CV).where(CV.user_id == user.id)).one()
    if count >= MAX_CVS_PER_USER:
        raise CVLimitReached

    extracted = extract_cv(data)
    safe_name = _safe_filename(filename)
    cv = CV(
        user_id=user.id,
        name=PurePath(safe_name).stem[:100] or "My CV",
        filename=safe_name,
        file_type=extracted.file_type,
        file_size=len(data),
        page_count=extracted.page_count,
        text=extracted.text,
        char_count=len(extracted.text),
        extraction_warning=extracted.warning,
    )
    session.add(cv)
    session.commit()
    session.refresh(cv)
    return cv


def list_cvs(session: Session, user: User) -> list[CV]:
    # The list never shows the text, so don't load up to 50k chars per CV.
    query = (
        select(CV)
        .where(CV.user_id == user.id)
        .options(defer(CV.text))  # type: ignore[arg-type]
        .order_by(col(CV.created_at).desc())
    )
    return list(session.exec(query).all())


def get_cv(session: Session, user: User, cv_id: uuid.UUID) -> CV:
    # Someone else's CV is "not found", not "forbidden": don't confirm it exists.
    cv = session.exec(select(CV).where(CV.id == cv_id, CV.user_id == user.id)).first()
    if cv is None:
        raise CVNotFound
    return cv


def rename_cv(session: Session, user: User, cv_id: uuid.UUID, name: str) -> CV:
    cv = get_cv(session, user, cv_id)
    cv.name = name
    session.add(cv)
    session.commit()
    session.refresh(cv)
    return cv


def delete_cv(session: Session, user: User, cv_id: uuid.UUID) -> None:
    session.delete(get_cv(session, user, cv_id))
    session.commit()
