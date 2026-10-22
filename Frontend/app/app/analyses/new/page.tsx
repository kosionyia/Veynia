import type { Metadata } from "next";

import { icons } from "@/components/app/icons";
import { PageHeader } from "@/components/app/page-header";
import { ButtonLink } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { CVSummary } from "@/lib/types";

import { NewReportForm } from "./new-report-form";

export const metadata: Metadata = { title: "New match report" };

export default async function NewReportPage({ searchParams }: PageProps<"/app/analyses/new">) {
  const [{ cv }, cvs] = await Promise.all([searchParams, api<CVSummary[]>("/cvs")]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        back={{ href: "/app/analyses", label: "Match reports" }}
        title="New match report"
        description="Pick a CV and add the job. You'll see which requirements you meet, with the line from your CV that proves it."
      />
      {cvs.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong bg-surface px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            <icons.cvs className="size-6" />
          </span>
          <p className="font-semibold text-ink">Upload a CV first</p>
          <p className="max-w-sm text-sm text-muted">A match report compares a job with one of your CVs, so you need at least one.</p>
          <ButtonLink href="/app/cvs" className="mt-2">
            Upload a CV
          </ButtonLink>
        </div>
      ) : (
        <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <NewReportForm cvs={cvs.map(({ id, name }) => ({ id, name }))} selected={typeof cv === "string" ? cv : undefined} />
        </section>
      )}
    </div>
  );
}
