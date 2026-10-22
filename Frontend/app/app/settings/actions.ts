"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { getUser } from "@/lib/dal";
import type { FieldErrors } from "@/lib/errors";
import { clearSession, setSession } from "@/lib/session";
import type { Token } from "@/lib/types";

export type SettingsState = { error?: string; success?: string; fieldErrors?: FieldErrors; values?: Record<string, string> };

function failure(error: unknown, values?: Record<string, string>): SettingsState {
  if (error instanceof ApiError) return { error: error.message, fieldErrors: error.problem.fieldErrors, values };
  throw error;
}

export async function updateProfile(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const full_name = String(form.get("full_name") ?? "").trim();
  if (!full_name) return { fieldErrors: { full_name: "Enter your name." }, values: { full_name } };
  try {
    await api("/auth/me", { method: "PATCH", json: { full_name } });
  } catch (error) {
    return failure(error, { full_name });
  }
  // The name shows in the sidebar and the overview greeting.
  revalidatePath("/app", "layout");
  return { success: "Saved.", values: { full_name } };
}

export async function changePassword(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const current_password = String(form.get("current_password") ?? "");
  const new_password = String(form.get("new_password") ?? "");
  if (new_password !== String(form.get("confirm") ?? "")) return { fieldErrors: { confirm: "The new passwords don't match." } };
  let token: Token;
  try {
    token = await api<Token>("/auth/change-password", { json: { current_password, new_password } });
  } catch (error) {
    return failure(error);
  }
  // The change ended every older session, this one too: keep this browser
  // signed in with the new token.
  await setSession(token.access_token);
  return { success: "Password changed. Any other devices have been signed out." };
}

/** Google-only accounts set a password through the emailed reset link, which
 *  proves they own the address. */
export async function sendPasswordLink(): Promise<SettingsState> {
  const user = await getUser();
  try {
    await api("/auth/forgot-password", { json: { email: user.email }, auth: false });
  } catch (error) {
    return failure(error);
  }
  return { success: `We've sent a link to ${user.email}. Open it to set your password.` };
}

export async function deleteAccount(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const confirm = String(form.get("confirm") ?? "");
  const user = await getUser();
  try {
    await api("/auth/me", { method: "DELETE", json: user.has_password ? { password: confirm } : { email: confirm } });
  } catch (error) {
    return failure(error);
  }
  await clearSession();
  redirect("/login?reason=account-deleted");
}
