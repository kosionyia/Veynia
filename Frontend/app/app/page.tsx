import type { Metadata } from "next";

import { icons } from "@/components/app/icons";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { getUser } from "@/lib/dal";
import type { AnalysisSummary, ApplicationStats } from "@/lib/types";

export const metadata: Metadata = { title: "Overview" };

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(new Date()),
  );
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function OverviewPage() {
  const [user, analyses, stats] = await Promise.all([
    getUser(),
    api<AnalysisSummary[]>("/analyses"),
    api<ApplicationStats>("/applications/stats"),
  ]);
  const scored = analyses.filter((a) => a.score !== null);
  const average = scored.length ? Math.round(scored.reduce((sum, a) => sum + (a.score ?? 0), 0) / scored.length) : null;
  const best = scored.length ? Math.max(...scored.map((a) => a.score ?? 0)) : null;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{greeting()}</p>
          <h1 className="mt-1 text-3xl font-bold text-ink sm:text-4xl">{user.full_name.split(" ")[0]}, here&apos;s your search</h1>
        </div>
        <span
          title="Arrives with match reports"
          className="bg-brand-gradient inline-flex h-11 cursor-default items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white opacity-60"
        >
          New match report <icons.arrow className="size-4" />
        </span>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Your numbers">
        <Stat label="Match reports" value={analyses.length} hint={analyses.length ? `${scored.length} scored` : "None yet"} />
        <Stat label="Average score" value={average ?? "–"} hint={best !== null ? `Best so far: ${best}` : "Run your first report"} accent />
        <Stat label="Applications" value={stats.total} hint={`${stats.by_status.applied ?? 0} applied`} />
        <Stat
          label="Interviews"
          value={stats.by_status.interviewing ?? 0}
          hint={stats.follow_ups_due ? `${stats.follow_ups_due} follow-up${stats.follow_ups_due > 1 ? "s" : ""} due` : "No follow-ups due"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-lg font-bold text-ink">Recent match reports</h2>
          {analyses.length ? (
            <ul className="mt-4 divide-y divide-line">
              {analyses.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center gap-4 py-3">
                  <ScoreBadge score={a.score} status={a.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {a.job_title ?? "Untitled job"}
                      {a.job_company && <span className="font-normal text-muted"> · {a.job_company}</span>}
                    </p>
                    <p className="truncate text-xs text-muted">{a.cv_name}</p>
                  </div>
                  <time className="text-xs text-muted" dateTime={a.created_at}>
                    {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyReports />
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-lg font-bold text-ink">Applications by stage</h2>
          <Pipeline stats={stats} />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: number | string; hint: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-5", accent ? "border-transparent bg-night text-night-text" : "border-line bg-surface")}>
      <p className={cn("text-[13px] font-medium", accent ? "text-night-muted" : "text-muted")}>{label}</p>
      <p className={cn("mt-2 font-display text-4xl font-bold", accent ? "text-glow" : "text-ink")}>{value}</p>
      <p className={cn("mt-1 text-xs", accent ? "text-night-muted" : "text-muted")}>{hint}</p>
    </div>
  );
}

function ScoreBadge({ score, status }: { score: number | null; status: AnalysisSummary["status"] }) {
  if (score === null) {
    return (
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sunken text-[10px] font-semibold text-muted uppercase">
        {status === "failed" ? "Failed" : "…"}
      </span>
    );
  }
  const tone = score >= 75 ? "bg-match-soft text-match" : score >= 50 ? "bg-partial-soft text-partial" : "bg-missing-soft text-missing";
  return <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl font-display text-base font-bold", tone)}>{score}</span>;
}

const STAGES = [
  { key: "saved", label: "Saved", color: "bg-line-strong" },
  { key: "applied", label: "Applied", color: "bg-teal" },
  { key: "interviewing", label: "Interviewing", color: "bg-brand" },
  { key: "offer", label: "Offer", color: "bg-lime" },
  { key: "rejected", label: "Rejected", color: "bg-missing/70" },
] as const;

function Pipeline({ stats }: { stats: ApplicationStats }) {
  const max = Math.max(1, ...STAGES.map((s) => stats.by_status[s.key] ?? 0));
  return (
    <>
      <ul className="mt-5 space-y-3.5">
        {STAGES.map((stage) => {
          const count = stats.by_status[stage.key] ?? 0;
          return (
            <li key={stage.key}>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">{stage.label}</span>
                <span className="font-semibold text-ink">{count}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-sunken">
                <div className={cn("h-full rounded-full", stage.color)} style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      {stats.total === 0 && <p className="mt-5 text-sm text-muted">Save a job from a match report and it shows up here.</p>}
    </>
  );
}

const STEPS = [
  { title: "Upload your CV", body: "PDF or Word. We pull out the text so every claim can be quoted back to you.", icon: icons.cvs },
  { title: "Add a job", body: "Paste the description or a link; we list what it asks for.", icon: icons.jobs },
  { title: "Read your report", body: "A score you can check line by line, the gaps, and honest rewrites.", icon: icons.reports },
];

function EmptyReports() {
  return (
    <div className="mt-4">
      <p className="text-sm text-muted">No reports yet. Three steps to your first one:</p>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {STEPS.map(({ title, body, icon: Icon }, i) => (
          <li key={title} className="rounded-xl border border-line bg-canvas p-4">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
                <Icon className="size-4" />
              </span>
              <span className="text-xs font-bold text-muted">STEP {i + 1}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
