"""Turn the model's verdicts into an explainable result.

Ollama decides each verdict; this code decides what counts. Every "matched" or
"partial" needs a quote that really appears in the CV, and the score is plain
arithmetic over the verdicts, so the user can see exactly why they got it.
"""

import re
import unicodedata
from typing import Any

from app.jobs.schemas import Requirement

WEIGHTS = {"required": 2, "preferred": 1}
CREDIT = {"matched": 1.0, "partial": 0.5, "missing": 0.0}

NO_VERDICT = "The analysis gave no verdict for this requirement."


def normalise(text: str) -> str:
    """For comparing quotes: case, spacing, line breaks and bullets don't matter."""
    text = unicodedata.normalize("NFKC", text)
    # PDF bullets often come out as private-use glyphs (U+F0B7), or as •.
    text = re.sub(r"[-•●▪◦]", " ", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def _words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9+#]+", normalise(text))


def _close_subsequence(quote: list[str], cv: list[str]) -> bool:
    """The quote's words appear in the CV in the same order, within a span at most
    twice the quote's length. Small models drop words from a list when quoting it
    ("Git, GitHub, Docker" from "Pytest, Postman, Git, GitHub, Docker"); that
    should count, but words picked from all over the CV shouldn't."""
    window = 2 * len(quote)
    for start, word in enumerate(cv):
        if word != quote[0]:
            continue
        position = start
        for wanted in quote[1:]:
            # Greedy: the earliest next match leaves the most room for the rest.
            try:
                position = cv.index(wanted, position + 1, start + window)
            except ValueError:
                break
        else:
            return True
    return False


def evidence_found(quote: str, cv_text: str) -> bool:
    # Models like to wrap quotes in quote marks or trail off with "...".
    quote = normalise(quote).strip("\"'“”‘’ ").removesuffix("...").removesuffix("…").strip()
    if not quote:
        return False
    if quote in normalise(cv_text):
        return True
    words = _words(quote)
    return bool(words) and _close_subsequence(words, _words(cv_text))


def effective_status(row: dict[str, Any]) -> str:
    """The user's correction if they made one, else the model's verdict."""
    return row.get("user_status") or row["status"]


def rescore(rows: list[dict[str, Any]]) -> tuple[int, dict[str, Any]]:
    """Set each row's points and return (score, scoring breakdown).

    A user correction counts as given: the user knows their own experience.
    A model verdict whose quote isn't in the CV earns nothing: it may be made up.
    """
    earned = possible = 0.0
    for row in rows:
        weight = WEIGHTS[row["importance"]]
        if row.get("user_status"):
            row["points"] = weight * CREDIT[row["user_status"]]
        elif row["evidence_verified"] is False:
            row["points"] = 0.0
        else:
            row["points"] = weight * CREDIT[row["status"]]
        row["max_points"] = weight
        earned += row["points"]
        possible += weight
    score = round(100 * earned / possible) if possible else 0
    return score, {"weights": WEIGHTS, "credit": CREDIT, "earned": earned, "possible": possible}


def build_result(
    requirements: list[Requirement], verdicts: dict[int, dict[str, str]], cv_text: str
) -> tuple[int, list[dict[str, Any]], dict[str, Any]]:
    """(score, per-requirement rows, scoring breakdown). `verdicts` is keyed by
    requirement number (1-based), as the model was shown them."""
    rows: list[dict[str, Any]] = []
    for number, req in enumerate(requirements, start=1):
        verdict = verdicts.get(number)
        status = verdict["status"] if verdict else "missing"
        evidence = verdict["cv_evidence"].strip() if verdict else ""
        reason = verdict["reason"].strip() if verdict else NO_VERDICT
        rows.append({
            "requirement": req.requirement,
            "importance": req.importance,
            "status": status,
            "cv_evidence": evidence if status != "missing" else "",
            # None: nothing to check ("missing").
            "evidence_verified": evidence_found(evidence, cv_text) if status != "missing" else None,
            "reason": reason,
            "user_status": None,
            "user_note": None,
        })
    score, scoring = rescore(rows)
    return score, rows, scoring


# --- rewrite suggestions ----------------------------------------------------

def locate(original: str, cv_text: str) -> tuple[int, int] | None:
    """Where `original` sits in the CV, as (start, end), so a rewrite can replace
    it. Spacing, line breaks and punctuation between words may differ; the words
    themselves must all be there, in order, with nothing left out."""
    words = re.findall(r"[^\W_]+", original)
    if not words:
        return None
    pattern = r"[\W_]*".join(re.escape(word) for word in words)
    match = re.search(pattern, cv_text, flags=re.IGNORECASE)
    if not match:
        return None
    start, end = match.span()
    # The match stops at the last word; take in the original's closing
    # punctuation too, or the rewrite's own full stop doubles it ("API..").
    for char in original.rstrip()[len(original.rstrip().rstrip(".,;:!?)")):]:
        if end < len(cv_text) and cv_text[end] == char:
            end += 1
    return start, end


# Short everyday words a rewrite may add without claiming anything new.
_COMMON = {"and", "the", "for", "with", "using", "use", "used", "built", "build", "including", "experience", "skills", "strong", "solid"}


def new_terms(rewritten: str, original: str, cv_text: str, requirement: str) -> list[str]:
    """Terms in a rewrite that the CV never mentions: things the user would be
    claiming for the first time. Catches names (capitals, digits, symbols like
    C# or Node.js) and words lifted from the job's requirement."""
    known = set(_words(cv_text)) | set(_words(original))
    # Words of 3+ letters only: "on", "in", "of" claim nothing.
    from_job = {word for word in _words(requirement) if len(word) >= 3} - _COMMON
    found: list[str] = []
    for match in re.finditer(r"[A-Za-z0-9][A-Za-z0-9+#./-]*", rewritten):
        term = match.group().rstrip("./-")
        parts = _words(term)
        if not parts or all(part in known for part in parts):
            continue
        # A capital only marks a name mid-sentence: "Strong" starting a sentence
        # isn't one. (So a name starting a sentence is only caught when it's
        # also in the requirement, which is where rewrites borrow terms from.)
        before = rewritten[: match.start()].rstrip()
        sentence_start = not before or before[-1] in ".!?:;•-\n"
        capitalised = term[1:] != term[1:].lower() or (term[0].isupper() and not sentence_start)
        looks_like_a_name = capitalised or any(c.isdigit() or c in "+#." for c in term)
        if (looks_like_a_name or any(part in from_job for part in parts)) and term not in found:
            found.append(term)
    return found


def apply_rewrites(cv_text: str, suggestions: list[dict[str, Any]]) -> str:
    """The CV text with each accepted suggestion's rewrite in place of its original."""
    spans = []
    for suggestion in suggestions:
        if suggestion.get("accepted") and suggestion.get("applicable"):
            span = locate(suggestion["original"], cv_text)
            if span:
                spans.append((*span, suggestion["rewritten"]))
    # Where two overlap, the one starting earlier in the CV wins.
    chosen, last_end = [], -1
    for start, end, rewritten in sorted(spans):
        if start >= last_end:
            chosen.append((start, end, rewritten))
            last_end = end
    # Replace right to left, so the earlier positions stay valid.
    text = cv_text
    for start, end, rewritten in reversed(chosen):
        text = text[:start] + rewritten + text[end:]
    return text
