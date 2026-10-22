import type { Metadata } from "next";
import Link from "next/link";

import { icons } from "@/components/app/icons";
import { LocalDate } from "@/components/app/local-date";
import { PageHeader } from "@/components/app/page-header";
import { ScoreBadge } from "@/components/app/score-badge";
import { ButtonLink } from "@/components/ui/button";
import { api } from "@/lib/api";
import { jobName } from "@/lib/format";
import type { AnalysisSummary, JobSummary } from "@/lib/types";

export const metadata: Metadata = { title: "Jobs" };

export default async function JobsPage() {
  const [jobs, reports] = await Promise.all([api<JobSummary[]>("/jobs"), api<AnalysisSummary[]>("/analyses")]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Jobs"
        description="Every job you've added. Match another CV against any of them."
        actions={
          <ButtonLink href="/app/analyses/new">
            Add a job <icons.arrow className="size-4" />
          </ButtonLink>
        }
      />

      {jobs.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong bg-surface px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            <icons.jobs className="size-6" />
          </span>
          <p className="font-semibold text-ink">No jobs yet</p>
          <p className="max-w-sm text-sm text-muted">Jobs are saved when you start a match report. Paste one in to get going.</p>
          <ButtonLink href="/app/analyses/new" className="mt-2">
            Start a match report
          </ButtonLink>
        </div>
      ) : (
        <section className="rounded-2xl border border-line bg-surface px-6 py-3" aria-label="Your jobs">
          <ul className="divide-y divide-line">
            {jobs.map((job) => {
              const scored = reports.filter((r) => r.job_id === job.id && r.score !== null);
              const best = scored.length ? Math.max(...scored.map((r) => r.score ?? 0)) : null;
              const count = reports.filter((r) => r.job_id === job.id).length;
              return (
                <li key={job.id}>
                  <Link href={`/app/jobs/${job.id}`} className="-mx-3 flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-sunken/60">
                    {best !== null ? (
                      <ScoreBadge score={best} status="done" />
                    ) : (
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sunken text-muted">
                        <icons.jobs className="size-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{jobName(job)}</p>
                      <p className="truncate text-xs text-muted">
                        {job.source === "link" ? "From a link" : "Pasted"} · added <LocalDate iso={job.created_at} /> · {count} report
                        {count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <icons.arrow className="size-4 shrink-0 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
