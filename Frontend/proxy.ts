import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: is there a session cookie at all? Whether the token is
// still valid is FastAPI's call, made on the first API request (lib/api.ts).
// Kept in sync with SESSION_COOKIE in lib/session.ts, which is server-only.
const SESSION_COOKIE = "veynia_session";
const AUTH_PAGES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_COOKIE);

  if (pathname.startsWith("/app") && !signedIn) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  if (AUTH_PAGES.includes(pathname) && signedIn) {
    return NextResponse.redirect(new URL("/app", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/register"],
};
