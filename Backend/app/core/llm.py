"""Calls to the local LLM (Ollama) that must come back as validated JSON."""

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import settings


class LLMError(Exception):
    """The model couldn't produce a usable answer. The message is shown to the user."""


# Above this share of the context window, Ollama may have dropped input.
_CONTEXT_SAFETY = 0.95


def chat_json[T: BaseModel](system: str, user: str, schema: type[T]) -> T:
    """Ask the model for JSON matching `schema` and validate it. Retries once on bad JSON.

    Ollama's `format` constrains the output to the schema, but small models can
    still produce something that doesn't validate, so Pydantic checks it again.
    """
    payload = {
        "model": settings.ollama_model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "format": schema.model_json_schema(),
        "stream": False,
        # temperature 0: the same input gives (nearly) the same answer.
        "options": {"temperature": 0, "num_ctx": settings.ollama_num_ctx},
    }
    for attempt in range(2):
        try:
            response = httpx.post(
                f"{settings.ollama_url}/api/chat", json=payload, timeout=settings.ollama_timeout_seconds
            )
            response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise LLMError("The analysis took too long. Try again later.") from exc
        except httpx.HTTPError as exc:
            raise LLMError("The analysis service is unavailable. Try again later.") from exc

        body = response.json()
        if body.get("prompt_eval_count", 0) >= settings.ollama_num_ctx * _CONTEXT_SAFETY:
            raise LLMError("This CV and job are too long to analyse together.")
        try:
            return schema.model_validate_json(body["message"]["content"])
        except (ValidationError, KeyError):
            if attempt == 1:
                raise LLMError("The analysis returned an unreadable answer. Try again.")
    raise AssertionError("unreachable")
