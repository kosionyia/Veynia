"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Field, inputClass } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";

import { createApplication, updateApplication, type ApplicationFormState } from "./actions";
import { STATUSES, STATUS_LABELS } from "./status";

export type ApplicationDefaults = {
  role?: string;
  company?: string;
  url?: string | null;
  status?: string;
  applied_on?: string | null;
  follow_up_on?: string | null;
  cv_id?: string | null;
  notes?: string | null;
};

type Props = {
  cvs: { id: string; name: string }[];
  defaults?: ApplicationDefaults;
  /** Edit this application; without it, the form adds one. */
  id?: string;
  /** Adding from a report whose job had no role or company. */
  analysisId?: string;
};

function Labelled({ name, label, error, children }: { name: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {/* Same wrapper as Field's label, so labels in a row line up. */}
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={name} className="text-[13px] font-semibold text-ink-soft">
          {label}
        </label>
      </div>
      {children}
      {error && (
        <p id={`${name}-error`} className="text-sm text-missing">
          {error}
        </p>
      )}
    </div>
  );
}

export function ApplicationForm({ cvs, defaults = {}, id, analysisId }: Props) {
  const action = id ? updateApplication.bind(null, id) : createApplication;
  const [state, formAction] = useActionState<ApplicationFormState, FormData>(action, {});
  // After a failed save, show what was typed rather than the old values.
  const v = { ...defaults, ...state.values };
  const e = state.fieldErrors ?? {};
  // Kept in state (see Select): React resets the form after each action, which
  // would otherwise put the selects back on their first option.
  const [status, setStatus] = useState(v.status ?? "saved");
  const [cvId, setCvId] = useState(v.cv_id ?? "");
  const selectClass = (name: string) => cn(inputClass, "h-12", e[name] ? "border-missing" : "border-line-strong");

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {analysisId && <input type="hidden" name="analysis_id" value={analysisId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role" name="role" required maxLength={200} defaultValue={v.role ?? ""} error={e.role} />
        <Field label="Company" name="company" required maxLength={200} defaultValue={v.company ?? ""} error={e.company} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Labelled name="status" label="Status" error={e.status}>
          <Select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass("status")}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Labelled>
        <Field label="Applied on (optional)" name="applied_on" type="date" defaultValue={v.applied_on ?? ""} error={e.applied_on} />
        <Field label="Follow up on (optional)" name="follow_up_on" type="date" defaultValue={v.follow_up_on ?? ""} error={e.follow_up_on} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Link to the job (optional)" name="url" type="url" maxLength={2048} placeholder="https://" defaultValue={v.url ?? ""} error={e.url} />
        <Labelled name="cv_id" label="CV you sent (optional)" error={e.cv_id}>
          <Select id="cv_id" name="cv_id" value={cvId} onChange={(e) => setCvId(e.target.value)} className={selectClass("cv_id")}>
            <option value="">None</option>
            {cvs.map((cv) => (
              <option key={cv.id} value={cv.id}>
                {cv.name}
              </option>
            ))}
          </Select>
        </Labelled>
      </div>

      <Labelled name="notes" label="Notes (optional)" error={e.notes}>
        <textarea
          id="notes"
          name="notes"
          rows={5}
          maxLength={5000}
          defaultValue={v.notes ?? ""}
          placeholder="Who you spoke to, interview dates, salary range…"
          aria-invalid={e.notes ? true : undefined}
          className={cn(inputClass, "resize-y py-3 leading-relaxed", e.notes ? "border-missing" : "border-line-strong")}
        />
      </Labelled>

      <div className="flex items-center justify-end gap-4 border-t border-line pt-5">
        {state.saved && (
          <p role="status" className="text-sm font-semibold text-match">
            ✓ Saved
          </p>
        )}
        <SubmitButton pendingText="Saving…">{id ? "Save changes" : "Add application"}</SubmitButton>
      </div>
    </form>
  );
}
