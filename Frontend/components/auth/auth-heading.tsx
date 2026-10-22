import type { ReactNode } from "react";

export function AuthHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <header className="space-y-1.5">
      <h1 className="text-2xl leading-tight font-bold text-ink">{title}</h1>
      <p className="text-sm text-muted">{description}</p>
      {children}
    </header>
  );
}
