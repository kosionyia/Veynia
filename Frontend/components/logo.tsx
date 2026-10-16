import Link from "next/link";

import { cn } from "@/lib/cn";

export function Logo({
  href = "/",
  className,
  tone = "dark",
}: {
  href?: string;
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5", tone === "light" ? "text-night-text" : "text-ink", className)}
    >
      <span className="bg-brand-gradient grid size-8 place-items-center rounded-[10px] text-white shadow-[0_6px_16px_-6px_var(--color-brand)]">
        <svg viewBox="0 0 24 24" aria-hidden className="size-4">
          <path d="M6 6.5 12 18l6-11.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="font-display text-xl font-bold tracking-tight">Veynia</span>
    </Link>
  );
}
