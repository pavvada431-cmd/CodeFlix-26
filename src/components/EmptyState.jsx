import { motion as Motion } from 'framer-motion'
import { Atom, Beaker, Sparkles } from 'lucide-react'

const DEFAULT_EXAMPLES = [
  'A ball is launched at 20 m/s at 45 degrees',
  'A pendulum of length 2 m swings from 25 degrees',
  'Balance CH4 + O2 -> CO2 + H2O and estimate products',
]

export default function EmptyState({
  examples = DEFAULT_EXAMPLES,
  onSelectExample,
}) {
  return (
    <div className="relative flex min-h-[520px] items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        {[...Array(36)].map((_, index) => (
          <Motion.span
            key={`dot-${index}`}
            initial={{ opacity: 0.2, y: 0 }}
            animate={{ opacity: [0.2, 0.6, 0.2], y: [0, -6, 0] }}
            transition={{ duration: 3 + (index % 5), repeat: Infinity, delay: index * 0.04 }}
            className="absolute h-1.5 w-1.5 rounded-full bg-cyan-300/60"
            style={{
              left: `${(index % 9) * 11 + 6}%`,
              top: `${Math.floor(index / 9) * 20 + 8}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-2xl text-center">
        <div className="mx-auto mb-4 flex w-max items-center gap-3 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-cyan-200">
          <Motion.span animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}>
            <Atom size={18} />
          </Motion.span>
          <Motion.span animate={{ y: [0, -3, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
            <Beaker size={18} />
          </Motion.span>
          <Sparkles size={16} />
        </div>

        <h2 className="text-3xl font-semibold">No simulation running</h2>
        <p className="mx-auto mt-3 max-w-xl text-[var(--color-text-muted)]">
          Enter a problem in the sidebar or try an example below.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {examples.slice(0, 3).map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onSelectExample?.(example)}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-text)] transition hover:scale-[1.02] hover:border-cyan-300/40"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
