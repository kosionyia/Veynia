"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import type { FieldErrors } from "@/lib/errors";
import type { AnalysisDetail, JobDetail, Verdict } from "@/lib/types";

export type NewReportState = {
  error?: string;
  fieldErrors?: FieldErrors;
  // Echoed back so a failed submit doesn't empty the form.
  values?: Record<string, string>;
};

type Result = { error?: string };

function message(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  throw error;
}

async function queue(cvId: string, jobId: string): Promise<string> {
  const analysis = await api<AnalysisDetail>("/analyses", { json: { cv_id: cvId, job_id: jobId } });
  return analysis.id;
}

/** Save the job (pasted, or fetched from its link), then start the report. */
export async function startReport(_prev: NewReportState, form: FormData): Promise<NewReportState> {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const values = {
    cv_id: text("cv_id"),
    mode: form.get("mode") === "link" ? "link" : "paste",
    title: text("title"),
    company: text("company"),
    text: text("text"),
    url: text("url"),
  };
  if (!values.cv_id) return { fieldErrors: { cv_id: "Choose a CV." }, values };
  if (values.mode === "paste" && !values.text) return { fieldErrors: { text: "Paste the job description." }, values };
  if (values.mode === "link" && !values.url) return { fieldErrors: { url: "Enter the link to the job post." }, values };

  let id: string;
  try {
    const job = await api<JobDetail>("/jobs", {
      json: {
        title: values.title || null,
        company: values.company || null,
        // Only the chosen tab's input: a hidden tab's leftovers shouldn't count.
        text: values.mode === "paste" ? values.text : null,
        url: values.mode === "link" ? values.url : null,
      },
    });
    id = await queue(values.cv_id, job.id);
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, fieldErrors: error.problem.fieldErrors, values };
    throw error;
  }
  revalidatePath("/app", "layout");
  redirect(`/app/analyses/${id}`);
}

/** The same CV and job again (after a failure, or once the CV has changed). */
export async function rerunReport(cvId: string, jobId: string): Promise<Result> {
  let id: string;
  try {
    id = await queue(cvId, jobId);
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePath("/app", "layout");
  redirect(`/app/analyses/${id}`);
}

export async function deleteReport(id: string): Promise<Result> {
  try {
    await api(`/analyses/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) return { error: message(error) };
  }
  revalidatePath("/app", "layout");
  redirect("/app/analyses");
}

/** Override one verdict, or undo the override with status null. */
export async function correctRequirement(id: string, number: number, status: Verdict | null, note: string): Promise<Result> {
  try {
    await api(`/analyses/${encodeURIComponent(id)}/requirements/${number}`, {
      method: "PATCH",
      json: { status, note: note.trim() || null },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) return { error: "Keep the note under 500 characters." };
    return { error: message(error) };
  }
  revalidatePath(`/app/analyses/${id}`);
  return {};
}

export async function requestSuggestions(id: string): Promise<Result> {
  try {
    await api(`/analyses/${encodeURIComponent(id)}/suggestions`, { method: "POST" });
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePath(`/app/analyses/${id}`);
  return {};
}

export async function setSuggestionAccepted(id: string, number: number, accepted: boolean): Promise<Result> {
  try {
    await api(`/analyses/${encodeURIComponent(id)}/suggestions/${number}`, { method: "PATCH", json: { accepted } });
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePath(`/app/analyses/${id}`);
  return {};
}
