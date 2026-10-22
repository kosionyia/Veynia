import type { Metadata } from "next";
import Link from "next/link";

import { icons } from "@/components/app/icons";
import { PageHeader } from "@/components/app/page-header";
import { ScoreBadge } from "@/components/app/score-badge";
import { ButtonLink } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Application, ApplicationStats, ApplicationStatus } from "@/lib/types";

import { IN_PROGRESS, STATUSES, STATUS_LABELS, formatDay, todayUtc } from "./status";
import { StatusSelect } from "./status-select";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationsPage({ searchParams }: PageProps<"/app/applications">) {
  const { status: param } = await searchParams;
  const status = STATUSES.find((s) => s === param);
  const query = status ? `?status=${status}` : "";
  const [applications, stats] = await Promise.all([
    api<Application[]>(`/applications${query}`),
    api<ApplicationStats>("/applications/stats"),
  ]);
  const today = todayUtc();
  const count = (s: ApplicationStatus) => stats.by_status[s] ?? 0;

  const tabs = [
    { href: "/app/applications", label: "All", count: stats.total, active: !status },
    ...STATUSES.map((s) => ({ href: `/app/applications?status=${s}`, label: STATUS_LABELS[s], count: count(s), active: status === s })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description={
          <>
            Where you&apos;ve applied, and what happens next.
            {stats.follow_ups_due > 0 && (
              <span className="font-semibold text-partial">
                {" "}
                {stats.follow_ups_due} follow-up{stats.follow_ups_due === 1 ? "" : "s"} due.
              </span>
            )}
          </>
        }
        actions={
          <ButtonLink href="/app/applications/new">
            Add application <icons.arrow className="size-4" />
          </ButtonLink>
        }
      />

      {stats.total > 0 && (
        <nav aria-label="Filter by status" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink aria-[current=page]:border-transparent aria-[current=page]:bg-night aria-[current=page]:text-night-text"
            >
              {tab.label} <span className="ml-0.5 tabular-nums opacity-70">{tab.count}</span>
            </Link>
          ))}
        </nav>
      )}

      {stats.total === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong bg-surface px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            <icons.applications className="size-6" />
          </span>
          <p className="font-semibold text-ink">No applications yet</p>
          <p className="max-w-sm text-sm text-muted">Add one by hand, or press “Track this application” on any match report.</p>
          <ButtonLink href="/app/applications/new" className="mt-2">
            Add application
          </ButtonLink>
        </div>
      ) : applications.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted">No applications with this status.</p>
      ) : (
        <section className="rounded-2xl border border-line bg-surface px-6 py-3" aria-label="Your applications">
          <ul className="divide-y divide-line">
            {applications.map((a) => {
              const followUp = a.follow_up_on && IN_PROGRESS.includes(a.status) ? a.follow_up_on : null;
              const due = followUp !== null && followUp <= today;
              return (
                <li key={a.id} className="flex items-center gap-4 py-3">
                  <Link href={`/app/applications/${a.id}`} className="group flex min-w-0 flex-1 items-center gap-4">
                    {a.match_score !== null ? (
                      <ScoreBadge score={a.match_score} status="done" />
                    ) : (
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sunken text-muted">
                        <icons.jobs className="size-5" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink group-hover:text-brand">
                        {a.role} <span className="font-normal text-muted">at {a.company}</span>
                      </p>
                      <p className="flex flex-wrap gap-x-2 text-xs text-muted">
                        <span>{a.applied_on ? `Applied ${formatDay(a.applied_on)}` : "Not applied yet"}</span>
                        {a.cv_name && <span>· {a.cv_name}</span>}
                        {followUp && (
                          <span className={cn(due && "font-semibold text-partial")}>
                            · {due ? "Follow up now" : `Follow up ${formatDay(followUp)}`}
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                  <StatusSelect id={a.id} status={a.status} label={`Status of ${a.role} at ${a.company}`} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
