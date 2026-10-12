import httpcore
import httpx
import pytest

from app.jobs import scraping, service
from app.jobs.scraping import SafeNetworkBackend, ScrapeError, _is_public, check_url, extract_job, fetch_html
from tests.cvs.test_cvs import signed_in

JOB_TEXT = (
    "Backend Engineer. We need strong Python and FastAPI skills, solid PostgreSQL, "
    "and experience with Docker. You will design REST APIs and work with the product team. "
    "Kubernetes and AWS experience are a plus. Good written communication is required."
)

JOB_PAGE = f"""<html><head><title>Careers | Acme</title>
<script type="application/ld+json">
{{"@context": "https://schema.org", "@type": "JobPosting", "title": "Backend Engineer",
  "hiringOrganization": {{"@type": "Organization", "name": "Acme Labs"}},
  "description": "<p>{JOB_TEXT}</p><ul><li>Python</li><li>Docker</li></ul>"}}
</script></head><body><nav>Home | Jobs</nav><p>Apply now</p></body></html>"""


@pytest.fixture
def auth(client):
    return signed_in(client)


def post_job(client, headers, **data):
    return client.post("/jobs", headers=headers, json=data)


@pytest.fixture
def no_fetch(monkeypatch):
    def fail(url):
        raise AssertionError("must not fetch")
    monkeypatch.setattr(scraping, "scrape_job", fail)


# --- pasted -----------------------------------------------------------------

def test_paste_job(client, auth, no_fetch):
    r = post_job(client, auth, title="  Backend Engineer ", company="Acme", text=JOB_TEXT)
    assert r.status_code == 201
    body = r.json()
    assert body["source"] == "pasted"
    assert body["title"] == "Backend Engineer"
    assert body["text"] == JOB_TEXT
    assert body["requirements"] is None  # extracted later, by the first analysis


def test_paste_with_link_keeps_link_without_fetching(client, auth, no_fetch):
    r = post_job(client, auth, text=JOB_TEXT, url="https://jobs.example.com/123")
    assert r.status_code == 201
    assert r.json()["url"] == "https://jobs.example.com/123"
    assert r.json()["source"] == "pasted"


def test_needs_text_or_link(client, auth):
    assert post_job(client, auth, title="Engineer").status_code == 422
    assert post_job(client, auth, text="   ", url="").status_code == 422


def test_rejects_too_short(client, auth):
    r = post_job(client, auth, text="Python developer wanted.")
    assert r.status_code == 422
    assert "too short" in r.json()["detail"]


def test_long_text_is_cut(client, auth):
    r = post_job(client, auth, text=JOB_TEXT * 200)
    assert r.json()["char_count"] == service.MAX_JOB_CHARS


# --- from a link ------------------------------------------------------------

def test_link_uses_structured_job_data(client, auth, monkeypatch):
    monkeypatch.setattr(scraping, "fetch_html", lambda url: (JOB_PAGE, "https://jobs.example.com/final"))
    r = post_job(client, auth, url="https://jobs.example.com/123")
    assert r.status_code == 201
    body = r.json()
    assert (body["source"], body["title"], body["company"]) == ("link", "Backend Engineer", "Acme Labs")
    assert body["url"] == "https://jobs.example.com/final"  # after redirects
    assert "FastAPI" in body["text"] and "Apply now" not in body["text"]


def test_typed_title_beats_page_title(client, auth, monkeypatch):
    monkeypatch.setattr(scraping, "fetch_html", lambda url: (JOB_PAGE, url))
    r = post_job(client, auth, url="https://jobs.example.com/1", title="My title")
    assert r.json()["title"] == "My title"
    assert r.json()["company"] == "Acme Labs"


def test_page_without_structured_data_uses_visible_text():
    html = f"<html><head><title>Job</title><script>var x=1</script></head><body><nav>Menu</nav><main><h1>Engineer</h1><p>{JOB_TEXT}</p></main><footer>Cookies</footer></body></html>"
    text, title, company = extract_job(html)
    assert "FastAPI" in text and "Menu" not in text and "Cookies" not in text and "var x" not in text
    assert (title, company) == ("Job", None)


def test_link_with_too_little_text_suggests_pasting(client, auth, monkeypatch):
    monkeypatch.setattr(scraping, "fetch_html", lambda url: ("<html><body>Sign in to see this job</body></html>", url))
    r = post_job(client, auth, url="https://www.linkedin.com/jobs/view/1")
    assert r.status_code == 422
    assert "Paste the job description instead" in r.json()["detail"]


