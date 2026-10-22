import type { Metadata } from "next";
import Link from "next/link";

import { icons } from "@/components/app/icons";
import { LocalDate } from "@/components/app/local-date";
import { PageHeader } from "@/components/app/page-header";
import { ScoreBadge } from "@/components/app/score-badge";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { api, apiOrNotFound } from "@/lib/api";
import { formatBytes, jobLabel } from "@/lib/format";
import type { AnalysisSummary, CVDetail } from "@/lib/types";

import { deleteCV } from "../actions";
import { RenameForm } from "./rename-form";

const getCV = (id: string) => apiOrNotFound<CVDetail>(`/cvs/${encodeURIComponent(id)}`);

export async function generateMetadata({ params }: PageProps<"/app/cvs/[id]">): Promise<Metadata> {
  return { title: (await getCV((await params).id)).name };
}

export default async function CVPage({ params }: PageProps<"/app/cvs/[id]">) {
  const { id } = await params;
  const [cv, analyses] = await Promise.all([getCV(id), api<AnalysisSummary[]>("/analyses")]);
  const reports = analyses.filter((a) => a.cv_id === cv.id);
  const details = [
    cv.filename,
    cv.file_type.toUpperCase(),
    formatBytes(cv.file_size),
    cv.page_count !== null && `${cv.page_count} page${cv.page_count === 1 ? "" : "s"}`,
    `${cv.char_count.toLocaleString()} characters read`,
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: "/app/cvs", label: "All CVs" }}
        title={<RenameForm key={cv.name} id={cv.id} name={cv.name} />}
        description={
          <>
            {details.join(" · ")} · uploaded <LocalDate iso={cv.created_at} />
          </>
        }
        actions={
          <>
            <ConfirmButton
              label={
                <>
                  <icons.trash className="size-4" /> Delete
                </>
              }
              question={
                reports.length
                  ? `Delete this CV and its ${reports.length} match report${reports.length === 1 ? "" : "s"} for good?`
                  : "Delete this CV for good?"
              }
              confirmLabel="Delete CV"
              pendingLabel="Deleting…"
              action={deleteCV.bind(null, cv.id)}
            />
            <ButtonLink href={`/app/analyses/new?cv=${cv.id}`}>
              Match it to a job <icons.arrow className="size-4" />
            </ButtonLink>
          </>
        }
      />

      {cv.extraction_warning && (
        <Alert tone="info">
          <strong className="font-semibold text-ink">Check the text below.</strong> {cv.extraction_warning}
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-line bg-surface p-6" aria-labelledby="cv-text">
          <h2 id="cv-text" className="text-lg font-bold text-ink">
            What we read from your CV
          </h2>
          <p className="mt-1 text-sm text-muted">
            This text is what gets matched against jobs. If something important is missing, the original file probably stores it as an
            image.
          </p>
          <div className="mt-4 max-h-[36rem] overflow-y-auto rounded-xl border border-line bg-canvas p-5">
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-ink-soft">{cv.text}</p>
          </div>
        </section>

        <section className="self-start rounded-2xl border border-line bg-surface p-6" aria-labelledby="cv-reports">
          <h2 id="cv-reports" className="text-lg font-bold text-ink">
            Match reports with this CV
          </h2>
          {reports.length ? (
            <ul className="mt-3 divide-y divide-line">
              {reports.map((a) => (
                <li key={a.id}>
                  <Link href={`/app/analyses/${a.id}`} className="-mx-3 flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-sunken/60">
                    <ScoreBadge score={a.score} status={a.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{jobLabel(a)}</p>
                      <p className="text-xs text-muted">
                        <LocalDate iso={a.created_at} />
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">None yet. Match this CV to a job to see how it does.</p>
          )}
        </section>
      </div>
    </div>
  );
}
