import { describe, expect, it } from "vitest";

import { clientIpFrom, problemFrom } from "./errors";

describe("problemFrom", () => {
  it("maps FastAPI validation errors to fields and drops Pydantic's prefix", () => {
    const body = {
      detail: [
        { loc: ["body", "password"], msg: "Value error, Password must contain a symbol" },
        { loc: ["body", "email"], msg: "value is not a valid email address" },
      ],
    };
    const problem = problemFrom(422, body);
    expect(problem.fieldErrors).toEqual({
      password: "Password must contain a symbol",
      email: "value is not a valid email address",
    });
    expect(problem.message).toBe("Check the highlighted fields.");
  });

  it("keeps the first error when a field has several", () => {
    const body = { detail: [{ loc: ["body", "email"], msg: "first" }, { loc: ["body", "email"], msg: "second" }] };
    expect(problemFrom(422, body).fieldErrors.email).toBe("first");
  });

  it("uses the backend's message for string details", () => {
    expect(problemFrom(409, { detail: "Email already registered" }).message).toBe("Email already registered");
  });

  it("says how long to wait after a 429", () => {
    expect(problemFrom(429, { detail: "Too many attempts." }, "42").message).toBe("Too many attempts. Try again in 42 seconds.");
    expect(problemFrom(429, null, "900").message).toBe("Too many attempts. Try again in 15 minutes.");
    expect(problemFrom(429, null, null).message).toBe("Too many attempts. Try again later.");
  });

  it("never shows raw server errors", () => {
    expect(problemFrom(500, "<html>Internal Server Error</html>").message).toBe("Something went wrong. Try again.");
  });
});

describe("clientIpFrom", () => {
  it("takes the first address from X-Forwarded-For", () => {
    expect(clientIpFrom("203.0.113.9, 10.0.0.2", null)).toBe("203.0.113.9");
  });

  it("falls back to X-Real-IP, then null", () => {
    expect(clientIpFrom(null, "198.51.100.4")).toBe("198.51.100.4");
    expect(clientIpFrom(null, null)).toBeNull();
    expect(clientIpFrom(" ", null)).toBeNull();
  });
});