# --- link safety (SSRF) -----------------------------------------------------

@pytest.mark.parametrize(
    "url",
    ["ftp://example.com/job", "file:///etc/passwd", "http://user:pw@example.com/", "http://example.com:5432/", "not a link", "http:///nohost"],
)
def test_check_url_rejects(url):
    with pytest.raises(ScrapeError):
        check_url(url)


@pytest.mark.parametrize(
    ("ip", "public"),
    [
        ("8.8.8.8", True),
        ("2606:4700:4700::1111", True),
        ("127.0.0.1", False),
        ("10.0.0.5", False),
        ("172.18.0.3", False),  # a Docker network address (postgres, redis, ollama)
        ("192.168.1.10", False),
        ("169.254.169.254", False),  # cloud metadata service
        ("100.64.0.1", False),  # carrier-grade NAT
        ("::1", False),
        ("::ffff:127.0.0.1", False),  # IPv4 loopback written as IPv6
        ("fd00::1", False),
        ("0.0.0.0", False),
    ],
)
def test_only_public_ips_are_allowed(ip, public):
    assert _is_public(ip) is public


@pytest.mark.parametrize("host", ["127.0.0.1", "localhost", "169.254.169.254", "::1"])
def test_backend_refuses_to_connect_to_private_hosts(host):
    with pytest.raises(httpcore.ConnectError, match="not a public address"):
        SafeNetworkBackend().connect_tcp(host, 80)


def test_fetch_of_local_address_is_blocked():
    # Port 8000 is our own API; the request must never be made.
    with pytest.raises(ScrapeError, match="can't be reached"):
        fetch_html("http://127.0.0.1/")


def _mock_client(monkeypatch, handler):
    monkeypatch.setattr(scraping, "_safe_client", lambda: httpx.Client(transport=httpx.MockTransport(handler)))


def test_each_redirect_is_checked(monkeypatch):
    _mock_client(monkeypatch, lambda req: httpx.Response(302, headers={"location": "file:///etc/passwd"}))
    with pytest.raises(ScrapeError, match="http:// or https://"):
        fetch_html("https://jobs.example.com/")


def test_redirect_loop_stops(monkeypatch):
    _mock_client(monkeypatch, lambda req: httpx.Response(302, headers={"location": "/again"}))
    with pytest.raises(ScrapeError, match="redirects too many times"):
        fetch_html("https://jobs.example.com/")


def test_blocked_site_message(monkeypatch):
    _mock_client(monkeypatch, lambda req: httpx.Response(999))
    with pytest.raises(ScrapeError, match="blocks automatic access"):
        fetch_html("https://www.linkedin.com/jobs/view/1")


def test_non_html_is_refused(monkeypatch):
    _mock_client(monkeypatch, lambda req: httpx.Response(200, headers={"content-type": "application/pdf"}, content=b"%PDF"))
    with pytest.raises(ScrapeError, match="isn't a web page"):
        fetch_html("https://jobs.example.com/job.pdf")


def test_huge_page_is_refused(monkeypatch):
    big = b"<p>" + b"x" * (scraping.MAX_PAGE_BYTES + 10)
    _mock_client(monkeypatch, lambda req: httpx.Response(200, headers={"content-type": "text/html"}, content=big))
    with pytest.raises(ScrapeError, match="too large"):
        fetch_html("https://jobs.example.com/")


def test_redirect_is_followed(monkeypatch):
    def handler(req):
        if req.url.path == "/start":
            return httpx.Response(301, headers={"location": "/final"})
        return httpx.Response(200, headers={"content-type": "text/html; charset=utf-8"}, text="<p>ok</p>")
    _mock_client(monkeypatch, handler)
    assert fetch_html("https://jobs.example.com/start") == ("<p>ok</p>", "https://jobs.example.com/final")


# --- list, get, delete ------------------------------------------------------

def test_list_get_delete_and_ownership(client, auth, no_fetch):
    job_id = post_job(client, auth, text=JOB_TEXT, title="Backend").json()["id"]
    listed = client.get("/jobs", headers=auth).json()
    assert [j["title"] for j in listed] == ["Backend"] and "text" not in listed[0]

    grace = signed_in(client, email="grace@example.com")
    assert client.get(f"/jobs/{job_id}", headers=grace).status_code == 404
    assert client.delete(f"/jobs/{job_id}", headers=grace).status_code == 404

    assert client.delete(f"/jobs/{job_id}", headers=auth).status_code == 204
    assert client.get(f"/jobs/{job_id}", headers=auth).status_code == 404
