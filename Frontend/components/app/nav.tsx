"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

// Pages not built yet stay visible but disabled, so the shape of the app is clear.
const ITEMS = [
  { href: "/app", label: "Overview" },
  { href: "/app/analyses", label: "Match reports", soon: true },
  { href: "/app/cvs", label: "CVs", soon: true },
  { href: "/app/jobs", label: "Jobs", soon: true },
  { href: "/app/applications", label: "Applications", soon: true },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map((item) => {
        const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        if (item.soon) {
          return (
            <span
              key={item.href}
              aria-disabled
              title="Coming soon"
              className="flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-muted/60"
            >
              {item.label}
              <span className="hidden text-[10px] uppercase tracking-wider lg:inline">soon</span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-card font-medium text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-soft hover:bg-paper-deep",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
