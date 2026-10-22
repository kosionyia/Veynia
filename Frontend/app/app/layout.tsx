import Link from "next/link";
import { Suspense } from "react";

import { logout } from "@/app/(public)/(auth)/actions";
import { icons } from "@/components/app/icons";
import { Nav } from "@/components/app/nav";
import { CollapseButton, Shell } from "@/components/app/shell";
import { Logo } from "@/components/logo";
import { getUser } from "@/lib/dal";
import { sidebarCollapsed } from "@/lib/sidebar";

// Hidden when the sidebar is collapsed to icons (lg and up only).
const HIDE_COLLAPSED = "lg:group-data-collapsed/shell:hidden";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <Shell initialCollapsed={await sidebarCollapsed()}>
      <aside className="border-b border-line bg-surface px-4 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden lg:border-r lg:border-b-0 lg:px-4 lg:py-6 lg:group-data-collapsed/shell:px-3">
        <div className="flex items-center justify-between gap-2 lg:pl-2 lg:group-data-collapsed/shell:justify-center lg:group-data-collapsed/shell:pl-0">
          <Logo href="/app" className={HIDE_COLLAPSED} />
          <CollapseButton className="hidden lg:grid" />
          <div className="lg:hidden">
            <SignOut />
          </div>
        </div>
        <div className="mt-4 lg:mt-9">
          <Nav />
        </div>
        <div className="mt-auto hidden lg:block">
          <div className={HIDE_COLLAPSED}>
            <UpgradeCard />
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-line p-2.5 lg:group-data-collapsed/shell:flex-col lg:group-data-collapsed/shell:border-0 lg:group-data-collapsed/shell:p-0">
            <Link href="/app/settings" title="Settings" className="-m-1 flex min-w-0 flex-1 rounded-lg p-1 transition-colors hover:bg-sunken">
              <Suspense fallback={<div className="h-9 flex-1" />}>
                <Account />
              </Suspense>
            </Link>
            <SignOut />
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </Shell>
  );
}

async function Account() {
  const user = await getUser();
  const initials = user.full_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <span className="bg-brand-gradient grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white">{initials}</span>
      <div className={`min-w-0 ${HIDE_COLLAPSED}`}>
        <p className="truncate text-sm font-semibold text-ink">{user.full_name}</p>
        <p className="truncate text-xs text-muted">Free plan</p>
      </div>
    </div>
  );
}

function UpgradeCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-night p-4 text-night-text">
      <div aria-hidden className="absolute -top-10 -right-10 size-32 rounded-full bg-[#10b981] opacity-40 blur-2xl" />
      <p className="relative font-display text-[15px] font-bold">Go unlimited</p>
      <p className="relative mt-1 text-xs leading-relaxed text-night-muted">Unlimited reports and AI rewrites from ₦3,500 a month.</p>
      <span className="relative mt-3 inline-flex rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-night-muted">Coming soon</span>
    </div>
  );
}

function SignOut() {
  return (
    <form action={logout}>
      <button
        type="submit"
        title="Sign out"
        className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink"
      >
        <icons.logout className="size-[18px]" />
        <span className="sr-only">Sign out</span>
      </button>
    </form>
  );
}
