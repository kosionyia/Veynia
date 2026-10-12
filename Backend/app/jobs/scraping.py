"""Fetch a job post from a link the user pasted.

Our server fetches a URL chosen by the user, so without care a user could make
it fetch internal addresses: Postgres, Redis, Ollama, the Docker network, or a
cloud metadata service (SSRF). The defences:

- Only http/https, default ports, no user:password@ in the URL.
- Every IP is checked at the moment of connecting (SafeNetworkBackend), so a
  redirect or a DNS name that resolves differently the second time ("DNS
  rebinding") can't sneak a private address past the check.
- Redirects are followed by hand, each hop checked again, at most 5.
- Size and time are capped; only HTML is read.
"""

import ipaddress
import json
import socket
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin, urlsplit

import httpcore
import httpx
from bs4 import BeautifulSoup

MAX_REDIRECTS = 5
MAX_PAGE_BYTES = 2 * 1024 * 1024
TIMEOUT = httpx.Timeout(15.0, connect=5.0)
# Some sites refuse requests without a browser-like user agent.
USER_AGENT = "Mozilla/5.0 (compatible; ResumeRadar/1.0; job description fetcher)"

PASTE_INSTEAD = "Paste the job description instead."


class ScrapeError(Exception):
    """The link can't be used. The message is shown to the user."""


@dataclass(frozen=True)
class ScrapedJob:
    text: str
    title: str | None
    company: str | None
    final_url: str


# --- SSRF protection --------------------------------------------------------

def _is_public(ip: str) -> bool:
    address = ipaddress.ip_address(ip)
    # An IPv6 form of an IPv4 address (::ffff:127.0.0.1) is judged as IPv4.
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        address = address.ipv4_mapped
    # is_global is False for private, loopback, link-local (incl. the
    # 169.254.169.254 metadata service), reserved and shared ranges.
    return address.is_global and not address.is_multicast


class SafeNetworkBackend(httpcore.SyncBackend):
    """Resolves the host itself and only connects to public IPs."""

    def connect_tcp(self, host, port, timeout=None, local_address=None, socket_options=None):
        try:
            infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        except socket.gaierror as exc:
            raise httpcore.ConnectError(f"Can't resolve {host}") from exc
        ips = [info[4][0] for info in infos]
        # Every address must be public, or the OS could pick a private one.
        if not ips or not all(_is_public(ip) for ip in ips):
            raise httpcore.ConnectError(f"{host} is not a public address")
        # Connect to the exact IP that was checked. TLS still verifies the
        # certificate against the hostname.
        return super().connect_tcp(ips[0], port, timeout, local_address, socket_options)


def _safe_client() -> httpx.Client:
    transport = httpx.HTTPTransport()
    # httpx has no public option for the network backend, so swap the pool.
    transport._pool = httpcore.ConnectionPool(
        ssl_context=httpx.create_ssl_context(), network_backend=SafeNetworkBackend()
    )
    # trust_env=False: ignore HTTP_PROXY etc., which would bypass the IP check.
    return httpx.Client(
        transport=transport, timeout=TIMEOUT, follow_redirects=False, trust_env=False,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
    )


def check_url(url: str) -> str:
    """Raise ScrapeError unless the URL is an acceptable public web address."""
    try:
        parts = urlsplit(url.strip())
        port = parts.port
    except ValueError as exc:
        raise ScrapeError("That doesn't look like a valid link.") from exc
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ScrapeError("Use a link starting with http:// or https://.")
    if parts.username or parts.password:
        raise ScrapeError("Links with a username or password aren't supported.")
    if port not in (None, 80, 443):
        raise ScrapeError("Links to unusual ports aren't supported.")
    return url.strip()


# --- fetching ---------------------------------------------------------------

def fetch_html(url: str) -> tuple[str, str]:
    """Return (html, final_url). Follows redirects by hand, checking each hop."""
    url = check_url(url)
    with _safe_client() as client:
        for _ in range(MAX_REDIRECTS + 1):
            try:
                with client.stream("GET", url) as response:
                    if response.is_redirect:
                        url = check_url(urljoin(url, response.headers.get("location", "")))
                        continue
                    if response.status_code in (401, 403, 429, 999):
                        raise ScrapeError(f"That site blocks automatic access. {PASTE_INSTEAD}")
                    if response.status_code >= 400:
                        raise ScrapeError(f"The page couldn't be loaded ({response.status_code}). {PASTE_INSTEAD}")
                    content_type = response.headers.get("content-type", "")
                    if "html" not in content_type:
                        raise ScrapeError(f"That link isn't a web page. {PASTE_INSTEAD}")
                    data = b""
                    for chunk in response.iter_bytes():
                        data += chunk
                        if len(data) > MAX_PAGE_BYTES:
                            raise ScrapeError(f"That page is too large. {PASTE_INSTEAD}")
                    return data.decode(response.encoding or "utf-8", errors="replace"), url
            except httpx.TimeoutException as exc:
                raise ScrapeError(f"That site took too long to answer. {PASTE_INSTEAD}") from exc
            except httpx.ConnectError as exc:
                raise ScrapeError(f"That link can't be reached. {PASTE_INSTEAD}") from exc
            except httpx.HTTPError as exc:
                raise ScrapeError(f"That page couldn't be loaded. {PASTE_INSTEAD}") from exc
    raise ScrapeError(f"That link redirects too many times. {PASTE_INSTEAD}")


# --- HTML to text -----------------------------------------------------------

def _html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg", "nav", "header", "footer", "form", "iframe"]):
        tag.decompose()
    lines = (line.strip() for line in soup.get_text("\n").splitlines())
    return "\n".join(line for line in lines if line)


def _job_postings(soup: BeautifulSoup) -> list[dict[str, Any]]:
    """schema.org JobPosting entries in the page's JSON-LD."""
    found: list[dict[str, Any]] = []

    def walk(node: Any) -> None:
        if isinstance(node, list):
            for item in node:
                walk(item)
        elif isinstance(node, dict):
            kind = node.get("@type")
            if kind == "JobPosting" or (isinstance(kind, list) and "JobPosting" in kind):
                found.append(node)
            walk(node.get("@graph", []))

    for script in soup.find_all("script", type="application/ld+json"):
        try:
            walk(json.loads(script.string or ""))
        except json.JSONDecodeError:
            continue
    return found


def extract_job(html: str) -> tuple[str, str | None, str | None]:
    """(text, title, company). Prefers the structured JobPosting data that most
    job boards embed for Google; falls back to the page's visible text."""
    soup = BeautifulSoup(html, "html.parser")
    for posting in _job_postings(soup):
        description = posting.get("description")
        if isinstance(description, str) and description.strip():
            org = posting.get("hiringOrganization")
            company = org.get("name") if isinstance(org, dict) else None
            title = posting.get("title")
            return (
                _html_to_text(description),
                title if isinstance(title, str) else None,
                company if isinstance(company, str) else None,
            )
    title_tag = soup.find("title")
    return _html_to_text(html), (title_tag.get_text(strip=True) if title_tag else None), None


def scrape_job(url: str) -> ScrapedJob:
    html, final_url = fetch_html(url)
    text, title, company = extract_job(html)
    return ScrapedJob(text=text, title=title, company=company, final_url=final_url)
