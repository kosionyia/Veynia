import Link from "next/link";

import { cn } from "@/lib/cn";

// The wordmark only, until there's a real icon.
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
      className={cn("inline-flex items-center font-display text-xl font-bold tracking-tight", tone === "light" ? "text-night-text" : "text-ink", className)}
    >
      Veynia
    </Link>
  );
}
