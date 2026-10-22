"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Field, inputClass } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";

import { startReport, type NewReportState } from "../actions";

const MODES = [
  { value: "paste", label: "Paste the text" },
  { value: "link", label: "From a link" },
] as const;

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink-soft">
      {children}
    </label>
  );
}

function Problem({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-missing">
      {message}
    </p>
  ) : null;
}

export function NewReportForm({ cvs, selected }: { cvs: { id: string; name: string }[]; selected?: string }) {
  const [state, action] = useActionState<NewReportState, FormData>(startReport, {});
  const values = state.values;
  const errors = state.fieldErrors;
  const [mode, setMode] = useState<"paste" | "link">(values?.mode === "link" ? "link" : "paste");
  // Kept in state (see Select): a failed submit resets the form, which would
  // otherwise jump back to the first CV.
  const [cvId, setCvId] = useState(values?.cv_id ?? selected ?? cvs[0]?.id ?? "");

  return (
    <form action={action} className="space-y-6" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div className="space-y-1.5">
        <Label htmlFor="cv_id">Your CV</Label>
        <Select
          id="cv_id"
          name="cv_id"
          required
          value={cvId}
          onChange={(e) => setCvId(e.target.value)}
          aria-invalid={errors?.cv_id ? true : undefined}
          aria-describedby={errors?.cv_id ? "cv_id-error" : undefined}
          className={cn(inputClass, "h-12", errors?.cv_id ? "border-missing" : "border-line-strong")}
        >
          {cvs.map((cv) => (
            <option key={cv.id} value={cv.id}>
              {cv.name}
            </option>
          ))}
        </Select>
        <Problem id="cv_id-error" message={errors?.cv_id} />
      </div>

      <fieldset className="space-y-4">
        <legend className="text-[13px] font-semibold text-ink-soft">The job</legend>
        <input type="hidden" name="mode" value={mode} />
        <div role="group" aria-label="How to add the job" className="mt-1.5 grid grid-cols-2 rounded-xl bg-sunken p-1 sm:w-80">
          {MODES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className="rounded-lg py-2 text-sm font-semibold text-muted transition-colors hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-[0_1px_3px_rgb(12_26_23/0.12)]"
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "paste" ? (
          <div className="space-y-1.5">
            <Label htmlFor="text">Job description</Label>
            <textarea
              id="text"
              name="text"
              rows={12}
              defaultValue={values?.text}
              placeholder="Paste the whole job post: what you'd do, what they're looking for, the nice-to-haves…"
              aria-invalid={errors?.text ? true : undefined}
              aria-describedby={errors?.text ? "text-error" : undefined}
              className={cn(inputClass, "min-h-48 resize-y py-3 leading-relaxed", errors?.text ? "border-missing" : "border-line-strong")}
            />
            <Problem id="text-error" message={errors?.text} />
          </div>
        ) : (
          <Field
            label="Link to the job post"
            name="url"
            type="url"
            inputMode="url"
            defaultValue={values?.url}
            placeholder="https://careers.example.com/junior-data-analyst"
            error={errors?.url}
            hint="Works with most company career pages. Sites like LinkedIn block this, so paste the text instead."
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Job title (optional)" name="title" maxLength={200} defaultValue={values?.title} error={errors?.title} />
          <Field label="Company (optional)" name="company" maxLength={200} defaultValue={values?.company} error={errors?.company} />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-end gap-4 border-t border-line pt-6">
        <p className="text-sm text-muted">Takes a few minutes. You can leave the page while it runs.</p>
        <SubmitButton size="lg" pendingText={mode === "link" ? "Fetching the job…" : "Starting…"}>
          Get my match report →
        </SubmitButton>
      </div>
    </form>
  );
}
