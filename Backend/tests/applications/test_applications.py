from datetime import timedelta

import pytest
from sqlmodel import select

from app.applications.models import Application
from app.auth.models import User
from app.core.time import utc_now
from tests.analysis.test_analysis import new_cv
from tests.analysis.test_results import done, fake_llm  # noqa: F401  (fixtures)
from tests.cvs.test_cvs import signed_in

TODAY = utc_now().date().isoformat()


@pytest.fixture
def auth(client):
    return signed_in(client)


def create(client, headers, **data):
    return client.post("/applications", headers=headers, json=data)


def patch(client, headers, application_id, **data):
    return client.patch(f"/applications/{application_id}", headers=headers, json=data)


def by_hand(client, headers, **data):
    return create(client, headers, company="Acme", role="Backend Engineer", **data).json()


# --- creating ---------------------------------------------------------------

def test_create_by_hand(client, auth):
    r = create(client, auth, company=" Acme ", role="Backend Engineer", url="https://acme.example/jobs/1", notes="Referral from Ada")
    assert r.status_code == 201
    body = r.json()
    assert (body["company"], body["role"], body["status"]) == ("Acme", "Backend Engineer", "saved")
    assert body["applied_on"] is None  # saved, not applied
    assert [h["status"] for h in body["history"]] == ["saved"]
    assert (body["analysis_id"], body["cv_name"], body["match_score"]) == (None, None, None)


def test_applied_gets_todays_date_unless_given(client, auth):
    assert by_hand(client, auth, status="applied")["applied_on"] == TODAY
    assert by_hand(client, auth, status="applied", applied_on="2026-09-01")["applied_on"] == "2026-09-01"
    assert by_hand(client, auth, status="rejected")["applied_on"] is None  # may never have applied


@pytest.mark.parametrize("missing", ["company", "role"])
def test_by_hand_needs_company_and_role(client, auth, missing):
    data = {"company": "Acme", "role": "Engineer"}
    del data[missing]
    r = create(client, auth, **data)
    assert r.status_code == 422 and r.json()["detail"] == "Add the company and the role."


@pytest.mark.parametrize("url", ["javascript:alert(1)", "ftp://acme.example", "acme.example/jobs"])
def test_only_web_links(client, auth, url):
    assert create(client, auth, company="Acme", role="Engineer", url=url).status_code == 422


def test_create_from_a_result(client, auth, done):
    r = create(client, auth, analysis_id=done)
    assert r.status_code == 201
    body = r.json()
    # From the result's job and CV (see tests/analysis: "Backend" at "Acme", score 43).
    assert (body["company"], body["role"], body["cv_name"], body["match_score"]) == ("Acme", "Backend", "cv", 43)
    assert body["analysis_id"] == done and body["job_id"] and body["cv_id"]


def test_typed_details_beat_the_results(client, auth, done):
    body = create(client, auth, analysis_id=done, role="Senior Backend Engineer").json()
    assert (body["company"], body["role"]) == ("Acme", "Senior Backend Engineer")


def test_a_result_is_tracked_once(client, auth, done):
    first = create(client, auth, analysis_id=done).json()["id"]
    r = create(client, auth, analysis_id=done)
    assert r.status_code == 409
    assert r.json()["detail"]["application_id"] == first


def test_cannot_use_someone_elses_result_or_cv(client, auth, done):
    grace = signed_in(client, email="grace@example.com")
    assert create(client, grace, analysis_id=done).json()["detail"] == "Result not found"
    ada_cv = new_cv(client, auth)
    assert create(client, grace, company="X", role="Y", cv_id=ada_cv).json()["detail"] == "CV not found"


# --- updating ---------------------------------------------------------------

def test_status_changes_are_recorded(client, auth):
    application_id = by_hand(client, auth)["id"]
    body = patch(client, auth, application_id, status="applied").json()
    assert body["applied_on"] == TODAY
    body = patch(client, auth, application_id, status="interviewing").json()
    body = patch(client, auth, application_id, status="interviewing", notes="Round 2 on Friday").json()  # same status
    assert [h["status"] for h in body["history"]] == ["saved", "applied", "interviewing"]
    assert body["notes"] == "Round 2 on Friday"


