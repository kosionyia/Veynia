import type { Metadata } from "next";

import { getUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Overview" };

const STEPS = [
  { n: "1", title: "Upload your CV", body: "PDF or Word. We pull out the text so every claim can be quoted back to you." },
  { n: "2", title: "Add a job", body: "Paste the description or a link. We list what it asks for, required and nice-to-have." },
  { n: "3", title: "Read your match report", body: "A score you can check line by line, the gaps, and honest rewrites for your bullets." },
];

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(new Date()),
  );
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function OverviewPage() {
  const user = await getUser();
  const firstName = user.full_name.split(" ")[0];
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-sm text-muted">{greeting()},</p>
        <h1 className="text-4xl font-semibold text-ink sm:text-5xl">{firstName}.</h1>
        <p className="max-w-xl text-muted">
          Three steps from &ldquo;sent to 200 jobs&rdquo; to knowing exactly what each one is looking for.
        </p>
      </header>
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.n} className="rounded-[var(--radius-card)] border border-line bg-card p-6">
            <span className="font-serif text-3xl text-accent">{step.n}</span>
            <h2 className="mt-3 text-lg font-semibold text-ink">{step.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted">CV upload, jobs and match reports arrive in the next steps of this build.</p>
    </div>
  );
}
