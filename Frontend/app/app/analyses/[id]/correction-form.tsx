"use client";

import { useState, useTransition } from "react";

import { icons } from "@/components/app/icons";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { Verdict } from "@/lib/types";

import { correctRequirement } from "../actions";
import { VERDICTS } from "../status";

type Props = { analysisId: string; number: number; modelStatus: Verdict; userStatus: Verdict | null; userNote: string | null };

/** "Correct this" on a requirement: pick the right verdict, say why, save. */
export function CorrectionForm({ analysisId, number, modelStatus, userStatus, userNote }: Props) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Verdict>(userStatus ?? modelStatus);
  const [note, setNote] = useState(userNote ?? "");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const save = (status: Verdict | null) =>
    startTransition(async () => {
      const result = await correctRequirement(analysisId, number, status, status ? note : "");
      if (result.error) setError(result.error);
      else setOpen(false);
    });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted underline-offset-4 hover:text-brand hover:underline"
      >
        <icons.pencil className="size-3.5" />
        {userStatus ? "Edit your correction" : "Not right? Correct it"}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-canvas p-4">
      <div role="radiogroup" aria-label="The right verdict" className="flex flex-wrap gap-1.5">
        {(Object.keys(VERDICTS) as Verdict[]).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={choice === value}
            onClick={() => setChoice(value)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
              choice === value ? cn("border-transparent", VERDICTS[value].soft) : "border-line bg-surface text-muted hover:text-ink",
            )}
          >
            {VERDICTS[value].label}
          </button>
        ))}
      </div>
      <textarea
        aria-label="Why (optional)"
        placeholder="Why? For example: “I used Docker every day during my internship”"
        value={note}
        maxLength={500}
        rows={2}
        onChange={(e) => setNote(e.target.value)}
        className={cn(inputClass, "border-line-strong py-2.5 text-sm")}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => save(choice)}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {userStatus && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => save(null)}>
            Go back to Veynia&apos;s verdict
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-sm text-missing">{error}</p>}
    </div>
  );
}
