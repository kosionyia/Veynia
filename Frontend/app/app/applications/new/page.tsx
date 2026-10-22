import type { Metadata } from "next";

import { PageHeader } from "@/components/app/page-header";
import { Alert } from "@/components/ui/alert";
import { api, apiOrNotFound } from "@/lib/api";
import type { AnalysisDetail, CVSummary } from "@/lib/types";

import { ApplicationForm, type ApplicationDefaults } from "../application-form";

export const metadata: Metadata = { title: "Add application" };

export default async function NewApplicationPage({ searchParams }: PageProps<"/app/applications/new">) {
  const { analysis: analysisId } = await searchParams;
  // From "Track this application" when the report's job lacked a role or company.
  const [cvs, report] = await Promise.all([
    api<CVSummary[]>("/cvs"),
    typeof analysisId === "string" ? apiOrNotFound<AnalysisDetail>(`/analyses/${encodeURIComponent(analysisId)}`) : null,
  ]);
  const defaults: ApplicationDefaults = report
    ? { role: report.job_title ?? "", company: report.job_company ?? "", cv_id: report.cv_id }
    : {};

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        back={{ href: "/app/applications", label: "Applications" }}
        title="Add application"
        description="Keep track of a job you're interested in or have applied to."
      />
      {report && <Alert tone="info">The report for this job doesn&apos;t say the role or company. Fill them in to start tracking it.</Alert>}
      <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <ApplicationForm cvs={cvs.map(({ id, name }) => ({ id, name }))} defaults={defaults} analysisId={report?.id} />
      </section>
    </div>
  );
}
