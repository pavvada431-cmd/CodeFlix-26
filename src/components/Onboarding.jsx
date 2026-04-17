import { useState } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { PencilLine, Brain, Play, Sparkles, Zap, FlaskConical } from 'lucide-react'

export const ONBOARDING_STORAGE_KEY = 'codeflix_onboarded'
export const ONBOARDING_EXAMPLE = 'A ball is thrown at 25 m/s at 60 degrees'

function AnimatedInputToSim() {
  return (
    <div className="relative mx-auto mt-4 h-36 w-full max-w-md overflow-hidden rounded-2xl border border-cyan-300/25 bg-[color:color-mix(in_oklab,var(--color-surface)_85%,transparent)]">
      <Motion.div
        initial={{ x: -220, opacity: 0 }}
        animate={{ x: 18, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute left-0 top-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text-muted)]"
      >
        “A ball is thrown...”
      </Motion.div>
      <Motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/30 bg-cyan-400/10 p-2 text-cyan-200"
      >
        <Sparkles size={18} />
      </Motion.div>
      <Motion.div
        initial={{ x: 220, opacity: 0, rotate: -8 }}
        animate={{ x: -18, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="absolute right-0 top-8 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text-muted)]"
      >
        <span className="h-2 w-2 rounded-full bg-cyan-300" />
        3D Simulation
      </Motion.div>
    </div>
  )
}

function StepCard({ icon, title, description, delay }) {
  const IconComponent = icon

  return (
    <Motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
    >
      <div className="mb-2 inline-flex rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-2 text-cyan-200">
        <IconComponent size={16} />
      </div>
      <h4 className="font-semibold">{title}</h4>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>
    </Motion.div>
  )
}

export default function Onboarding({
  isOpen,
  onClose,
  onComplete,
  onRunExample,
  onPickSubject,
}) {
  const [stepIndex, setStepIndex] = useState(0)

  const finish = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    onComplete?.()
    onClose?.()
    setStepIndex(0)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-[131] w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-2">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? 'bg-cyan-300' : 'bg-[var(--color-border)]'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {stepIndex === 0 && (
            <Motion.div key="welcome" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="text-3xl font-bold">Welcome to CodeFlix! 🔬</h2>
              <p className="mt-2 text-[var(--color-text-muted)]">
                Type any physics or chemistry problem in plain English and watch it come alive.
              </p>
              <AnimatedInputToSim />
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStepIndex(1)}
                  className="rounded-xl border border-cyan-300/40 bg-cyan-400 px-5 py-2.5 font-semibold text-slate-950"
                >
                  Get Started
                </button>
              </div>
            </Motion.div>
          )}

          {stepIndex === 1 && (
            <Motion.div key="how" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold">How It Works</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <StepCard icon={PencilLine} title="Describe your problem in words" description="No rigid syntax needed." delay={0.05} />
                <StepCard icon={Brain} title="AI understands and extracts variables" description="Units and formulas included." delay={0.12} />
                <StepCard icon={Play} title="Watch the interactive simulation" description="Explore, pause, and tweak values." delay={0.2} />
              </div>
              <div className="mt-6 flex justify-between">
                <button type="button" onClick={() => setStepIndex(0)} className="rounded-xl border border-[var(--color-border)] px-4 py-2">Back</button>
                <button
                  type="button"
                  onClick={() => setStepIndex(2)}
                  className="rounded-xl border border-cyan-300/40 bg-cyan-400 px-5 py-2.5 font-semibold text-slate-950"
                >
                  Next
                </button>
              </div>
            </Motion.div>
          )}

          {stepIndex === 2 && (
            <Motion.div key="try" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold">Try It!</h2>
              <p className="mt-2 text-[var(--color-text-muted)]">We pre-filled a great starter problem:</p>
              <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 font-mono text-sm">
                {ONBOARDING_EXAMPLE}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
                    onRunExample?.(ONBOARDING_EXAMPLE)
                    onComplete?.()
                    onClose?.()
                    setStepIndex(0)
                  }}
                  className="rounded-xl border border-cyan-300/40 bg-cyan-400 px-5 py-2.5 font-semibold text-slate-950"
                >
                  Run This Example
                </button>
                <button
                  type="button"
                  onClick={finish}
                  className="rounded-xl border border-[var(--color-border)] px-5 py-2.5 text-[var(--color-text-muted)]"
                >
                  Skip to Dashboard
                </button>
                <button type="button" onClick={() => setStepIndex(3)} className="rounded-xl border border-[var(--color-border)] px-4 py-2">
                  Next
                </button>
              </div>
            </Motion.div>
          )}

          {stepIndex === 3 && (
            <Motion.div key="subject" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold">Pick Your Subject</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    onPickSubject?.('physics')
                    finish()
                  }}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-left"
                >
                  <div className="mb-2 inline-flex rounded-lg border border-cyan-300/30 bg-cyan-400/10 p-2 text-cyan-200">
                    <Zap size={16} />
                  </div>
                  <h3 className="font-semibold">Physics ⚡</h3>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">Mechanics, waves, fields, optics, and thermodynamics.</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onPickSubject?.('chemistry')
                    finish()
                  }}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-left"
                >
                  <div className="mb-2 inline-flex rounded-lg border border-violet-300/30 bg-violet-400/10 p-2 text-violet-200">
                    <FlaskConical size={16} />
                  </div>
                  <h3 className="font-semibold">Chemistry 🧪</h3>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">Bonding, stoichiometry, titration, atomic structure, gas laws.</p>
                </button>
              </div>

              <button
                type="button"
                onClick={finish}
                className="mt-4 rounded-xl border border-[var(--color-border)] px-4 py-2 text-[var(--color-text-muted)]"
              >
                Explore Both
              </button>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
