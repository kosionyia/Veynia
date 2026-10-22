"use client";

import { useState, useTransition } from "react";

import { icons } from "@/components/app/icons";
import { Button } from "@/components/ui/button";

import { trackFromReport } from "../../applications/actions";

/** Start tracking an application for this report's job. */
export function TrackButton({ analysisId }: { analysisId: string }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-1">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await trackFromReport(analysisId);
            if (result.error) setError(result.error);
          })
        }
      >
        <icons.applications className="size-4" />
        {pending ? "Adding…" : "Track this application"}
      </Button>
      {error && <p className="text-sm text-missing">{error}</p>}
    </div>
  );
}
