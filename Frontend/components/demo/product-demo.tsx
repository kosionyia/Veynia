"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

// A looping, scripted walk through the product: upload a CV, paste a job, get
// the score, see a rewrite, track the application. Everything on screen is
// derived from one clock (t, in ms), so the timeline below is the whole script.
const LOOP = 16000;
const T = {
  cv: 600,
  jobStart: 1800,
  jobEnd: 3600,
  analyse: 3900,
  analyseEnd: 6000,
  score: 6000,
  scoreEnd: 7300,
  reqStart: 6300,
  reqGap: 320,
  rewrite: 8800,
  track: 10800,
  toastEnd: 13200,
};

const JOB_TEXT =
  "Backend Developer, Paystack. Must have: Python, Django, PostgreSQL, Docker, REST APIs. Nice to have: AWS.";

const REQUIREMENTS = [
  { name: "Python", quote: "3 years of Python at Kuda", status: "match" },
  { name: "Django", quote: "Built 12 REST endpoints in Django", status: "match" },
  { name: "PostgreSQL", quote: "Designed the orders schema", status: "match" },
  { name: "Docker", quote: "Ran services with compose", status: "partial" },
  { name: "AWS", quote: "Not in your CV yet", status: "missing" },
] as const;

const ANALYSE_STEPS = ["Reading the job", "Checking your CV", "Scoring with evidence"];

const STEPS = [
  { label: "Upload your CV", from: 0 },
  { label: "Paste a job", from: T.jobStart },
  { label: "Get your score", from: T.analyse },
  { label: "Improve & track", from: T.rewrite },
];

const progress = (t: number, start: number, end: number) => Math.min(1, Math.max(0, (t - start) / (end - start)));
const easeOut = (x: number) => 1 - (1 - x) ** 3;

function useClock(): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (still) {
        setT(LOOP - 1500); // the finished state, no motion
        return;
      }
      // ~30 fps is plenty for this and halves the renders.
      if (now - last > 33) {
        last = now;
        setT((now - start) % LOOP);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return t;
}

const STATUS = {
  match: { sign: "✓", dot: "bg-[#34d399] text-[#04241a]", label: "Matched" },
  partial: { sign: "~", dot: "bg-[#facc15] text-[#2a2203]", label: "Partly" },
  missing: { sign: "✕", dot: "bg-[#fb7185] text-[#2b0710]", label: "Missing" },
};

function Reveal({ show, children, className }: { show: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "transition-all duration-500 ease-out",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-night-line bg-white/[0.035] p-3.5", className)}>
      <p className="text-[10px] font-bold tracking-[0.08em] text-night-muted uppercase">{title}</p>
      {children}
    </div>
  );
}

