"""Turn an uploaded CV (PDF or DOCX) into plain text.

Uploads are untrusted, so the file type is decided by its bytes (not its name or
the browser's content type), and size, page count and unzipped size are capped
before any parser does real work.
"""

import io
import re
import zipfile
from dataclasses import dataclass
from typing import Literal

import pdfplumber
from docx import Document

MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_PDF_PAGES = 20
# A DOCX is a zip; a tiny one can unzip to gigabytes (a "zip bomb").
MAX_DOCX_UNZIPPED_BYTES = 50 * 1024 * 1024
# Far beyond any real CV; keeps one upload from bloating the database.
MAX_TEXT_CHARS = 50_000
# Less than this and the file is probably a scan or mostly images.
LOW_TEXT_CHARS = 500
LOW_CHARS_PER_PDF_PAGE = 200

FileType = Literal["pdf", "docx"]

LOW_TEXT_WARNING = (
    "We could only read a little text from this file, so some of your CV may be "
    "missing. If it's a scan or mostly images, upload a text-based PDF or a Word file."
)
TRUNCATED_WARNING = "This CV is very long, so only the first part was kept."


class ExtractionError(Exception):
    """The file can't be used. The message is shown to the user."""


class UnsupportedFileType(ExtractionError):
    pass


@dataclass(frozen=True)
class ExtractedCV:
    file_type: FileType
    text: str
    page_count: int | None
    warning: str | None


def detect_file_type(data: bytes) -> FileType:
    if data.startswith(b"%PDF-"):
        return "pdf"
    if data.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                if "word/document.xml" in archive.namelist():
                    return "docx"
        except zipfile.BadZipFile:
            pass
    raise UnsupportedFileType("Upload your CV as a PDF or a Word (.docx) file.")


def _extract_pdf(data: bytes) -> tuple[str, int]:
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            page_count = len(pdf.pages)
            if page_count > MAX_PDF_PAGES:
                raise ExtractionError(
                    f"This PDF has {page_count} pages. Upload a CV of at most {MAX_PDF_PAGES} pages."
                )
            pages = [page.extract_text() or "" for page in pdf.pages]
    except ExtractionError:
        raise
    except Exception as exc:  # pdfminer raises many unrelated types on bad input
        raise ExtractionError(
            "We couldn't open this PDF. If it's password-protected, remove the password and try again."
        ) from exc
    return "\n\n".join(pages), page_count


def _extract_docx(data: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            unzipped = sum(info.file_size for info in archive.infolist())
        if unzipped > MAX_DOCX_UNZIPPED_BYTES:
            raise ExtractionError("This Word file is too large to read.")
        doc = Document(io.BytesIO(data))
    except ExtractionError:
        raise
    except Exception as exc:
        raise ExtractionError("We couldn't open this Word file. Try saving it again and re-uploading.") from exc

    lines = [p.text for p in doc.paragraphs]
    # Many CVs keep skills in tables, which doc.paragraphs skips.
    for table in doc.tables:
        for row in table.rows:
            lines.append(" | ".join(cell.text for cell in row.cells))
    return "\n".join(lines)


def _clean(text: str) -> str:
    # Postgres TEXT can't hold NUL bytes, and some PDFs produce them.
    text = text.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")
    text = "\n".join(line.rstrip() for line in text.split("\n"))
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def extract_cv(data: bytes) -> ExtractedCV:
    """Raise ExtractionError (with a user-facing message) if the file is unusable."""
    file_type = detect_file_type(data)
    if file_type == "pdf":
        raw, page_count = _extract_pdf(data)
    else:
        raw, page_count = _extract_docx(data), None

    text = _clean(raw)
    if not text:
        raise ExtractionError(
            "We couldn't find any text in this file. It may be a scanned image: "
            "upload a text-based PDF or a Word file instead."
        )

    warning = None
    if len(text) > MAX_TEXT_CHARS:
        text, warning = text[:MAX_TEXT_CHARS], TRUNCATED_WARNING
    elif len(text) < LOW_TEXT_CHARS or (
        page_count and len(text) / page_count < LOW_CHARS_PER_PDF_PAGE
    ):
        warning = LOW_TEXT_WARNING
    return ExtractedCV(file_type=file_type, text=text, page_count=page_count, warning=warning)
