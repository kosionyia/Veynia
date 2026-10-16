import { Logo } from "@/components/logo";

// Two columns on wide screens: the form, and a quiet panel showing what a
// match report looks like, so people know what they're signing up for.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</main>
        <p className="text-xs text-muted">© {new Date().getFullYear()} Veynia</p>
      </div>
      <aside className="relative hidden overflow-hidden border-l border-line bg-paper-deep lg:flex lg:items-center lg:justify-center">
        <SamplePanel />
      </aside>
    </div>
  );
}

const SAMPLE = [
  { status: "match", label: "Python", quote: "Built REST APIs in Django for 2 years" },
  { status: "partial", label: "Docker", quote: "Ran services locally with docker compose" },
  { status: "missing", label: "AWS", quote: "A gap to work on" },
] as const;

const MARK = {
  match: { sign: "✓", cls: "bg-match-soft text-match" },
  partial: { sign: "~", cls: "bg-partial-soft text-partial" },
  missing: { sign: "✕", cls: "bg-missing-soft text-missing" },
};

function SamplePanel() {
  return (
    <div className="w-full max-w-md px-10">
      <p className="font-serif text-3xl leading-tight text-ink">
        Know why a CV gets through <em className="text-accent">before</em> you press apply.
      </p>
      <div className="mt-10 rounded-[var(--radius-card)] border border-line bg-card p-6 shadow-[0_1px_0_var(--color-line),0_18px_40px_-24px_rgba(28,27,25,0.25)]">
        <div className="flex items-baseline gap-3 border-b border-line pb-4">
          <span className="font-serif text-5xl font-semibold text-accent">82</span>
          <span className="text-sm text-muted">Strong match · Backend Developer</span>
        </div>
        <ul className="mt-4 space-y-3">
          {SAMPLE.map((row) => (
            <li key={row.label} className="flex items-start gap-3">
              <span
                aria-hidden
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${MARK[row.status].cls}`}
              >
                {MARK[row.status].sign}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{row.label}</p>
                <p className="text-sm text-muted">
                  {row.status === "missing" ? row.quote : <>&ldquo;{row.quote}&rdquo;</>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-6 text-sm text-muted">
        Every point in the score is backed by a quote from your own CV.
      </p>
    </div>
  );
}
