"use client";

import { cn } from "@/lib/cn";

// The same rules the backend enforces (auth/schemas.py), shown as you type.
export const RULES = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "a lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "an uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "a symbol", test: (p: string) => /[^\p{L}\p{N}\s]/u.test(p) },
];

export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
      {RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.label} className={cn("flex items-center gap-1.5 text-xs", ok ? "font-semibold text-match" : "text-muted")}>
            <span aria-hidden>{ok ? "✓" : "·"}</span>
            {rule.label}
            <span className="sr-only">{ok ? "(done)" : "(not yet)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
