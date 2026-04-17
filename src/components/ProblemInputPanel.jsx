import { startTransition, useCallback } from 'react'
import SolutionTimeline from './SolutionTimeline'
import TrajectoryChart from './TrajectoryChart'
import { defaultProblem, showcaseProblem } from '../simulations/projectileMath'
import { formatNumber } from '../utils/formatters'

const fields = [
  {
    key: 'velocity',
    label: 'Launch speed',
    unit: 'm/s',
    min: 1,
    max: 120,
    step: 0.5,
  },
  {
    key: 'angle',
    label: 'Launch angle',
    unit: 'deg',
    min: 1,
    max: 89,
    step: 0.5,
  },
  {
    key: 'height',
    label: 'Initial height',
    unit: 'm',
    min: 0,
    max: 30,
    step: 0.1,
  },
  {
    key: 'gravity',
    label: 'Gravity',
    unit: 'm/s²',
    min: 1,
    max: 24,
    step: 0.01,
  },
]

const highlights = [
  {
    key: 'flightTime',
    label: 'Flight time',
    unit: 's',
  },
  {
    key: 'range',
    label: 'Range',
    unit: 'm',
  },
  {
    key: 'maxHeight',
    label: 'Max height',
    unit: 'm',
  },
]

function ProblemInputPanel({ problem, setProblem, solution }) {
  const updateField = useCallback((key) => (event) => {
    const nextValue = Number(event.target.value)

    setProblem((current) => ({
      ...current,
      [key]: Number.isFinite(nextValue) ? nextValue : current[key],
    }))
  }, [setProblem])

  const applyPreset = useCallback((preset) => {
    startTransition(() => {
      setProblem(preset)
    })
  }, [setProblem])

  return (
    <aside className="flex min-h-[760px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/5 shadow-[0_24px_80px_rgba(2,8,23,0.55)] backdrop-blur-xl">
      <div className="border-b border-white/10 px-6 py-6">
        <p className="font-mono-display text-xs uppercase tracking-[0.32em] text-[rgba(0,245,255,0.72)]">
          Problem Input
        </p>
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-white">
              Launch a projectile scenario
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              Adjust the initial conditions and inspect the analytic derivation
              beside a live trajectory simulation.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset(showcaseProblem)}
              className="rounded-full border border-[rgba(0,245,255,0.35)] bg-[rgba(0,245,255,0.1)] px-4 py-2 font-mono-display text-xs uppercase tracking-[0.26em] text-[#00f5ff] transition hover:bg-[rgba(0,245,255,0.16)]"
            >
              Load Showcase
            </button>
            <button
              type="button"
              onClick={() => applyPreset(defaultProblem)}
              className="rounded-full border border-[rgba(255,255,255,0.12)] bg-white/5 px-4 py-2 font-mono-display text-xs uppercase tracking-[0.26em] text-slate-200 transition hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.08)]"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
        {fields.map((field) => (
          <label
            key={field.key}
            className="rounded-3xl border border-white/10 bg-[#0b1324]/80 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-200">{field.label}</span>
              <span className="font-mono-display text-xs uppercase tracking-[0.28em] text-slate-400">
                {field.unit}
              </span>
            </div>

            <input
              type="number"
              value={problem[field.key]}
              min={field.min}
              max={field.max}
              step={field.step}
              onChange={updateField(field.key)}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono-display text-lg text-white outline-none transition focus:border-[rgba(0,245,255,0.45)] focus:bg-[rgba(0,245,255,0.06)]"
            />
          </label>
        ))}
      </div>

      <div className="grid gap-3 px-6 pb-6 sm:grid-cols-3">
        {highlights.map((item) => (
          <div
            key={item.key}
            className="rounded-3xl border border-[rgba(0,245,255,0.12)] bg-[#07111f]/80 p-4"
          >
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="mt-3 font-heading text-3xl font-semibold tracking-tight text-white">
              {formatNumber(solution[item.key])}
              <span className="ml-2 font-mono-display text-base text-[#00f5ff]">
                {item.unit}
              </span>
            </p>
          </div>
        ))}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6">
        <TrajectoryChart data={solution.samples} />
        <SolutionTimeline steps={solution.steps} />
      </div>
    </aside>
  )
}

export default ProblemInputPanel
