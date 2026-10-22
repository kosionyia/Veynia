// Shared by server and client code (no "server-only").

import type { AnalysisStatus, AnalysisSummary, JobSummary, RequirementResult } from "./types";

// Same limit as FastAPI (app/cvs/extraction.py); checked here first for quick feedback.
export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const CV_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Still running: the page polls until the status leaves this list.
export const ACTIVE: AnalysisStatus[] = ["queued", "extracting", "matching"];

export function jobLabel(a: Pick<AnalysisSummary, "job_title" | "job_company">): string {
  if (a.job_title && a.job_company) return `${a.job_title} at ${a.job_company}`;
  return a.job_title ?? a.job_company ?? "Untitled job";
}

export function jobName(job: Pick<JobSummary, "title" | "company">): string {
  return jobLabel({ job_title: job.title, job_company: job.company });
}

/** The user's correction wins over the model's verdict. */
export function effectiveStatus(row: Pick<RequirementResult, "status" | "user_status">) {
  return row.user_status ?? row.status;
}

/** Green from 75, amber from 50, red below (same bands as the overview). */
export function scoreTone(score: number): string {
  return score >= 75 ? "bg-match-soft text-match" : score >= 50 ? "bg-partial-soft text-partial" : "bg-missing-soft text-missing";
}
