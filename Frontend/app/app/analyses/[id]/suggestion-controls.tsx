"use client";

import { useState, useTransition } from "react";

import { icons } from "@/components/app/icons";
import { Button } from "@/components/ui/button";

import { requestSuggestions, setSuggestionAccepted } from "../actions";

/** Asks for (or redoes) the rewrite suggestions. */
export function RequestSuggestionsButton({ analysisId, redo }: { analysisId: string; redo?: boolean }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-1.5">
      <Button
        variant={redo ? "secondary" : "primary"}
        size={redo ? "sm" : "md"}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await requestSuggestions(analysisId);
            if (result.error) setError(result.error);
          })
        }
      >
        <icons.sparkles className="size-4" />
        {pending ? "Asking…" : redo ? "Suggest again" : "Suggest CV rewrites"}
      </Button>
      {error && <p className="text-sm text-missing">{error}</p>}
    </div>
  );
}

/** Keep (or drop) one rewrite for the downloadable CV. */
export function AcceptToggle({ analysisId, number, accepted }: { analysisId: string; number: number; accepted: boolean }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-1">
      <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink-soft">
        <input
          type="checkbox"
          checked={accepted}
          disabled={pending}
          onChange={(e) =>
            startTransition(async () => {
              const result = await setSuggestionAccepted(analysisId, number, e.target.checked);
              if (result.error) setError(result.error);
            })
          }
          className="size-4 accent-[var(--color-brand)]"
        />
        Use this in my rewritten CV
      </label>
      {error && <p className="text-sm text-missing">{error}</p>}
    </div>
  );
}
