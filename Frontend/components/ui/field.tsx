import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

type FieldProps = ComponentProps<"input"> & {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  // Shown to the right of the label, e.g. a "Forgot password?" link.
  aside?: ReactNode;
};

export function Field({ label, name, error, hint, aside, className, ...props }: FieldProps) {
  const id = props.id ?? name;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-ink-soft">
          {label}
        </label>
        {aside}
      </div>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-11 w-full rounded-lg border bg-card px-3.5 text-[15px] text-ink placeholder:text-muted/70",
          "transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15",
          error ? "border-missing" : "border-line-strong",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-missing">
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
