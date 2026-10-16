import "server-only";

// The browser never talks to FastAPI: Next does, from the server. In Docker,
// compose sets API_URL to http://backend:8000.
export const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

// Proves to FastAPI that the X-Client-IP header came from this server, so rate
// limits apply per browser instead of to Next as a whole. Same value as the
// backend's INTERNAL_API_SECRET.
export const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET ?? "";

// Matches the backend's JWT_EXPIRE_MINUTES, so the cookie ends with the token.
export const SESSION_MINUTES = Number(process.env.JWT_EXPIRE_MINUTES ?? 60);
