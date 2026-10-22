import type { AnalysisStatus, Verdict } from "@/lib/types";

export const STATUS_LABELS: Record<AnalysisStatus, string> = {
  queued: "Waiting to start",
  extracting: "Reading the job",
  matching: "Comparing your CV",
  done: "Done",
  failed: "Didn't finish",
};

export const VERDICTS: Record<Verdict, { label: string; sign: string; tone: string; soft: string }> = {
  matched: { label: "Matched", sign: "✓", tone: "text-match", soft: "bg-match-soft text-match" },
  partial: { label: "Partly", sign: "~", tone: "text-partial", soft: "bg-partial-soft text-partial" },
  missing: { label: "Missing", sign: "✕", tone: "text-missing", soft: "bg-missing-soft text-missing" },
};
