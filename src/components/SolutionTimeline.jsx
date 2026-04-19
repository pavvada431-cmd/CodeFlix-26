function SolutionTimeline({ steps }) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[var(--color-bg)]/78 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono-display text-xs uppercase tracking-[0.32em] text-[rgba(0,245,255,0.72)]">
            Step-by-Step Solution
          </p>
          <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-white">
            Derivation timeline
          </h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono-display text-xs uppercase tracking-[0.28em] text-slate-300">
          {steps.length} steps
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <article
            key={step.title}
            className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-white/5 p-4"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[rgba(0,245,255,0.18)] bg-[rgba(0,245,255,0.1)] font-mono-display text-sm text-[#00f5ff]">
                {index + 1}
              </div>

              <div className="space-y-2">
                <h3 className="font-heading text-xl font-medium text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-6 text-slate-300">{step.detail}</p>
                <p className="whitespace-pre-line rounded-2xl border border-[rgba(0,245,255,0.12)] bg-[rgba(0,245,255,0.06)] px-4 py-3 font-mono-display text-sm leading-6 text-[#8efbff]">
                  {step.equation}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default SolutionTimeline
