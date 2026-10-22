"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import type { FieldErrors } from "@/lib/errors";
import type { Application, ApplicationStatus } from "@/lib/types";

export type ApplicationFormState = {
  error?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
  saved?: boolean;
};

type Result = { error?: string };

/** The form's fields as the API wants them: blanks become null, so clearing a
 *  field in the form clears it in the database. */
function fromForm(form: FormData) {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const values = {
    role: text("role"),
    company: text("company"),
    url: text("url"),
    status: text("status") || "saved",
    applied_on: text("applied_on"),
    follow_up_on: text("follow_up_on"),
    cv_id: text("cv_id"),
    notes: text("notes"),
  };
  const body: Record<string, string | null> = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value || null]));
  // Set when "Track this application" needed the role or company filled in. Create only.
  const analysisId = text("analysis_id");
  return { values, body, analysisId };
}

function failure(error: unknown, values: Record<string, string>): ApplicationFormState {
  if (error instanceof ApiError) return { error: error.message, fieldErrors: error.problem.fieldErrors, values };
  throw error;
}

function refresh(id?: string) {
  revalidatePath("/app", "layout");
  if (id) revalidatePath(`/app/applications/${id}`);
}

export async function createApplication(_prev: ApplicationFormState, form: FormData): Promise<ApplicationFormState> {
  const { values, body, analysisId } = fromForm(form);
  if (!values.role) return { fieldErrors: { role: "Enter the role." }, values };
  if (!values.company) return { fieldErrors: { company: "Enter the company." }, values };
  let created: Application;
  try {
    created = await api<Application>("/applications", { json: { ...body, analysis_id: analysisId || null } });
  } catch (error) {
    return failure(error, values);
  }
  refresh();
  redirect(`/app/applications/${created.id}`);
}

export async function updateApplication(id: string, _prev: ApplicationFormState, form: FormData): Promise<ApplicationFormState> {
  const { values, body } = fromForm(form);
  if (!values.role) return { fieldErrors: { role: "Enter the role." }, values };
  if (!values.company) return { fieldErrors: { company: "Enter the company." }, values };
  try {
    await api(`/applications/${encodeURIComponent(id)}`, { method: "PATCH", json: body });
  } catch (error) {
    return failure(error, values);
  }
  refresh(id);
  return { values, saved: true };
}

/** Quick status change from the list. */
export async function setApplicationStatus(id: string, status: ApplicationStatus): Promise<Result> {
  try {
    await api(`/applications/${encodeURIComponent(id)}`, { method: "PATCH", json: { status } });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
  refresh(id);
  return {};
}

/** "Track this application" on a report. Opens the existing one if it's
 *  already tracked, or the form when the job has no role or company. */
export async function trackFromReport(analysisId: string): Promise<Result> {
  let created: Application;
  try {
    created = await api<Application>("/applications", { json: { analysis_id: analysisId } });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const existing = error.problem.data?.application_id;
    if (error.status === 409 && typeof existing === "string") redirect(`/app/applications/${existing}`);
    if (error.status === 422) redirect(`/app/applications/new?analysis=${analysisId}`);
    return { error: error.message };
  }
  refresh();
  redirect(`/app/applications/${created.id}`);
}

export async function deleteApplication(id: string): Promise<Result> {
  try {
    await api(`/applications/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) {
      if (error instanceof ApiError) return { error: error.message };
      throw error;
    }
  }
  refresh();
  redirect("/app/applications");
}
