import { ProductDemo } from "./product-demo";

// The dark green panel: headline, the animated demo, three proof points.
export function Showcase({ headline = true }: { headline?: boolean }) {
  return (
    <div className="relative isolate flex h-full flex-col justify-center overflow-hidden bg-night px-10 py-10 xl:px-14">
      <div aria-hidden className="absolute -top-40 -right-32 -z-10 size-[560px] rounded-full bg-[#10b981] opacity-30 blur-[100px]" />
      <div aria-hidden className="absolute -bottom-48 -left-24 -z-10 size-[460px] rounded-full bg-[#0891b2] opacity-30 blur-[100px]" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(rgb(255_255_255/0.6)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.6)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div className="mx-auto w-full max-w-[760px]">
        {headline && (
          <>
            <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-night-muted uppercase">
              <span className="size-2 animate-pulse rounded-full bg-lime shadow-[0_0_12px_var(--color-lime)]" />
              See it in action
            </p>
            <h2 className="mt-3 max-w-[700px] text-[34px] leading-[1.1] font-bold text-night-text xl:text-[38px]">
              See exactly <span className="text-glow">why</span> your CV gets through, before you apply.
            </h2>
          </>
        )}
        <ProductDemo className="mt-7" />
        <dl className="mt-7 flex [@media(max-height:820px)]:hidden flex-wrap gap-x-10 gap-y-4 text-[13px] text-night-muted">
          {[
            ["2 min", "to your first report"],
            ["100%", "of points quoted from your CV"],
            ["₦0", "to start"],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="block font-display text-2xl font-bold text-night-text">{value}</span>
                {label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