def test_only_sent_fields_change(client, auth):
    application_id = by_hand(client, auth, follow_up_on="2026-11-01", notes="Call back")["id"]
    body = patch(client, auth, application_id, role="Platform Engineer").json()
    assert (body["role"], body["company"], body["follow_up_on"], body["notes"]) == (
        "Platform Engineer", "Acme", "2026-11-01", "Call back",
    )
    body = patch(client, auth, application_id, follow_up_on=None, notes="  ").json()  # clear both
    assert (body["follow_up_on"], body["notes"]) == (None, None)


@pytest.mark.parametrize("field", ["company", "role", "status"])
def test_required_fields_cannot_be_cleared(client, auth, field):
    application_id = by_hand(client, auth)["id"]
    assert patch(client, auth, application_id, **{field: None}).status_code == 422


def test_bad_values_are_rejected(client, auth):
    application_id = by_hand(client, auth)["id"]
    assert patch(client, auth, application_id, status="hired").status_code == 422
    assert patch(client, auth, application_id, notes="x" * 5001).status_code == 422
    assert patch(client, auth, application_id, applied_on="last week").status_code == 422


# --- listing and stats ------------------------------------------------------

def test_list_filter_and_order(client, auth):
    first = by_hand(client, auth)["id"]
    second = by_hand(client, auth, status="applied")["id"]
    patch(client, auth, first, notes="touched")  # most recently updated now
    assert [a["id"] for a in client.get("/applications", headers=auth).json()] == [first, second]
    assert [a["id"] for a in client.get("/applications?status=applied", headers=auth).json()] == [second]
    assert client.get("/applications?status=hired", headers=auth).status_code == 422


def test_stats(client, auth):
    yesterday = (utc_now().date() - timedelta(days=1)).isoformat()
    by_hand(client, auth)
    by_hand(client, auth, status="applied", follow_up_on=yesterday)  # due
    by_hand(client, auth, status="interviewing", follow_up_on=TODAY)  # due
    by_hand(client, auth, status="offer", follow_up_on=yesterday)  # finished: not a reminder
    by_hand(client, auth, status="applied", follow_up_on="2099-01-01")  # not yet
    body = client.get("/applications/stats", headers=auth).json()
    assert body["total"] == 5
    assert body["by_status"] == {"saved": 1, "applied": 2, "interviewing": 1, "offer": 1, "rejected": 0, "withdrawn": 0}
    assert body["follow_ups_due"] == 2


# --- deleting and ownership -------------------------------------------------

def test_get_patch_delete_are_private(client, auth):
    application_id = by_hand(client, auth)["id"]
    grace = signed_in(client, email="grace@example.com")
    assert client.get(f"/applications/{application_id}", headers=grace).status_code == 404
    assert patch(client, grace, application_id, status="offer").status_code == 404
    assert client.delete(f"/applications/{application_id}", headers=grace).status_code == 404
    assert client.get("/applications", headers=grace).json() == []

    assert client.delete(f"/applications/{application_id}", headers=auth).status_code == 204
    assert client.get(f"/applications/{application_id}", headers=auth).status_code == 404


def test_deleting_the_result_cv_and_job_keeps_the_application(client, auth, done):
    body = create(client, auth, analysis_id=done, status="applied").json()
    client.delete(f"/analyses/{done}", headers=auth)
    client.delete(f"/cvs/{body['cv_id']}", headers=auth)
    client.delete(f"/jobs/{body['job_id']}", headers=auth)

    after = client.get(f"/applications/{body['id']}", headers=auth).json()
    assert (after["analysis_id"], after["cv_id"], after["job_id"]) == (None, None, None)
    assert (after["cv_name"], after["match_score"]) == (None, None)
    assert (after["company"], after["role"], after["status"]) == ("Acme", "Backend", "applied")


def test_deleting_the_user_deletes_their_applications(client, auth, session):
    by_hand(client, auth)
    session.delete(session.exec(select(User)).one())
    session.commit()
    assert session.exec(select(Application)).all() == []
