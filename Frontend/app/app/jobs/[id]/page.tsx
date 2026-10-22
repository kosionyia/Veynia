import type { Metadata } from "next";
import Link from "next/link";

import { icons } from "@/components/app/icons";
import { LocalDate } from "@/components/app/local-date";
import { PageHeader } from "@/components/app/page-header";
import { ScoreBadge } from "@/components/app/score-badge";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { api, apiOrNotFound } from "@/lib/api";
import { cn } from "@/lib/cn";
import { jobName } from "@/lib/format";
import type { AnalysisSummary, Application, CVSummary, JobDetail } from "@/lib/types";

import { STATUS_LABELS, STATUS_STYLES } from "../../applications/status";
import { deleteJob } from "../actions";
import { MatchForm } from "./match-form";

const getJob = (id: string) => apiOrNotFound<JobDetail>(`/jobs/${encodeURIComponent(id)}`);

export async function generateMetadata({ params }: PageProps<"/app/jobs/[id]">): Promise<Metadata> {
  return { title: jobName(await getJob((await params).id)) };
}

export default async function JobPage({ params }: PageProps<"/app/jobs/[id]">) {
  const { id } = await params;
  const [job, cvs, allReports, allApplications] = await Promise.all([
    getJob(id),
    api<CVSummary[]>("/cvs"),
    api<AnalysisSummary[]>("/analyses"),
    api<Application[]>("/applications"),
  ]);
  const reports = allReports.filter((r) => r.job_id === job.id);
  const applications = allApplications.filter((a) => a.job_id === job.id);
  const required = job.requirements?.filter((r) => r.importance === "required") ?? [];
  const preferred = job.requirements?.filter((r) => r.importance === "preferred") ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: "/app/jobs", label: "Jobs" }}
        title={jobName(job)}
        description={
          <>
            {job.source === "link" ? "Fetched from a link" : "Pasted"} · added <LocalDate iso={job.created_at} />
            {job.url && (
              <>
                {" · "}
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink-soft underline-offset-4 hover:text-brand hover:underline">
                  Original post ↗
                </a>
              </>
            )}
          </>
        }
        actions={
          <ConfirmButton
            label={
              <>
                <icons.trash className="size-4" /> Delete
              </>
            }
            question={
              reports.length
                ? `Delete this job and its ${reports.length} match report${reports.length === 1 ? "" : "s"} for good?`
                : "Delete this job for good?"
            }
            confirmLabel="Delete job"
            pendingLabel="Deleting…"
            action={deleteJob.bind(null, job.id)}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {job.requirements && job.requirements.length > 0 && (
            <section className="rounded-2xl border border-line bg-surface p-6" aria-labelledby="asks">
              <h2 id="asks" className="text-lg font-bold text-ink">
                What the job asks for
              </h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                {[
                  { label: "Required", items: required },
                  { label: "Nice to have", items: preferred },
                ].map(
                  (group) =>
                    group.items.length > 0 && (
                      <div key={group.label}>
                        <p className="text-xs font-bold tracking-[0.08em] text-muted uppercase">{group.label}</p>
                        <ul className="mt-2 space-y-2 text-sm text-ink-soft">
                          {group.items.map((r) => (
                            <li key={r.requirement} className="flex gap-2.5">
                              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                              {r.requirement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ),
                )}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-line bg-surface p-6" aria-labelledby="job-text">
            <h2 id="job-text" className="text-lg font-bold text-ink">
              The job post
            </h2>
            <div className="mt-4 max-h-[32rem] overflow-y-auto rounded-xl border border-line bg-canvas p-5">
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-ink-soft">{job.text}</p>
            </div>
          </section>
        </div>

        <aside className="space-y-6 self-start">
          <section className="rounded-2xl border border-line bg-surface p-6" aria-labelledby="match">
            <h2 id="match" className="text-lg font-bold text-ink">
              Match a CV against this job
            </h2>
            <div className="mt-4">
              {cvs.length ? (
                <MatchForm jobId={job.id} cvs={cvs.map(({ id, name }) => ({ id, name }))} />
              ) : (
                <ButtonLink href="/app/cvs" variant="secondary" className="w-full">
                  Upload a CV first
                </ButtonLink>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-6" aria-labelledby="job-reports">
            <h2 id="job-reports" className="text-lg font-bold text-ink">
              Match reports
            </h2>
            {reports.length ? (
              <ul className="mt-3 divide-y divide-line">
                {reports.map((r) => (
                  <li key={r.id}>
                    <Link href={`/app/analyses/${r.id}`} className="-mx-3 flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-sunken/60">
                      <ScoreBadge score={r.score} status={r.status} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{r.cv_name}</p>
                        <p className="text-xs text-muted">
                          <LocalDate iso={r.created_at} />
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">None yet.</p>
            )}
          </section>

          {applications.length > 0 && (
            <section className="rounded-2xl border border-line bg-surface p-6" aria-labelledby="job-applications">
              <h2 id="job-applications" className="text-lg font-bold text-ink">
                Your application
              </h2>
              <ul className="mt-3 space-y-2">
                {applications.map((a) => (
                  <li key={a.id}>
                    <Link href={`/app/applications/${a.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-sunken/60">
                      <span className="truncate text-sm font-semibold text-ink">{a.role}</span>
                      <span className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[a.status])}>{STATUS_LABELS[a.status]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
