"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import type { AnalysisDetail } from "@/lib/types";

export type MatchState = { error?: string };

/** A new match report for this saved job, with the chosen CV. */
export async function matchJob(jobId: string, _prev: MatchState, form: FormData): Promise<MatchState> {
  const cvId = String(form.get("cv_id") ?? "");
  if (!cvId) return { error: "Choose a CV." };
  let report: AnalysisDetail;
  try {
    report = await api<AnalysisDetail>("/analyses", { json: { cv_id: cvId, job_id: jobId } });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
  revalidatePath("/app", "layout");
  redirect(`/app/analyses/${report.id}`);
}

export async function deleteJob(id: string): Promise<{ error?: string }> {
  try {
    await api(`/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status !== 404) return { error: error.message };
  }
  revalidatePath("/app", "layout");
  redirect("/app/jobs");
}
