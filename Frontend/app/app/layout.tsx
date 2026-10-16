import { Suspense } from "react";

import { logout } from "@/app/(auth)/actions";
import { icons } from "@/components/app/icons";
import { Nav } from "@/components/app/nav";
import { Logo } from "@/components/logo";
import { getUser } from "@/lib/dal";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-surface px-4 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
        <div className="flex items-center justify-between lg:block lg:px-2">
          <Logo href="/app" />
          <div className="lg:hidden">
            <SignOut />
          </div>
        </div>
        <div className="mt-4 lg:mt-9">
          <Nav />
        </div>
        <div className="mt-auto hidden lg:block">
          <UpgradeCard />
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-line p-2.5">
            <Suspense fallback={<div className="h-9 flex-1" />}>
              <Account />
            </Suspense>
            <SignOut />
          </div>
        </div>
      </aside>
      <main className="px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
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
      <div className="min-w-0">
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
