import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/session";

// Where api() sends the user when FastAPI rejects their token. Pages can't
// delete cookies while rendering, so this route does it. (The sign-out button
// uses the logout server action instead.)
export function GET(request: NextRequest) {
  const reason = request.nextUrl.searchParams.get("reason");
  const target = new URL("/login", request.url);
  if (reason === "expired" || reason === "password-changed") target.searchParams.set("reason", reason);
  const response = NextResponse.redirect(target);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
