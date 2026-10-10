import uuid

import pytest
from limits import parse
from sqlmodel import select

from app.auth.models import User
from app.cvs import router as cvs_router
from app.cvs import service
from app.cvs.extraction import (
    LOW_TEXT_WARNING,
    MAX_FILE_BYTES,
    MAX_PDF_PAGES,
    MAX_TEXT_CHARS,
    TRUNCATED_WARNING,
    _clean,
)
from app.cvs.models import CV
from tests.auth.test_auth import bearer, login, register
from tests.cvs.files import LONG_PAGE, SKILLS, make_docx, make_pdf, make_zip

DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def signed_in(client, email="ada@example.com") -> dict[str, str]:
    register(client, email=email)
    return bearer(login(client, email=email).json()["access_token"])


@pytest.fixture
def auth(client) -> dict[str, str]:
    return signed_in(client)


def upload(client, headers, data: bytes, filename="Ada CV.pdf", content_type="application/pdf"):
    return client.post("/cvs", headers=headers, files={"file": (filename, data, content_type)})


# --- upload: happy paths ----------------------------------------------------

def test_upload_pdf_extracts_text(client, auth):
    r = upload(client, auth, make_pdf([LONG_PAGE, LONG_PAGE]))
    assert r.status_code == 201
    body = r.json()
    assert body["file_type"] == "pdf"
    assert body["page_count"] == 2
    assert body["name"] == "Ada CV"
    assert body["filename"] == "Ada CV.pdf"
    assert SKILLS in body["text"]
    assert body["char_count"] == len(body["text"])
    assert body["extraction_warning"] is None


def test_upload_docx_includes_tables(client, auth):
    data = make_docx([LONG_PAGE], table=[["Languages", "Python, Go"], ["Cloud", "AWS, Terraform"]])
    r = upload(client, auth, data, filename="cv.docx", content_type=DOCX_TYPE)
    assert r.status_code == 201
    body = r.json()
    assert body["file_type"] == "docx"
    assert body["page_count"] is None
    assert "Cloud | AWS, Terraform" in body["text"]  # skills kept in a table


def test_type_comes_from_contents_not_name(client, auth):
    # A real PDF with a misleading name and content type is still a PDF.
    r = upload(client, auth, make_pdf([LONG_PAGE]), filename="cv.docx", content_type=DOCX_TYPE)
    assert r.status_code == 201
    assert r.json()["file_type"] == "pdf"


def test_little_text_is_saved_with_a_warning(client, auth):
    r = upload(client, auth, make_pdf(["Ada Lovelace\nPython"]))
    assert r.status_code == 201
    assert r.json()["extraction_warning"] == LOW_TEXT_WARNING


def test_path_in_filename_is_dropped(client, auth):
    r = upload(client, auth, make_pdf([LONG_PAGE]), filename="../../etc/cv.pdf")
    assert r.json()["filename"] == "cv.pdf"


@pytest.mark.parametrize(
    ("raw", "safe"),
    [("C:\\Users\\ada\\cv.pdf", "cv.pdf"), ("\x07c\x00v.pdf", "cv.pdf"), ("", "cv"), (None, "cv")],
)
def test_filename_is_made_safe(raw, safe):
    assert service._safe_filename(raw) == safe


# --- upload: rejected files -------------------------------------------------

@pytest.mark.parametrize(
    ("data", "filename"),
    [
        (b"Just some plain text pretending to be a CV", "cv.pdf"),
        (make_zip({"hello.txt": b"not a word file"}), "cv.docx"),
        (b"\xff\xd8\xff\xe0 a JPEG photo of a CV", "cv.jpg"),
    ],
    ids=["text-named-pdf", "zip-named-docx", "image"],
)
def test_rejects_files_that_are_not_pdf_or_docx(client, auth, data, filename):
    r = upload(client, auth, data, filename=filename)
    assert r.status_code == 415
    assert "PDF or a Word" in r.json()["detail"]


def test_rejects_scan_with_no_text(client, auth):
    r = upload(client, auth, make_pdf(["", ""]))
    assert r.status_code == 422
    assert "scanned image" in r.json()["detail"]


def test_rejects_broken_pdf(client, auth):
    r = upload(client, auth, b"%PDF-1.4\nthis is not really a pdf")
    assert r.status_code == 422
    assert "couldn't open this PDF" in r.json()["detail"]


def test_rejects_too_many_pages(client, auth):
    r = upload(client, auth, make_pdf([LONG_PAGE] * (MAX_PDF_PAGES + 1)))
    assert r.status_code == 422
    assert f"at most {MAX_PDF_PAGES} pages" in r.json()["detail"]


