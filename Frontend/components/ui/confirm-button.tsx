"use client";

import { useState, useTransition } from "react";

import { Button } from "./button";

type Result = { error?: string } | undefined | void;

/** A button that asks "Are you sure?" in place before running the action. */
export function ConfirmButton({
  label,
  question,
  confirmLabel,
  pendingLabel,
  action,
}: {
  label: React.ReactNode;
  question: string;
  confirmLabel: string;
  pendingLabel: string;
  action: () => Promise<Result>;
}) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (!asking) {
    return (
      <Button variant="danger" size="sm" onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }
  return (
    <div role="group" aria-label={question} className="flex flex-wrap items-center gap-2 rounded-xl border border-missing/25 bg-missing-soft px-3 py-1.5">
      <span className="text-sm text-ink-soft">{question}</span>
      <Button
        size="sm"
        variant="danger"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await action();
            if (result?.error) setError(result.error);
          })
        }
      >
        {pending ? pendingLabel : confirmLabel}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setAsking(false)}>
        Cancel
      </Button>
      {error && <p className="w-full text-sm text-missing">{error}</p>}
    </div>
  );
}
