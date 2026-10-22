import type { Metadata } from "next";
import Link from "next/link";

import { AutoRefresh } from "@/components/app/auto-refresh";
import { icons } from "@/components/app/icons";
import { LocalDate } from "@/components/app/local-date";
import { PageHeader } from "@/components/app/page-header";
import { ScoreBadge } from "@/components/app/score-badge";
import { ButtonLink } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ACTIVE, jobLabel } from "@/lib/format";
import type { AnalysisStatus, AnalysisSummary } from "@/lib/types";

import { STATUS_LABELS } from "./status";

export const metadata: Metadata = { title: "Match reports" };

function verdict(score: number): string {
  return score >= 75 ? "Strong match" : score >= 50 ? "Worth tailoring" : "Big gaps";
}

function statusText(status: AnalysisStatus, score: number | null): string {
  return status === "done" && score !== null ? verdict(score) : STATUS_LABELS[status];
}

export default async function ReportsPage() {
  const reports = await api<AnalysisSummary[]>("/analyses");
  const running = reports.some((r) => ACTIVE.includes(r.status));

  return (
    <div className="space-y-8">
      {running && <AutoRefresh seconds={6} />}
      <PageHeader
        title="Match reports"
        description="Every job you've matched a CV against, newest first."
        actions={
          <ButtonLink href="/app/analyses/new">
            New match report <icons.arrow className="size-4" />
          </ButtonLink>
        }
      />

      {reports.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong bg-surface px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            <icons.reports className="size-6" />
          </span>
          <p className="font-semibold text-ink">No match reports yet</p>
          <p className="max-w-sm text-sm text-muted">Match one of your CVs against a job, and the report shows up here.</p>
          <ButtonLink href="/app/analyses/new" className="mt-2">
            Get your first match report
          </ButtonLink>
        </div>
      ) : (
        <section className="rounded-2xl border border-line bg-surface px-6 py-3" aria-label="Your match reports">
          <ul className="divide-y divide-line">
            {reports.map((r) => (
              <li key={r.id}>
                <Link href={`/app/analyses/${r.id}`} className="-mx-3 flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-sunken/60">
                  <ScoreBadge score={r.score} status={r.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{jobLabel(r)}</p>
                    <p className="truncate text-xs text-muted">
                      {r.cv_name} · <LocalDate iso={r.created_at} />
                    </p>
                  </div>
                  <span
                    className={
                      r.status === "failed"
                        ? "hidden text-xs font-semibold text-missing sm:block"
                        : "hidden text-xs font-medium text-muted sm:block"
                    }
                  >
                    {statusText(r.status, r.score)}
                  </span>
                  <icons.arrow className="size-4 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
