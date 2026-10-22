"use client";

import { useActionState, useState } from "react";

import { inputClass } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";

import { matchJob, type MatchState } from "../actions";

export function MatchForm({ jobId, cvs }: { jobId: string; cvs: { id: string; name: string }[] }) {
  const [state, action] = useActionState<MatchState, FormData>(matchJob.bind(null, jobId), {});
  // Controlled, so a failed submit (which resets the form) keeps the chosen CV.
  const [cvId, setCvId] = useState(cvs[0]?.id ?? "");
  return (
    <form action={action} className="space-y-3">
      <label htmlFor="cv_id" className="text-[13px] font-semibold text-ink-soft">
        Your CV
      </label>
      <Select id="cv_id" name="cv_id" value={cvId} onChange={(e) => setCvId(e.target.value)} className={cn(inputClass, "h-12 border-line-strong")}>
        {cvs.map((cv) => (
          <option key={cv.id} value={cv.id}>
            {cv.name}
          </option>
        ))}
      </Select>
      {state.error && <p className="text-sm text-missing">{state.error}</p>}
      <SubmitButton className="w-full" pendingText="Starting…">
        Get a match report →
      </SubmitButton>
    </form>
  );
}
