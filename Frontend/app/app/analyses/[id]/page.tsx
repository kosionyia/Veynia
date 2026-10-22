import type { Metadata } from "next";
import Link from "next/link";

import { AutoRefresh } from "@/components/app/auto-refresh";
import { icons } from "@/components/app/icons";
import { LocalDate } from "@/components/app/local-date";
import { PageHeader } from "@/components/app/page-header";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { api, apiOrNotFound } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ACTIVE, effectiveStatus, jobLabel } from "@/lib/format";
import type { AnalysisDetail, Application, RequirementResult, Suggestion, Verdict } from "@/lib/types";

import { STATUS_LABELS as APPLICATION_STATUS, STATUS_STYLES } from "../../applications/status";
import { STATUS_LABELS, VERDICTS } from "../status";
import { CorrectionForm } from "./correction-form";
import { ReportActions } from "./report-actions";
import { AcceptToggle, RequestSuggestionsButton } from "./suggestion-controls";
import { TrackButton } from "./track-button";

const getReport = (id: string) => apiOrNotFound<AnalysisDetail>(`/analyses/${encodeURIComponent(id)}`);

export async function generateMetadata({ params }: PageProps<"/app/analyses/[id]">): Promise<Metadata> {
  return { title: jobLabel(await getReport((await params).id)) };
}

