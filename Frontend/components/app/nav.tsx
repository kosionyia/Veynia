"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

import { icons } from "./icons";
import { useSidebar } from "./shell";

// Pages not built yet stay visible but disabled (soon), so the shape of the app is clear.
const ITEMS: { href: string; label: string; icon: (typeof icons)[keyof typeof icons]; soon?: boolean }[] = [
  { href: "/app", label: "Overview", icon: icons.overview },
  { href: "/app/analyses", label: "Match reports", icon: icons.reports },
  { href: "/app/cvs", label: "CVs", icon: icons.cvs },
  { href: "/app/jobs", label: "Jobs", icon: icons.jobs },
  { href: "/app/applications", label: "Applications", icon: icons.applications },
  { href: "/app/settings", label: "Settings", icon: icons.settings },
];

export function Nav() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  return (
    <nav aria-label="Main" className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map(({ href, label, icon: Icon, soon }) => {
        const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
        const classes = cn(
          "group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors lg:group-data-collapsed/shell:justify-center",
          active && "bg-brand-soft font-semibold text-brand-deep",
          !active && !soon && "text-ink-soft hover:bg-sunken",
          soon && "cursor-default text-muted/60",
        );
        const body = (
          <>
            <Icon className={cn("size-[18px] shrink-0", active ? "text-brand" : soon ? "text-muted/50" : "text-muted")} />
            {/* Icon-only when collapsed: the label stays for screen readers. */}
            <span className="lg:group-data-collapsed/shell:sr-only">{label}</span>
            {soon && (
              <span className="ml-auto hidden rounded-md bg-sunken px-1.5 py-0.5 text-[10px] font-semibold text-muted lg:inline lg:group-data-collapsed/shell:hidden">
                Soon
              </span>
            )}
          </>
        );
        return soon ? (
          <span key={href} aria-disabled title="Coming soon" className={classes}>
            {body}
          </span>
        ) : (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined} className={classes}>
            {body}
          </Link>
        );
      })}
    </nav>
  );
}
