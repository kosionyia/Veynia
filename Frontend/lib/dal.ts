import "server-only";

import { cache } from "react";

import { api } from "./api";
import type { User } from "./types";

// Once per request, however many components ask. Redirects to /login when the
// session is missing or no longer valid.
export const getUser = cache(() => api<User>("/auth/me"));
