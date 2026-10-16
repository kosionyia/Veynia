import { Suspense } from "react";

import { logout } from "@/app/(auth)/actions";
import { Nav } from "@/components/app/nav";
import { Logo } from "@/components/logo";
import { getUser } from "@/lib/dal";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="border-b border-line bg-paper-deep/60 px-4 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
        <div className="flex items-center justify-between lg:block">
          <Logo href="/app" />
          <div className="lg:hidden">
            <SignOut />
          </div>
        </div>
        <div className="mt-4 lg:mt-10">
          <Nav />
        </div>
        <div className="mt-auto hidden border-t border-line pt-4 lg:block">
          <Suspense fallback={<div className="h-10" />}>
            <Account />
          </Suspense>
          <SignOut />
        </div>
      </aside>
      <main className="px-5 py-8 sm:px-10 lg:py-12">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

async function Account() {
  const user = await getUser();
  return (
    <div className="mb-2 px-1">
      <p className="truncate text-sm font-medium text-ink">{user.full_name}</p>
      <p className="truncate text-xs text-muted">{user.email}</p>
    </div>
  );
}

function SignOut() {
  return (
    <form action={logout}>
      <button type="submit" className="rounded-lg px-1 py-1 text-sm text-muted hover:text-ink">
        Sign out
      </button>
    </form>
  );
}
