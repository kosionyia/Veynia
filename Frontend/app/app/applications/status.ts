// Shared by server and client code (no "server-only").

import type { ApplicationStatus } from "@/lib/types";

export const STATUSES = ["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"] as const satisfies readonly ApplicationStatus[];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const STATUS_STYLES: Record<ApplicationStatus, string> = {
  saved: "bg-sunken text-ink-soft",
  applied: "bg-teal/10 text-teal",
  interviewing: "bg-brand-soft text-brand-deep",
  offer: "bg-lime/30 text-[#3f6212]",
  rejected: "bg-missing-soft text-missing",
  withdrawn: "bg-sunken text-muted line-through",
};

// Follow-ups only matter while it's still in play.
export const IN_PROGRESS: ApplicationStatus[] = ["saved", "applied", "interviewing"];

/** "2026-10-12" (a date with no time) as "12 Oct 2026". Read as UTC on purpose:
 *  as local time it would show the day before for anyone west of Greenwich. */
export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Today as "YYYY-MM-DD" in UTC, the same "today" the API uses. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
