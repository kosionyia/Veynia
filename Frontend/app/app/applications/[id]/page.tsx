import type { Metadata } from "next";
import Link from "next/link";

import { icons } from "@/components/app/icons";
import { LocalDate } from "@/components/app/local-date";
import { PageHeader } from "@/components/app/page-header";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { api, apiOrNotFound } from "@/lib/api";
import { cn } from "@/lib/cn";
import { scoreTone } from "@/lib/format";
import type { Application, CVSummary } from "@/lib/types";

import { deleteApplication } from "../actions";
import { ApplicationForm } from "../application-form";
import { STATUS_LABELS, STATUS_STYLES } from "../status";

const getApplication = (id: string) => apiOrNotFound<Application>(`/applications/${encodeURIComponent(id)}`);

export async function generateMetadata({ params }: PageProps<"/app/applications/[id]">): Promise<Metadata> {
  const a = await getApplication((await params).id);
  return { title: `${a.role} at ${a.company}` };
}

export default async function ApplicationPage({ params }: PageProps<"/app/applications/[id]">) {
  const { id } = await params;
  const [a, cvs] = await Promise.all([getApplication(id), api<CVSummary[]>("/cvs")]);
  const linkClass = "inline-flex items-center gap-1.5 font-medium text-ink-soft underline-offset-4 hover:text-brand hover:underline";

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: "/app/applications", label: "Applications" }}
        title={
          <h1 className="text-3xl font-bold break-words text-ink">
            {a.role} <span className="font-medium text-muted">at {a.company}</span>
          </h1>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[a.status])}>{STATUS_LABELS[a.status]}</span>
            {a.url && (
              <a href={a.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                Job post ↗
              </a>
            )}
            {a.analysis_id && (
              <Link href={`/app/analyses/${a.analysis_id}`} className={linkClass}>
                Match report
                {a.match_score !== null && (
                  <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-bold", scoreTone(a.match_score))}>{a.match_score}</span>
                )}
              </Link>
            )}
            {a.job_id && (
              <Link href={`/app/jobs/${a.job_id}`} className={linkClass}>
                Job
              </Link>
            )}
            {a.cv_id && a.cv_name && (
              <Link href={`/app/cvs/${a.cv_id}`} className={linkClass}>
                <icons.file className="size-3.5" /> {a.cv_name}
              </Link>
            )}
          </span>
        }
        actions={
          <ConfirmButton
            label={
              <>
                <icons.trash className="size-4" /> Delete
              </>
            }
            question="Delete this application and its history? Your CV and report stay."
            confirmLabel="Delete application"
            pendingLabel="Deleting…"
            action={deleteApplication.bind(null, a.id)}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <ApplicationForm id={a.id} cvs={cvs.map(({ id, name }) => ({ id, name }))} defaults={a} />
        </section>

        <section aria-labelledby="history" className="self-start rounded-2xl border border-line bg-surface p-6">
          <h2 id="history" className="text-lg font-bold text-ink">
            History
          </h2>
          <ol className="mt-4 space-y-4 border-l-2 border-line pl-5">
            {[...a.history].reverse().map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="relative text-sm">
                <span aria-hidden className={cn("absolute top-1 -left-[1.6rem] size-3 rounded-full border-2 border-surface", i === 0 ? "bg-brand" : "bg-line-strong")} />
                <p className="font-semibold text-ink">{STATUS_LABELS[entry.status]}</p>
                <p className="text-xs text-muted">
                  <LocalDate iso={entry.at} />
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