export function ProductDemo({ className }: { className?: string }) {
  const t = useClock();

  const typed = Math.round(progress(t, T.jobStart, T.jobEnd) * JOB_TEXT.length);
  const analysing = t >= T.analyse && t < T.analyseEnd;
  const analyseStep = Math.min(ANALYSE_STEPS.length - 1, Math.floor(progress(t, T.analyse, T.analyseEnd) * ANALYSE_STEPS.length));
  const scored = t >= T.score;
  const score = Math.round(easeOut(progress(t, T.score, T.scoreEnd)) * 82);
  const activeStep = STEPS.findLastIndex((s) => t >= s.from);

  return (
    <div className={className}>
      <p className="sr-only">
        A short animation: a CV is uploaded, a job description is pasted, Veynia scores the match at 82 with a
        quote from the CV for each requirement, suggests a rewrite, and saves the job to the applications tracker.
      </p>
      <div
        aria-hidden
        className="overflow-hidden rounded-2xl border border-night-line bg-night-panel/85 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur-md"
      >
        {/* window chrome */}
        <div className="flex items-center gap-3 border-b border-night-line px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
          </div>
          <div className="mx-auto rounded-md bg-white/5 px-3 py-1 text-[11px] text-night-muted">app.veynia.com/analyses/new</div>
        </div>

        <div className="grid grid-cols-[136px_minmax(0,1fr)] text-night-text">
          <div className="space-y-0.5 border-r border-night-line p-3 text-[11.5px] text-night-muted">
            {["Overview", "Match reports", "CVs", "Jobs", "Applications"].map((item, i) => {
              const on = i === (t >= T.track ? 4 : 1);
              return (
                <div
                  key={item}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 whitespace-nowrap transition-colors duration-500",
                    on && "bg-brand/15 font-semibold text-night-text",
                  )}
                >
                  <span className={cn("size-2.5 rounded-[4px]", on ? "bg-brand" : "bg-white/20")} />
                  {item}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 p-3.5">
            {/* 1. inputs */}
            <Card title="New analysis">
              <div
                className={cn(
                  "mt-2.5 flex items-center gap-2.5 rounded-lg border border-dashed p-2.5 transition-all duration-500",
                  t >= T.cv ? "border-brand/50 bg-brand/10" : "border-white/15",
                )}
              >
                <span className="grid size-7 place-items-center rounded-md bg-[#e11d48]/85 text-[9px] font-bold text-white">PDF</span>
                <div className="min-w-0 text-[11px]">
                  {t >= T.cv ? (
                    <>
                      <p className="truncate font-semibold">Kaira_Onyia_CV.pdf</p>
                      <p className="text-night-muted">2 pages · text extracted</p>
                    </>
                  ) : (
                    <p className="text-night-muted">Drop your CV here</p>
                  )}
                </div>
                {t >= T.cv && <span className="ml-auto text-[11px] text-[#34d399]">✓</span>}
              </div>
              <div className="mt-2 h-[58px] overflow-hidden rounded-lg border border-white/10 bg-black/20 p-2 text-[10.5px] leading-snug text-night-text/85">
                {typed > 0 ? JOB_TEXT.slice(0, typed) : <span className="text-night-muted">Paste the job description…</span>}
                {t >= T.jobStart && t < T.analyse && <span className="ml-px inline-block h-3 w-px animate-pulse bg-[#34d399] align-middle" />}
              </div>
              <div
                className={cn(
                  "bg-brand-gradient mt-2 flex h-8 items-center justify-center gap-2 rounded-lg text-[11px] font-bold text-white transition-all duration-300",
                  t >= T.analyse - 250 && t < T.analyse && "scale-95 brightness-110",
                )}
              >
                {analysing ? (
                  <>
                    <span className="size-3 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    {ANALYSE_STEPS[analyseStep]}…
                  </>
                ) : scored ? (
                  "✓ Analysis complete"
                ) : (
                  "Analyse match →"
                )}
              </div>
            </Card>

            {/* 2. score */}
            <Card title="Match · Backend Developer">
              <div className="mt-2 flex items-center gap-3">
                <div
                  className="grid size-[68px] shrink-0 place-items-center rounded-full"
                  style={{ background: `conic-gradient(#10b981 0 ${score}%, rgb(255 255 255 / 0.08) 0)` }}
                >
                  <div className="grid size-[54px] place-items-center rounded-full bg-[#0f211d] font-display text-xl font-bold">
                    {scored ? score : "–"}
                  </div>
                </div>
                <div className="text-[11px] text-night-muted">
                  <p className="text-[12.5px] font-semibold text-night-text">{score >= 82 ? "Strong match" : scored ? "Scoring…" : "Waiting for inputs"}</p>
                  {scored ? "Every point quoted from your CV" : "Upload a CV and a job"}
                </div>
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {REQUIREMENTS.map((req, i) => {
                  const show = t >= T.reqStart + i * T.reqGap;
                  const s = STATUS[req.status];
                  return (
                    <li
                      key={req.name}
                      className={cn(
                        "flex items-center gap-2 text-[11px] transition-all duration-500",
                        show ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
                      )}
                    >
                      <span className={cn("grid size-4 shrink-0 place-items-center rounded-[5px] text-[9px] font-black", s.dot)}>{s.sign}</span>
                      <span className="font-semibold">{req.name}</span>
                      <span className="truncate text-night-muted">&ldquo;{req.quote}&rdquo;</span>
                    </li>
                  );
                })}
              </ul>
            </Card>

            {/* 3. rewrite */}
            <Card title="Suggested rewrite">
              <div className="relative">
              <Reveal show={t >= T.rewrite} className="mt-2 space-y-1.5 text-[10.5px] leading-snug">
                <p className="rounded-md bg-white/[0.04] p-2 text-night-muted line-through decoration-[#fb7185]/60">
                  Worked with Docker on projects.
                </p>
                <p className="rounded-md border border-brand/40 bg-brand/10 p-2 text-night-text">
                  Containerised 3 Django services with Docker Compose, cutting local setup from a day to 10 minutes.
                </p>
                <p className="text-[10px] text-[#facc15]/90">Check “10 minutes” is true before you use it.</p>
              </Reveal>
              {t < T.rewrite && <Skeleton />}
              </div>
            </Card>

            {/* 4. tracker */}
            <Card title="Applications">
              <div className="mt-1.5 text-[11px]">
                <Reveal show={t >= T.track}>
                  <Row role="Backend Developer · Paystack" status="Applied" score={82} tone="brand" fresh={t < T.toastEnd} />
                </Reveal>
                <Row role="Python Engineer · Moniepoint" status="Interviewing" score={74} tone="lime" />
                <Row role="Junior Developer · Andela" status="Rejected" score={51} tone="rose" />
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* step captions */}
      <ol className="mt-5 grid grid-cols-4 gap-2" aria-hidden>
        {STEPS.map((step, i) => (
          <li key={step.label} className="space-y-2">
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#34d399] transition-[width] duration-300 ease-linear"
                style={{
                  width: `${i < activeStep ? 100 : i === activeStep ? progress(t, step.from, STEPS[i + 1]?.from ?? LOOP) * 100 : 0}%`,
                }}
              />
            </div>
            <p className={cn("text-xs transition-colors", i === activeStep ? "font-semibold text-night-text" : "text-night-muted")}>
              <span className="mr-1 text-[#34d399]">{i + 1}</span>
              {step.label}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="absolute inset-x-0 top-2 space-y-1.5">
      <div className="h-7 rounded-md bg-white/[0.04]" />
      <div className="h-12 rounded-md bg-white/[0.04]" />
    </div>
  );
}

const TONES = {
  brand: "bg-[#34d399]/15 text-[#34d399]",
  lime: "bg-[#a3e635]/15 text-[#a3e635]",
  rose: "bg-[#fb7185]/15 text-[#fb7185]",
};

function Row({
  role,
  status,
  score,
  tone,
  fresh,
}: {
  role: string;
  status: string;
  score: number;
  tone: keyof typeof TONES;
  fresh?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto_24px] items-center gap-2 border-b border-night-line py-[7px] transition-colors duration-700 last:border-0",
        fresh && "bg-brand/10",
      )}
    >
      <span className="truncate">{role}</span>
      <span className={cn("rounded-full px-2 py-0.5 text-[9.5px] font-bold", TONES[tone])}>{status}</span>
      <span className="text-right text-night-muted">{score}</span>
    </div>
  );
}
