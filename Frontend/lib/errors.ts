// Turns FastAPI error bodies into text for the user. No server-only imports,
// so it can be unit tested.

export type FieldErrors = Record<string, string>;

export type ApiProblem = {
  status: number;
  message: string;
  fieldErrors: FieldErrors;
  // Anything else an object detail carried, e.g. the id of the application
  // that's already tracked.
  data?: Record<string, unknown>;
};

type ValidationItem = { loc?: (string | number)[]; msg?: string };

const GENERIC = "Something went wrong. Try again.";

// Pydantic prefixes custom validator messages with "Value error, ".
function cleanMessage(msg: string): string {
  return msg.replace(/^Value error,\s*/, "");
}

export function problemFrom(status: number, body: unknown, retryAfter?: string | null): ApiProblem {
  const detail = (body as { detail?: unknown } | null)?.detail;

  if (status === 422 && Array.isArray(detail)) {
    const fieldErrors: FieldErrors = {};
    for (const item of detail as ValidationItem[]) {
      // loc is like ["body", "password"]; the last part names the field.
      const field = String(item.loc?.at(-1) ?? "form");
      if (!fieldErrors[field] && item.msg) fieldErrors[field] = cleanMessage(item.msg);
    }
    return { status, message: "Check the highlighted fields.", fieldErrors };
  }

  if (status === 429) {
    const seconds = Number(retryAfter);
    const wait =
      Number.isFinite(seconds) && seconds > 0
        ? seconds >= 120
          ? ` Try again in ${Math.ceil(seconds / 60)} minutes.`
          : ` Try again in ${seconds} seconds.`
        : " Try again later.";
    return { status, message: "Too many attempts." + wait, fieldErrors: {} };
  }

  if (typeof detail === "string" && detail) return { status, message: detail, fieldErrors: {} };
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const { message, ...data } = detail as Record<string, unknown>;
    if (typeof message === "string" && message) return { status, message, fieldErrors: {}, data };
  }
  if (status >= 500) return { status, message: GENERIC, fieldErrors: {} };
  return { status, message: GENERIC, fieldErrors: {} };
}

/** The browser's IP from the headers Next received, or null in local dev. */
export function clientIpFrom(forwardedFor: string | null, realIp: string | null): string | null {
  const first = forwardedFor?.split(",")[0]?.trim();
  return first || realIp?.trim() || null;
}
