"use client";

import { useActionState, useState } from "react";

import { icons } from "@/components/app/icons";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { CV_ACCEPT, formatBytes, MAX_CV_BYTES } from "@/lib/format";

import { uploadCV, type CVFormState } from "./actions";

export function UploadForm() {
  const [state, action] = useActionState<CVFormState, FormData>(uploadCV, {});
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  // Too big to even send: the Server Action would reject it with a vague error.
  const tooBig = file !== null && file.size > MAX_CV_BYTES;

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {/* The file input covers the whole box, so clicking and dropping both work natively. */}
      <label
        className={cn(
          "relative grid cursor-pointer justify-items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-brand bg-brand-soft" : "border-line-strong bg-surface hover:border-brand/60 hover:bg-brand-soft/40",
        )}
      >
        <input
          type="file"
          name="file"
          accept={CV_ACCEPT}
          required
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDrop={() => setDragging(false)}
        />
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
          {file ? <icons.file className="size-6" /> : <icons.upload className="size-6" />}
        </span>
        {file ? (
          <>
            <span className="font-semibold break-all text-ink">{file.name}</span>
            <span className="text-sm text-muted">{formatBytes(file.size)} · click or drop to change</span>
          </>
        ) : (
          <>
            <span className="font-semibold text-ink">Drop your CV here, or click to choose</span>
            <span className="text-sm text-muted">PDF or Word (.docx), up to 5 MB</span>
          </>
        )}
      </label>
      {tooBig && <p className="text-sm text-missing">This file is larger than 5 MB.</p>}
      <div className="flex justify-end">
        <SubmitButton disabled={!file || tooBig} pendingText="Reading your CV…">
          <icons.upload className="size-4" /> Upload CV
        </SubmitButton>
      </div>
    </form>
  );
}
