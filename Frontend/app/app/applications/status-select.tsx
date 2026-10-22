"use client";

import { useState, useTransition } from "react";

import { cn } from "@/lib/cn";
import type { ApplicationStatus } from "@/lib/types";

import { setApplicationStatus } from "./actions";
import { STATUSES, STATUS_LABELS, STATUS_STYLES } from "./status";

/** The status as a coloured menu: change it right from the list. */
export function StatusSelect({ id, status, label }: { id: string; status: ApplicationStatus; label: string }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid justify-items-end gap-1">
      <select
        aria-label={label}
        value={status}
        disabled={pending}
        onChange={(e) =>
          startTransition(async () => {
            const result = await setApplicationStatus(id, e.target.value as ApplicationStatus);
            if (result.error) setError(result.error);
          })
        }
        className={cn(
          "h-8 cursor-pointer rounded-lg border-0 pr-7 pl-3 text-xs font-semibold focus:ring-4 focus:ring-brand/15 focus:outline-none",
          STATUS_STYLES[status],
          pending && "opacity-50",
        )}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-missing">{error}</p>}
    </div>
  );
}
