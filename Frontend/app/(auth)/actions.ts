"use server";

import { redirect } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import type { FieldErrors } from "@/lib/errors";
import { clearSession, setSession } from "@/lib/session";
import type { Token } from "@/lib/types";

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: FieldErrors;
  // Echoed back so a failed submit doesn't empty the form (never passwords).
  values?: Record<string, string>;
};

function text(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

// Only paths inside the app, so ?next= can't send someone to another site.
function safeNext(value: string): string {
  return value.startsWith("/app") && !value.startsWith("//") ? value : "/app";
}

function failure(error: unknown, values?: Record<string, string>): FormState {
  if (error instanceof ApiError) {
    return { error: error.message, fieldErrors: error.problem.fieldErrors, values };
  }
  throw error;
}

async function signIn(email: string, password: string): Promise<void> {
  const token = await api<Token>("/auth/login", {
    form: { username: email, password },
    auth: false,
  });
  await setSession(token.access_token);
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email");
  const password = String(form.get("password") ?? "");
  try {
    await signIn(email, password);
  } catch (error) {
    return failure(error, { email });
  }
  redirect(safeNext(text(form, "next")));
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const full_name = text(form, "full_name");
  const email = text(form, "email");
  const password = String(form.get("password") ?? "");
  const values = { full_name, email };
  try {
    await api("/auth/register", { json: { full_name, email, password }, auth: false });
    await signIn(email, password);
  } catch (error) {
    return failure(error, values);
  }
  redirect("/app");
}

export async function googleLogin(credential: string): Promise<FormState> {
  try {
    const token = await api<Token>("/auth/google", { json: { credential }, auth: false });
    await setSession(token.access_token);
  } catch (error) {
    return failure(error);
  }
  redirect("/app");
}

export async function forgotPassword(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email");
  try {
    const reply = await api<{ detail: string }>("/auth/forgot-password", {
      json: { email },
      auth: false,
    });
    return { success: reply.detail, values: { email } };
  } catch (error) {
    return failure(error, { email });
  }
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const token = text(form, "token");
  const password = String(form.get("password") ?? "");
  if (password !== String(form.get("confirm") ?? "")) {
    return { fieldErrors: { confirm: "The passwords don't match." } };
  }
  try {
    await api("/auth/reset-password", { json: { token, password }, auth: false });
  } catch (error) {
    return failure(error);
  }
  redirect("/login?reset=1");
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/login?reason=signed-out");
}
