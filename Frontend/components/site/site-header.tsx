"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "@/components/logo";
import { ButtonLink, buttonClass } from "@/components/ui/button";

import { SECTIONS } from "./sections";

export function SiteHeader() {
  const pathname = usePathname();
  // The page the mobile menu was opened on: navigating anywhere closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:px-8">
        <Logo />

        <nav aria-label="Main" className="hidden flex-1 justify-center gap-1 md:flex">
          {SECTIONS.map((link) => (
            <Link key={link.href} href={link.href} className={buttonClass({ variant: "ghost" }, "font-medium")}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <ButtonLink href="/login" variant="ghost">
            Sign in
          </ButtonLink>
          <ButtonLink href="/register">Get started</ButtonLink>
        </div>

        <button
          type="button"
          onClick={() => setOpenOn(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className={buttonClass({ variant: "ghost", size: "icon" }, "ml-auto md:hidden")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="size-5">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Main" className="grid gap-1 border-t border-line px-5 pt-2 pb-4 md:hidden">
          {SECTIONS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpenOn(null)}
              className={buttonClass({ variant: "ghost", size: "lg" }, "justify-start font-medium")}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
            <ButtonLink href="/login" variant="secondary" size="lg">
              Sign in
            </ButtonLink>
            <ButtonLink href="/register" size="lg">
              Get started
            </ButtonLink>
          </div>
        </nav>
      )}
    </header>
  );
}
