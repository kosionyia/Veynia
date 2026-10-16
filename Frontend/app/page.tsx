import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";

// A holding page until the full landing page (problem, who it's for, pricing).
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col px-6 py-8 sm:px-12">
      <header className="flex items-center justify-between">
        <Logo />
        <ButtonLink href="/login" variant="ghost">
          Sign in
        </ButtonLink>
      </header>
      <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center py-20">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">For graduates who are job hunting</p>
        <h1 className="mt-5 text-5xl leading-[1.05] font-semibold text-ink sm:text-6xl">
          Stop sending the same CV to two hundred jobs.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Paste a job, upload your CV, and see what matches, what&apos;s missing and how to say it better, with
          every point backed by your own words.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/register" size="lg">
            Get your first match report
          </ButtonLink>
          <ButtonLink href="/login" size="lg" variant="secondary">
            I have an account
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