export default async function ReportPage({ params }: PageProps<"/app/analyses/[id]">) {
  const report = await getReport((await params).id);
  const active = ACTIVE.includes(report.status);
  // Whether this report's job is already tracked as an application.
  const tracked = report.status === "done" ? (await api<Application[]>("/applications")).find((a) => a.analysis_id === report.id) : undefined;
  const writing = report.suggestions_status === "queued" || report.suggestions_status === "running";

  return (
    <div className="space-y-8">
      {(active || writing) && <AutoRefresh />}
      <PageHeader
        back={{ href: "/app/analyses", label: "Match reports" }}
        title={jobLabel(report)}
        description={
          <>
            <Link href={`/app/cvs/${report.cv_id}`} className="font-medium text-ink-soft underline-offset-4 hover:text-brand hover:underline">
              {report.cv_name}
            </Link>{" "}
            · started <LocalDate iso={report.created_at} />
          </>
        }
        actions={!active && <ReportActions id={report.id} cvId={report.cv_id} jobId={report.job_id} />}
      />

      {active && <Progress status={report.status} />}

      {report.status === "failed" && (
        <Alert tone="error">
          <strong className="font-semibold">The report didn&apos;t finish.</strong> {report.error} Use “Run again” to try once more.
        </Alert>
      )}

      {report.status === "done" && report.result && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4">
            <p className="flex-1 text-sm text-ink-soft">
              {tracked ? "You're tracking this application." : "Applying for this one? Track it, and Veynia keeps the score and CV with it."}
            </p>
            {tracked ? (
              <Link href={`/app/applications/${tracked.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-brand">
                <span className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[tracked.status])}>{APPLICATION_STATUS[tracked.status]}</span>
                Open application <icons.arrow className="size-4" />
              </Link>
            ) : (
              <TrackButton analysisId={report.id} />
            )}
          </div>
          <Finished report={report} result={report.result} />
        </>
      )}
    </div>
  );
}

const STEPS = ["queued", "extracting", "matching"] as const;

function Progress({ status }: { status: AnalysisDetail["status"] }) {
  const current = STEPS.indexOf(status as (typeof STEPS)[number]);
  return (
    <section role="status" className="rounded-2xl border border-line bg-surface p-6">
      <ol className="space-y-3">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full text-xs font-bold",
                i < current && "bg-match-soft text-match",
                i === current && "bg-brand-soft text-brand",
                i > current && "bg-sunken text-muted",
              )}
            >
              {i < current ? <icons.check className="size-3.5" /> : i === current ? <span className="size-2 animate-pulse rounded-full bg-brand" /> : i + 1}
            </span>
            <span className={i === current ? "font-semibold text-ink" : "text-muted"}>
              {STATUS_LABELS[step]}
              {i === current && "…"}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-sm text-muted">This usually takes a few minutes. The page updates by itself, and you can leave and come back.</p>
    </section>
  );
}

function Finished({ report, result }: { report: AnalysisDetail; result: NonNullable<AnalysisDetail["result"]> }) {
  const order: Record<Verdict, number> = { matched: 0, partial: 1, missing: 2 };
  // Keep each requirement's number (its position from 1): corrections use it.
  const rows = result.requirements
    .map((row, i) => ({ row, number: i + 1 }))
    .sort((a, b) => order[effectiveStatus(a.row)] - order[effectiveStatus(b.row)] || (a.row.importance === "required" ? -1 : 1));
  const count = (status: Verdict) => result.requirements.filter((r) => effectiveStatus(r) === status).length;
  const corrected = result.requirements.filter((r) => r.user_status).length;
  const score = report.score ?? 0;

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-night p-6 text-night-text sm:p-8">
        <div aria-hidden className="absolute -top-24 -right-16 size-72 rounded-full bg-[#10b981] opacity-30 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-10">
          <ScoreRing score={score} />
          <div className="space-y-4">
            <p className="text-lg leading-relaxed">{result.summary}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {(Object.keys(VERDICTS) as Verdict[]).map((v) => (
                <span key={v} className="rounded-lg bg-white/[0.07] px-3 py-1.5">
                  <span className="font-bold">{count(v)}</span> <span className="text-night-muted">{VERDICTS[v].label.toLowerCase()}</span>
                </span>
              ))}
              <span className="rounded-lg px-1 py-1.5 text-night-muted">of {result.requirements.length} requirements</span>
            </div>
            {corrected > 0 && result.model_score !== null && (
              <p className="text-sm text-night-muted">
                Includes {corrected} correction{corrected === 1 ? "" : "s"} by you. Veynia&apos;s own score was {result.model_score}.
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <a href={`/app/analyses/${report.id}/download?file=report-pdf`} className={buttonClass({ variant: "on-dark", size: "sm" })}>
                <icons.download className="size-4" /> PDF report
              </a>
              <a href={`/app/analyses/${report.id}/download?file=report-docx`} className={buttonClass({ variant: "on-dark", size: "sm" })}>
                <icons.download className="size-4" /> Word report
              </a>
            </div>
          </div>
        </div>
      </section>

      {result.warnings.map((warning) => (
        <Alert key={warning} tone="info">
          {warning}
        </Alert>
      ))}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-line bg-surface p-6" aria-labelledby="requirements">
          <h2 id="requirements" className="text-lg font-bold text-ink">
            Requirement by requirement
          </h2>
          <p className="mt-1 text-sm text-muted">What the job asks for, and the line from your CV that backs each verdict.</p>
          <ul className="mt-4 divide-y divide-line">
            {rows.map(({ row, number }) => (
              <RequirementRow key={number} analysisId={report.id} number={number} row={row} />
            ))}
          </ul>
        </section>

        <aside className="space-y-6 self-start">
          <HowScored report={report} result={result} />
          <p className="px-1 text-xs leading-relaxed text-muted">
            Analysed with {report.model} (prompt {report.prompt_version}). AI can be wrong: check the verdicts against your CV and correct any
            that are off.
          </p>
        </aside>
      </div>

      <Suggestions report={report} />
    </>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div
      className="grid size-36 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(#34d399 ${score * 3.6}deg, rgb(255 255 255 / 0.1) 0)` }}
      role="img"
      aria-label={`Match score ${score} out of 100`}
    >
      <div className="grid size-[7.25rem] place-items-center rounded-full bg-night text-center">
        <div>
          <p className="font-display text-5xl leading-none font-bold">{score}</p>
          <p className="mt-1 text-xs text-night-muted">match score</p>
        </div>
      </div>
    </div>
  );
}

function RequirementRow({ analysisId, number, row }: { analysisId: string; number: number; row: RequirementResult }) {
  const verdict = VERDICTS[effectiveStatus(row)];
  return (
    <li className="grid gap-3 py-5 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:gap-4">
      <span className={cn("inline-flex h-7 w-max items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold", verdict.soft)}>
        <span aria-hidden>{verdict.sign}</span>
        {verdict.label}
      </span>
      <div className="min-w-0 space-y-2">
        <p className="font-semibold text-ink">
          {row.requirement}{" "}
          <span className="ml-1 rounded-md bg-sunken px-1.5 py-0.5 align-middle text-[11px] font-semibold text-muted">{row.importance}</span>
        </p>
        {row.user_status && (
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-brand">Corrected by you</span> (Veynia said {VERDICTS[row.status].label.toLowerCase()})
            {row.user_note && <span className="text-muted">: {row.user_note}</span>}
          </p>
        )}
        <p className="text-sm leading-relaxed text-muted">{row.reason}</p>
        {row.cv_evidence && (
          <blockquote className="space-y-1 border-l-2 border-brand/40 pl-3 text-sm">
            <p className="text-ink-soft italic">“{row.cv_evidence}”</p>
            {row.evidence_verified ? (
              <p className="text-xs font-semibold text-match">✓ Found in your CV</p>
            ) : (
              <p className="text-xs font-semibold text-missing">
                {row.user_status ? "Not found in your CV, but you vouched for it" : "Not found in your CV, so it earns no points"}
              </p>
            )}
          </blockquote>
        )}
        <CorrectionForm analysisId={analysisId} number={number} modelStatus={row.status} userStatus={row.user_status ?? null} userNote={row.user_note ?? null} />
      </div>
      <span className="text-sm font-semibold text-muted tabular-nums sm:text-right">
        {row.points} / {row.max_points} pts
      </span>
    </li>
  );
}

function HowScored({ report, result }: { report: AnalysisDetail; result: NonNullable<AnalysisDetail["result"]> }) {
  const { weights, credit, earned, possible } = result.scoring;
  return (
    <section className="rounded-2xl border border-line bg-surface p-6" aria-labelledby="how-scored">
      <h2 id="how-scored" className="text-lg font-bold text-ink">
        How this score works
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Veynia gives each requirement a verdict and quotes the line from your CV that supports it. The score itself is plain arithmetic:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-ink-soft">
        <li>
          Required items are worth <b>{weights.required}</b> points, preferred ones <b>{weights.preferred}</b>.
        </li>
        <li>
          Matched earns {credit.matched * 100}% of them, partly {credit.partial * 100}%, missing {credit.missing * 100}%.
        </li>
        <li>A quote that isn&apos;t in your CV earns nothing, so nothing can be invented.</li>
        <li>If you correct a verdict, your answer decides its points.</li>
      </ul>
      <p className="mt-4 rounded-xl bg-sunken px-4 py-3 text-sm font-semibold text-ink">
        {earned} of {possible} points = {report.score}
      </p>
    </section>
  );
}

function Suggestions({ report }: { report: AnalysisDetail }) {
  const { suggestions_status: status, suggestions } = report;
  const accepted = suggestions?.filter((s) => s.accepted).length ?? 0;

  return (
    <section className="rounded-2xl border border-line bg-surface p-6" aria-labelledby="suggestions">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 id="suggestions" className="text-lg font-bold text-ink">
            Improve your CV for this job
          </h2>
          <p className="mt-1 text-sm text-muted">
            Better ways to word lines already in your CV, for the requirements that lost points. Nothing is invented: anything new is flagged.
          </p>
        </div>
        {status === "done" && <RequestSuggestionsButton analysisId={report.id} redo />}
      </div>

      <div className="mt-5">
        {!status && <RequestSuggestionsButton analysisId={report.id} />}
        {(status === "queued" || status === "running") && (
          <p role="status" className="flex items-center gap-3 rounded-xl bg-sunken px-4 py-3 text-sm text-ink-soft">
            <span className="size-2 animate-pulse rounded-full bg-brand" /> Writing suggestions… this takes a few minutes.
          </p>
        )}
        {status === "failed" && (
          <div className="space-y-3">
            <Alert tone="error">{report.suggestions_error}</Alert>
            <RequestSuggestionsButton analysisId={report.id} redo />
          </div>
        )}
        {status === "done" && suggestions && (
          <>
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted">Every requirement earned its full points: nothing to improve.</p>
            ) : (
              <ul className="grid gap-4 lg:grid-cols-2">
                {suggestions.map((s) => (
                  <SuggestionCard key={s.number} analysisId={report.id} suggestion={s} />
                ))}
              </ul>
            )}
            {accepted > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-brand-soft px-5 py-4">
                <a href={`/app/analyses/${report.id}/download?file=cv-rewrite`} className={buttonClass()}>
                  <icons.download className="size-4" /> Download rewritten CV (.docx)
                </a>
                <p className="text-sm text-ink-soft">
                  {accepted} change{accepted === 1 ? "" : "s"} applied. Plain formatting: paste it into your own CV design.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function SuggestionCard({ analysisId, suggestion }: { analysisId: string; suggestion: Suggestion }) {
  if (!suggestion.original) {
    return (
      <li className="rounded-2xl border border-line bg-canvas p-5">
        <p className="font-semibold text-ink">{suggestion.requirement}</p>
        <p className="mt-2 text-sm text-muted">
          Nothing in your CV covers this yet, so there&apos;s nothing to reword. {suggestion.explanation}
        </p>
      </li>
    );
  }
  return (
    <li className="space-y-3 rounded-2xl border border-line bg-canvas p-5">
      <p className="font-semibold text-ink">{suggestion.requirement}</p>
      <div className="space-y-2 text-sm">
        <p className="rounded-xl bg-missing-soft px-3 py-2 text-ink-soft line-through decoration-missing/40">{suggestion.original}</p>
        <p className="rounded-xl bg-match-soft px-3 py-2 text-ink">{suggestion.rewritten}</p>
      </div>
      <p className="text-sm text-muted">{suggestion.explanation}</p>
      {suggestion.new_terms.length > 0 && (
        <p className="rounded-xl bg-partial-soft px-3 py-2 text-sm text-partial">
          This adds {suggestion.new_terms.join(", ")}, which your CV doesn&apos;t mention. Only keep it if it&apos;s true.
        </p>
      )}
      {suggestion.applicable ? (
        <AcceptToggle analysisId={analysisId} number={suggestion.number} accepted={suggestion.accepted} />
      ) : (
        <p className="text-xs text-muted">
          The original line couldn&apos;t be found exactly in your CV, so this can&apos;t be applied automatically. Copy it by hand if it helps.
        </p>
      )}
    </li>
  );
}
