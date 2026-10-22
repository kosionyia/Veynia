import type { Metadata } from "next";
import Link from "next/link";

import { icons } from "@/components/app/icons";
import { LocalDate } from "@/components/app/local-date";
import { PageHeader } from "@/components/app/page-header";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import type { CVSummary } from "@/lib/types";

import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "CVs" };

export default async function CVsPage() {
  const cvs = await api<CVSummary[]>("/cvs");

  return (
    <div className="space-y-8">
      <PageHeader title="Your CVs" description="Upload a CV once, then match it against as many jobs as you like." />

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-4 text-lg font-bold text-ink">Upload a CV</h2>
        <UploadForm />
      </section>

      {cvs.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-6" aria-labelledby="cv-list">
          <h2 id="cv-list" className="text-lg font-bold text-ink">
            Uploaded <span className="font-normal text-muted">({cvs.length})</span>
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {cvs.map((cv) => (
              <li key={cv.id}>
                <Link href={`/app/cvs/${cv.id}`} className="-mx-3 flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-sunken/60">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                    <icons.file className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{cv.name}</p>
                    <p className="truncate text-xs text-muted">
                      {cv.file_type.toUpperCase()} · {formatBytes(cv.file_size)} · uploaded <LocalDate iso={cv.created_at} />
                    </p>
                  </div>
                  {cv.extraction_warning && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-partial-soft px-2 py-1 text-xs font-semibold text-partial">
                      <icons.warning className="size-3.5" /> Check text
                    </span>
                  )}
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
