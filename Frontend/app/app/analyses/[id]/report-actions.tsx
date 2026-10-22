"use client";

import { useState, useTransition } from "react";

import { icons } from "@/components/app/icons";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";

import { deleteReport, rerunReport } from "../actions";

/** Run again and Delete. Both redirect on success; errors show underneath. */
export function ReportActions({ id, cvId, jobId }: { id: string; cvId: string; jobId: string }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await rerunReport(cvId, jobId);
            if (result.error) setError(result.error);
          })
        }
      >
        <icons.refresh className="size-4" />
        {pending ? "Starting…" : "Run again"}
      </Button>
      <ConfirmButton
        label={
          <>
            <icons.trash className="size-4" /> Delete
          </>
        }
        question="Delete this report? Your CV and the job stay."
        confirmLabel="Delete report"
        pendingLabel="Deleting…"
        action={() => deleteReport(id)}
      />
      {error && <p className="w-full text-right text-sm text-missing">{error}</p>}
    </div>
  );
}
