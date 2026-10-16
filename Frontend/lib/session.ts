import "server-only";

import { cookies } from "next/headers";

import { SESSION_MINUTES } from "./env";

// httpOnly: page scripts can't read the token, so an XSS bug can't steal it.
export const SESSION_COOKIE = "veynia_session";

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function setSession(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MINUTES * 60,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