def test_rejects_large_file(client, auth):
    r = upload(client, auth, b"%PDF-1.4\n" + b"0" * MAX_FILE_BYTES)
    assert r.status_code == 413


def test_rejects_empty_file(client, auth):
    assert upload(client, auth, b"").status_code == 422


def test_rejects_docx_that_unzips_too_large(client, auth):
    bomb = make_zip({"word/document.xml": b"<w:document/>", "padding.bin": b"\0" * (60 * 1024 * 1024)})
    r = upload(client, auth, bomb, filename="cv.docx", content_type=DOCX_TYPE)
    assert r.status_code == 422
    assert "too large" in r.json()["detail"]


def test_requires_sign_in(client):
    assert upload(client, {}, make_pdf([LONG_PAGE])).status_code == 401
    assert client.get("/cvs").status_code == 401


# --- limits -----------------------------------------------------------------

def test_cv_count_limit(client, auth, monkeypatch):
    monkeypatch.setattr(service, "MAX_CVS_PER_USER", 2)
    for _ in range(2):
        assert upload(client, auth, make_pdf([LONG_PAGE])).status_code == 201
    r = upload(client, auth, make_pdf([LONG_PAGE]))
    assert r.status_code == 409
    assert "up to 2 CVs" in r.json()["detail"]


def test_upload_rate_limit(client, auth, monkeypatch):
    monkeypatch.setattr(cvs_router, "UPLOADS_PER_USER", parse("2/hour"))
    for _ in range(2):
        upload(client, auth, make_pdf([LONG_PAGE]))
    assert upload(client, auth, make_pdf([LONG_PAGE])).status_code == 429


# --- list, view, rename, delete ---------------------------------------------

def test_list_is_newest_first_and_has_no_text(client, auth):
    upload(client, auth, make_pdf([LONG_PAGE]), filename="first.pdf")
    upload(client, auth, make_pdf([LONG_PAGE]), filename="second.pdf")
    r = client.get("/cvs", headers=auth)
    assert r.status_code == 200
    assert [cv["name"] for cv in r.json()] == ["second", "first"]
    assert "text" not in r.json()[0]


def test_view_rename_delete(client, auth):
    cv_id = upload(client, auth, make_pdf([LONG_PAGE])).json()["id"]

    assert SKILLS in client.get(f"/cvs/{cv_id}", headers=auth).json()["text"]

    r = client.patch(f"/cvs/{cv_id}", headers=auth, json={"name": "  Backend CV  "})
    assert r.status_code == 200
    assert r.json()["name"] == "Backend CV"
    assert client.patch(f"/cvs/{cv_id}", headers=auth, json={"name": "  "}).status_code == 422

    assert client.delete(f"/cvs/{cv_id}", headers=auth).status_code == 204
    assert client.get(f"/cvs/{cv_id}", headers=auth).status_code == 404
    assert client.get("/cvs", headers=auth).json() == []


def test_other_users_cvs_are_invisible(client, auth):
    cv_id = upload(client, auth, make_pdf([LONG_PAGE])).json()["id"]
    grace = signed_in(client, email="grace@example.com")

    assert client.get("/cvs", headers=grace).json() == []
    # 404, not 403: don't even confirm the CV exists.
    assert client.get(f"/cvs/{cv_id}", headers=grace).status_code == 404
    assert client.patch(f"/cvs/{cv_id}", headers=grace, json={"name": "mine"}).status_code == 404
    assert client.delete(f"/cvs/{cv_id}", headers=grace).status_code == 404
    assert client.get(f"/cvs/{cv_id}", headers=auth).status_code == 200


def test_unknown_cv_is_404(client, auth):
    assert client.get(f"/cvs/{uuid.uuid4()}", headers=auth).status_code == 404


def test_deleting_a_user_deletes_their_cvs(client, auth, session):
    upload(client, auth, make_pdf([LONG_PAGE]))
    session.delete(session.exec(select(User)).one())
    session.commit()
    assert session.exec(select(CV)).all() == []


# --- text cleanup -----------------------------------------------------------

def test_clean_removes_nul_bytes_and_extra_blank_lines():
    assert _clean("Ada\x00 \r\nPython   \n\n\n\n\nGo\r") == "Ada\nPython\n\nGo"


def test_very_long_text_is_cut_with_a_warning(client, auth):
    long_docx = make_docx(["Python and PostgreSQL experience. " * 200] * 10)
    r = upload(client, auth, long_docx, filename="cv.docx", content_type=DOCX_TYPE)
    body = r.json()
    assert body["char_count"] == MAX_TEXT_CHARS
    assert body["extraction_warning"] == TRUNCATED_WARNING
