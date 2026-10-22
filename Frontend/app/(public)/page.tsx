import { NightPanel, Showcase } from "@/components/demo/showcase";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const STEPS = [
  { title: "Upload your CV", text: "PDF or Word. Upload it once and use it for every job." },
  { title: "Paste the job", text: "The link to the job post, or the description itself." },
  { title: "See the match", text: "A score, what you have, what's missing, and why, point by point." },
  { title: "Fix it, then apply", text: "Rewrite suggestions from your own experience, then track the application." },
];

const AUDIENCE = [
  {
    title: "Fresh graduates",
    text: "Little experience on paper? See which of your projects, internships and NYSC work actually match what the job asks for.",
  },
  {
    title: "Job seekers applying a lot",
    text: "Sending out many applications? Know which roles are worth tailoring your CV for, and keep track of them all in one place.",
  },
  {
    title: "Career switchers",
    text: "Moving into a new field? See which of your skills carry over and which gaps to close first.",
  },
];

// Placeholders: the real plans, prices and features get filled in later.
const PLANS = [
  {
    name: "Free",
    price: "₦0",
    period: "forever",
    features: ["3 reports a month", "[placeholder]", "[placeholder]"],
    cta: "Start free",
  },
  {
    name: "[Plan name]",
    price: "₦3,500",
    period: "a month",
    features: ["Unlimited reports", "AI rewrites", "[placeholder]"],
    cta: "Get started",
    featured: true,
  },
  {
    name: "[Plan name]",
    price: "₦[x]",
    period: "a month",
    features: ["[placeholder]", "[placeholder]", "[placeholder]"],
    cta: "Get started",
  },
];

const FAQS = [
  {
    q: "Is my CV kept private?",
    a: "Yes. Only you can see your CVs and reports, and you can delete a CV whenever you like.",
  },
  {
    q: "Does Veynia write my CV for me?",
    a: "No. It shows how your CV matches a job and suggests better ways to say what you've already done. Every suggestion is based on your own experience, never invented.",
  },
  { q: "What files can I upload?", a: "PDF and Word (.docx) files." },
  { q: "Can I cancel anytime?", a: "[placeholder]" },
];

export default function Home() {
  return (
    <>
      <section className="grid lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col justify-center px-5 py-16 sm:px-12 lg:px-16">
          <div className="max-w-xl">
            <p className="inline-flex w-max items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-soft">
              <span className="size-1.5 rounded-full bg-brand" /> For graduates who are job hunting
            </p>
            <h1 className="mt-6 text-5xl leading-[1.04] font-bold text-ink sm:text-6xl">
              Stop sending the same CV to <span className="bg-brand-gradient bg-clip-text text-transparent">200 jobs.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted">
              Paste a job, upload your CV, and see what matches, what&apos;s missing and how to say it better, with every
              point backed by your own words.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/register" size="lg">
                Get your first match report →
              </ButtonLink>
              <ButtonLink href="#how-it-works" size="lg" variant="secondary">
                See how it works
              </ButtonLink>
            </div>
          </div>
        </div>
        <NightPanel className="flex items-center justify-center px-5 py-12 sm:px-10 xl:px-14">
          <Showcase headline={false} />
        </NightPanel>
      </section>

      <Section
        id="why"
        tag="Why Veynia"
        title="One CV can't fit every job."
        intro="Every job post asks for different things, and recruiters (and their screening software) look for exactly those. Send the same CV everywhere and you mostly hear nothing back, without ever finding out why."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Compare
            tone="bad"
            title="Without Veynia"
            points={["The same CV for every opening", "No idea what the job wanted that you didn't show", "Rejections, or silence, with no reason"]}
          />
          <Compare
            tone="good"
            title="With Veynia"
            points={["A match score for each job", "The exact gaps, quoted from the job post", "Rewrites that use your real experience"]}
          />
        </div>
      </Section>

      <Section id="how-it-works" tag="How it works" title="Two minutes from job post to a clear answer." muted>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-line bg-surface p-6">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-soft font-display text-sm font-bold text-brand-deep">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="who-its-for" tag="Who it's for" title="Built for your first job, or your next one.">
        <div className="grid gap-4 md:grid-cols-3">
          {AUDIENCE.map((who) => (
            <div key={who.title} className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="text-lg font-bold text-ink">{who.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{who.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="pricing" tag="Pricing" title="Start free. Upgrade when you're applying a lot." muted>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col rounded-2xl bg-surface p-7",
                plan.featured ? "border-2 border-brand shadow-[0_24px_60px_-30px_var(--color-brand)]" : "border border-line",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
                {plan.featured && (
                  <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-deep">Most popular</span>
                )}
              </div>
              <p className="mt-4">
                <span className="font-display text-4xl font-bold text-ink">{plan.price}</span>{" "}
                <span className="text-sm text-muted">{plan.period}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-ink-soft">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span aria-hidden className="font-bold text-brand">
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/register" variant={plan.featured ? "primary" : "secondary"} size="lg" className="mt-8">
                {plan.cta}
              </ButtonLink>
            </div>
          ))}
        </div>
      </Section>

      <Section id="faq" tag="FAQs" title="Questions people ask">
        <div className="max-w-3xl space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-2xl border border-line bg-surface open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span aria-hidden className="text-xl leading-none text-muted transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-6 pb-5 text-sm leading-relaxed text-muted">{faq.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <NightPanel className="px-5 py-20 text-center sm:px-8">
        <h2 className="mx-auto max-w-2xl text-4xl leading-tight font-bold text-night-text">
          See how your CV matches your <span className="text-glow">next job.</span>
        </h2>
        <p className="mt-4 text-night-muted">Free to start. No card needed.</p>
        <ButtonLink href="/register" size="lg" className="mt-8">
          Get your first match report →
        </ButtonLink>
      </NightPanel>
    </>
  );
}

function Section({
  id,
  tag,
  title,
  intro,
  muted,
  children,
}: {
  id: string;
  tag: string;
  title: string;
  intro?: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-16 border-t border-line", muted && "bg-sunken/50")}>
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <p className="text-xs font-bold tracking-[0.12em] text-brand uppercase">{tag}</p>
        <h2 className="mt-3 max-w-3xl text-3xl leading-tight font-bold text-balance text-ink sm:text-4xl">{title}</h2>
        {intro && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{intro}</p>}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

function Compare({ tone, title, points }: { tone: "good" | "bad"; title: string; points: string[] }) {
  const good = tone === "good";
  return (
    <div className={cn("rounded-2xl border p-6", good ? "border-match/25 bg-match-soft" : "border-missing/20 bg-missing-soft")}>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
        {points.map((point) => (
          <li key={point} className="flex gap-2.5">
            <span aria-hidden className={cn("font-bold", good ? "text-match" : "text-missing")}>
              {good ? "✓" : "✕"}
            </span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
