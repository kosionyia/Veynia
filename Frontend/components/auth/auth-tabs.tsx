"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/login", label: "Sign in" },
  { href: "/register", label: "Create account" },
];

// A two-way switch on top of the auth card. Each tab is a real page, but the
// layout around them stays mounted, so only the form below changes.
export function AuthTabs() {
  // Layouts don't re-render on navigation; this client component does.
  const pathname = usePathname();
  const active = Math.max(0, TABS.findIndex((tab) => pathname.startsWith(tab.href)));

  return (
    <nav aria-label="Account" className="relative grid grid-cols-2 rounded-xl bg-sunken p-1">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-surface shadow-[0_1px_3px_rgb(12_26_23/0.12)] transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${active * 100}%)` }}
      />
      {TABS.map((tab, i) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={i === active ? "page" : undefined}
          className="relative rounded-lg py-2 text-center text-sm font-semibold text-muted transition-colors hover:text-ink aria-[current=page]:text-ink"
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
