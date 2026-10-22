import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { API_URL, INTERNAL_API_SECRET } from "./env";
import { clientIpFrom, problemFrom, type ApiProblem } from "./errors";
import { getToken } from "./session";

export class ApiError extends Error {
  constructor(readonly problem: ApiProblem) {
    super(problem.message);
  }
  get status() {
    return this.problem.status;
  }
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  json?: unknown;
  form?: Record<string, string>;
  body?: FormData;
  // false for the sign-in routes themselves: a 401 there means a wrong
  // password, not an expired session.
  auth?: boolean;
};

// Its own message from the backend, so we can say why the user was signed out.
const PASSWORD_CHANGED = "Password changed";

// The client IP (for rate limits) and, unless auth is false, the session token.
async function baseHeaders(auth: boolean): Promise<Headers> {
  const outgoing = new Headers({ Accept: "application/json" });
  const incoming = await headers();
  const ip = clientIpFrom(incoming.get("x-forwarded-for"), incoming.get("x-real-ip"));
  if (ip && INTERNAL_API_SECRET) {
    outgoing.set("X-Client-IP", ip);
    outgoing.set("X-Internal-Secret", INTERNAL_API_SECRET);
  }
  if (auth) {
    const token = await getToken();
    if (!token) redirect("/login");
    outgoing.set("Authorization", `Bearer ${token}`);
  }
  return outgoing;
}

// A 401 on a signed-in call means the session is over: say why on /login.
// The cookie can't be deleted while rendering a page, so the logout route
// does it and then sends the user to /login.
function signOutOn401(problem: ApiProblem): never {
  const reason = problem.message === PASSWORD_CHANGED ? "password-changed" : "expired";
  redirect(`/logout?reason=${reason}`);
}

const UNREACHABLE: ApiProblem = {
  status: 503,
  message: "Veynia's server can't be reached right now. Try again in a moment.",
  fieldErrors: {},
};

/** Calls FastAPI from the server. Throws ApiError for any non-2xx answer. */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { method = options.json || options.form || options.body ? "POST" : "GET", auth = true } =
    options;
  const outgoing = await baseHeaders(auth);

  let body: BodyInit | undefined;
  if (options.json !== undefined) {
    outgoing.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  } else if (options.form) {
    body = new URLSearchParams(options.form);
  } else if (options.body) {
    body = options.body;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { method, headers: outgoing, body, cache: "no-store" });
  } catch {
    throw new ApiError(UNREACHABLE);
  }

  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const problem = problemFrom(response.status, data, response.headers.get("retry-after"));
    if (auth && response.status === 401) signOutOn401(problem);
    throw new ApiError(problem);
  }
  return data as T;
}

/** A file from FastAPI (a report, a rewritten CV), as the raw Response to
 *  stream on. Throws ApiError like api() when it isn't a 2xx. */
export async function apiFile(path: string): Promise<Response> {
  const outgoing = await baseHeaders(true);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { headers: outgoing, cache: "no-store" });
  } catch {
    throw new ApiError(UNREACHABLE);
  }
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const problem = problemFrom(response.status, data, response.headers.get("retry-after"));
    if (response.status === 401) signOutOn401(problem);
    throw new ApiError(problem);
  }
  return response;
}

/** Like api(), but a missing (or malformed) id shows the 404 page. */
export async function apiOrNotFound<T>(path: string): Promise<T> {
  try {
    return await api<T>(path);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 422)) notFound();
    throw err;
  }
}
