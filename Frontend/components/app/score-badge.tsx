import { cn } from "@/lib/cn";
import { scoreTone } from "@/lib/format";
import type { AnalysisStatus } from "@/lib/types";

const RUNNING_LABEL: Partial<Record<AnalysisStatus, string>> = { failed: "Failed" };

/** The score in a rounded square, or "…" while the report runs. */
export function ScoreBadge({ score, status, size = "md" }: { score: number | null; status: AnalysisStatus; size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-14 rounded-2xl text-xl" : "size-11 rounded-xl text-base";
  if (score === null) {
    return (
      <span className={cn("grid shrink-0 place-items-center bg-sunken text-[10px] font-semibold text-muted uppercase", box)}>
        {RUNNING_LABEL[status] ?? <span className="size-3 animate-pulse rounded-full bg-brand/60" aria-label="Running" />}
      </span>
    );
  }
  return <span className={cn("grid shrink-0 place-items-center font-display font-bold", box, scoreTone(score))}>{score}</span>;
}
