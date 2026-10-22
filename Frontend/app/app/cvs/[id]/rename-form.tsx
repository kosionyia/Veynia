"use client";

import { useActionState, useState } from "react";

import { icons } from "@/components/app/icons";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";

import { renameCV, type CVFormState } from "../actions";

/** The CV's name as the heading, with a pencil that swaps in a form. */
export function RenameForm({ id, name }: { id: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<CVFormState, FormData>(async (prev, data) => {
    const result = await renameCV(id, prev, data);
    if (!result.error) setEditing(false);
    return result;
  }, {});

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold break-all text-ink">{name}</h1>
        <Button variant="ghost" size="icon" aria-label="Rename CV" onClick={() => setEditing(true)}>
          <icons.pencil className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          defaultValue={name}
          aria-label="CV name"
          maxLength={100}
          required
          autoFocus
          aria-invalid={state.error ? true : undefined}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          className={cn(inputClass, "h-10 max-w-sm", state.error ? "border-missing" : "border-line-strong")}
        />
        <SubmitButton pendingText="Saving…">Save</SubmitButton>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
      {state.error && <p className="text-sm text-missing">{state.error}</p>}
    </form>
  );
}
