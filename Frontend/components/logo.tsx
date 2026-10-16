import Link from "next/link";

import { cn } from "@/lib/cn";

// Wordmark: serif name with a small green mark, the "vein" running through it.
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <svg viewBox="0 0 24 24" aria-hidden className="size-6">
        <circle cx="12" cy="12" r="11" fill="var(--color-accent)" />
        <path
          d="M7 7.5 L12 17 L17 7.5"
          fill="none"
          stroke="var(--color-paper)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-serif text-xl font-semibold tracking-tight">Veynia</span>
    </Link>
  );
}
