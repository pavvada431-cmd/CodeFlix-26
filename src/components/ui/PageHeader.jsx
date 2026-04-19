export default function PageHeader({ eyebrow, title, accent, subtitle, actions, stats }) {
  return (
    <header className="mb-6 border-b border-[var(--color-border)] pb-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="mb-2 text-[11px] font-mono uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[var(--color-text)] md:text-4xl">
            {title}
            {accent ? (
              <>
                {' '}
                <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
                  {accent}
                </span>
              </>
            ) : null}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)] md:text-[15px]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {stats && stats.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {stats.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs"
            >
              <span className="font-semibold text-[var(--color-text)]">{s.value}</span>
              <span className="text-[var(--color-text-muted)]">{s.label}</span>
            </span>
          ))}
        </div>
      ) : null}
    </header>
  )
}
