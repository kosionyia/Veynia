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


def evidence_found(quote: str, cv_text: str) -> bool:
    # Models like to wrap quotes in quote marks or trail off with "...".
    quote = normalise(quote).strip("\"'“”‘’ ").removesuffix("...").removesuffix("…").strip()
    return bool(quote) and quote in normalise(cv_text)


def build_result(
    requirements: list[Requirement], verdicts: dict[int, dict[str, str]], cv_text: str
) -> tuple[int, list[dict[str, Any]], dict[str, Any]]:
    """(score, per-requirement rows, scoring breakdown). `verdicts` is keyed by
    requirement number (1-based), as the model was shown them."""
    rows: list[dict[str, Any]] = []
    earned = possible = 0.0
    for number, req in enumerate(requirements, start=1):
        verdict = verdicts.get(number)
        status = verdict["status"] if verdict else "missing"
        evidence = verdict["cv_evidence"].strip() if verdict else ""
        reason = verdict["reason"].strip() if verdict else NO_VERDICT

        verified: bool | None = None  # not applicable to "missing"
        if status != "missing":
            verified = evidence_found(evidence, cv_text)
        weight = WEIGHTS[req.importance]
        # An unverified claim earns nothing: the quote may have been made up.
        points = weight * CREDIT[status] if verified is not False else 0.0
        earned += points
        possible += weight
        rows.append({
            "requirement": req.requirement,
            "importance": req.importance,
            "status": status,
            "cv_evidence": evidence if status != "missing" else "",
            "evidence_verified": verified,
            "reason": reason,
            "points": points,
            "max_points": weight,
        })

    score = round(100 * earned / possible) if possible else 0
    scoring = {"weights": WEIGHTS, "credit": CREDIT, "earned": earned, "possible": possible}
    return score, rows, scoring
