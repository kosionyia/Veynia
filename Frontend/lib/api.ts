import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

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

/** Calls FastAPI from the server. Throws ApiError for any non-2xx answer. */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { method = options.json || options.form || options.body ? "POST" : "GET", auth = true } =
    options;

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
    throw new ApiError({
      status: 503,
      message: "Veynia's server can't be reached right now. Try again in a moment.",
      fieldErrors: {},
    });
  }

  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const problem = problemFrom(response.status, data, response.headers.get("retry-after"));
    if (auth && response.status === 401) {
      // The cookie can't be deleted while rendering a page, so the logout
      // route does it and then sends the user to /login.
      const reason = problem.message === PASSWORD_CHANGED ? "password-changed" : "expired";
      redirect(`/logout?reason=${reason}`);
    }
    throw new ApiError(problem);
  }
  return data as T;
}
