import re
import uuid

from sqlalchemy.orm import defer
from sqlmodel import Session, col, select

from app.auth.models import User
from app.jobs import scraping
from app.jobs.models import Job
from app.jobs.schemas import JobCreate

# Shorter than this isn't a job description (or the page hid it from us).
MIN_JOB_CHARS = 200
# Step 1 reads the whole text in one go; this keeps it well inside the model's
# context window (~4 chars per token, 8192 tokens, plus room for the answer).
MAX_JOB_CHARS = 20_000


class JobNotFound(Exception):
    pass


class JobTextError(Exception):
    """The text can't be used as a job description. The message is shown to the user."""


def _clean(text: str) -> str:
    text = text.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")
    text = "\n".join(line.rstrip() for line in text.split("\n"))
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def create_job(session: Session, user: User, data: JobCreate) -> Job:
    """Raise ScrapeError (link unusable) or JobTextError (text unusable)."""
    title, company, url = data.title, data.company, data.url
    if data.text:
        text, source = data.text, "pasted"
        if url:
            url = scraping.check_url(url)
    else:
        assert url is not None  # JobCreate guarantees text or url
        scraped = scraping.scrape_job(url)
        text, source, url = scraped.text, "link", scraped.final_url
        # The page's own title and company, unless the user typed their own.
        title = title or (scraped.title or "")[:200] or None
        company = company or (scraped.company or "")[:200] or None

    text = _clean(text)
    if len(text) < MIN_JOB_CHARS:
        hint = f" {scraping.PASTE_INSTEAD}" if source == "link" else ""
        raise JobTextError(f"That's too short to be a job description.{hint}")
    if len(text) > MAX_JOB_CHARS:
        text = text[:MAX_JOB_CHARS]

    job = Job(
        user_id=user.id, title=title, company=company, url=url,
        source=source, text=text, char_count=len(text),
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def list_jobs(session: Session, user: User) -> list[Job]:
    query = (
        select(Job)
        .where(Job.user_id == user.id)
        .options(defer(Job.text))  # type: ignore[arg-type]
        .order_by(col(Job.created_at).desc())
    )
    return list(session.exec(query).all())


def get_job(session: Session, user: User, job_id: uuid.UUID) -> Job:
    # Someone else's job is "not found", not "forbidden".
    job = session.exec(select(Job).where(Job.id == job_id, Job.user_id == user.id)).first()
    if job is None:
        raise JobNotFound
    return job


def delete_job(session: Session, user: User, job_id: uuid.UUID) -> None:
    session.delete(get_job(session, user, job_id))
    session.commit()
