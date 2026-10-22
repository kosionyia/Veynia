import "server-only";

import { cookies } from "next/headers";

// Kept in sync with SIDEBAR_COOKIE in components/app/shell.tsx.
export const SIDEBAR_COOKIE = "veynia_sidebar";

export async function sidebarCollapsed(): Promise<boolean> {
  return (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";
}
