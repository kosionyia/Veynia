"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

import { icons } from "./icons";

// Pages not built yet stay visible but disabled, so the shape of the app is clear.
const ITEMS = [
  { href: "/app", label: "Overview", icon: icons.overview },
  { href: "/app/analyses", label: "Match reports", icon: icons.reports, soon: true },
  { href: "/app/cvs", label: "CVs", icon: icons.cvs, soon: true },
  { href: "/app/jobs", label: "Jobs", icon: icons.jobs, soon: true },
  { href: "/app/applications", label: "Applications", icon: icons.applications, soon: true },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map(({ href, label, icon: Icon, soon }) => {
        const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
        const classes = cn(
          "group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
          active && "bg-brand-soft font-semibold text-brand-deep",
          !active && !soon && "text-ink-soft hover:bg-sunken",
          soon && "cursor-default text-muted/60",
        );
        const body = (
          <>
            <Icon className={cn("size-[18px]", active ? "text-brand" : soon ? "text-muted/50" : "text-muted")} />
            {label}
            {soon && <span className="ml-auto hidden rounded-md bg-sunken px-1.5 py-0.5 text-[10px] font-semibold text-muted lg:inline">Soon</span>}
          </>
        );
        return soon ? (
          <span key={href} aria-disabled title="Coming soon" className={classes}>
            {body}
          </span>
        ) : (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={classes}>
            {body}
          </Link>
        );
      })}
    </nav>
  );
}
