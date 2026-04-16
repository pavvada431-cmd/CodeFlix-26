import { useMemo } from 'react'
import { formatNumber } from '../utils/formatters'

function toTitleCase(value) {
  return String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function toLabel(value) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function getSliderConfig(value) {
  const safeValue = Number.isFinite(value) ? value : 0
  const rawMin = safeValue * 0.1
  const rawMax = safeValue * 3

  return {
    min: Math.min(rawMin, rawMax),
    max: Math.max(rawMin, rawMax),
    step: Math.abs(safeValue * 0.01) || 0.01,
  }
}

function EmptyState() {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[#07111f]/80 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.55)] backdrop-blur-xl">
      <p className="font-mono-display text-xs uppercase tracking-[0.32em] text-[rgba(0,245,255,0.72)]">
        Solution Panel
      </p>
      <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-white">
        Awaiting parsed data
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
        Parse a physics or chemistry problem to render the extracted steps,
        final answer, variables table, and interactive variable sliders.
      </p>
    </section>
  )
}

function SolutionPanel({ parsedData, onVariableChange }) {
  const variableEntries = useMemo(() => {
    if (!parsedData?.variables) {
      return []
    }

    return Object.entries(parsedData.variables).filter(([, value]) =>
      Number.isFinite(value),
    )
  }, [parsedData])

  if (!parsedData) {
    return <EmptyState />
  }

  return (
    <section className="rounded-[30px] border border-white/10 bg-[#07111f]/80 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.55)] backdrop-blur-xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="font-mono-display text-xs uppercase tracking-[0.32em] text-[rgba(0,245,255,0.72)]">
              Parsed Solution
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-white">
              Structured reasoning output
            </h2>
          </div>

          <div className="inline-flex w-fit items-center rounded-full border border-[rgba(0,245,255,0.26)] bg-[rgba(0,245,255,0.1)] px-4 py-2 font-mono-display text-xs uppercase tracking-[0.28em] text-[#00f5ff]">
            {String(parsedData.domain ?? '').toUpperCase()} {'\u2014'}{' '}
            {toTitleCase(parsedData.type)}
          </div>
        </div>

        <div className="space-y-3">
          {(parsedData.steps ?? []).map((step, index) => (
            <article
              key={`${index + 1}-${step}`}
              style={{ animationDelay: `${index * 300}ms` }}
              className="animate-[solution-panel-reveal_0.5s_ease-out_both] rounded-[26px] border border-white/10 bg-[#0b1324]/82 p-4 opacity-0"
            >
              <div className="flex gap-4">
                <div className="w-1 shrink-0 rounded-full bg-[#00f5ff]" />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[rgba(0,245,255,0.18)] bg-[rgba(0,245,255,0.1)] font-mono-display text-sm text-[#00f5ff]">
                      {index + 1}
                    </div>
                    <p className="font-mono-display text-xs uppercase tracking-[0.26em] text-slate-400">
                      Step {index + 1}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    {step}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className="rounded-[28px] border border-[rgba(0,245,255,0.18)] bg-[linear-gradient(180deg,rgba(0,245,255,0.08),rgba(0,245,255,0.02))] p-5">
          <p className="font-mono-display text-xs uppercase tracking-[0.3em] text-[rgba(0,245,255,0.78)]">
            Final Answer
          </p>
          <div className="mt-4 rounded-[24px] border border-[rgba(0,245,255,0.24)] bg-[#0b1324]/88 p-5 shadow-[0_0_30px_rgba(0,245,255,0.08)]">
            <p className="font-heading text-4xl font-semibold tracking-tight text-white">
              {formatNumber(parsedData.answer?.value)}{' '}
              <span className="font-mono-display text-xl text-[#00f5ff]">
                {parsedData.answer?.unit}
              </span>
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {parsedData.answer?.explanation}
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#0b1324]/76 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono-display text-xs uppercase tracking-[0.3em] text-[rgba(0,245,255,0.78)]">
                Extracted Variables
              </p>
              <h3 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-white">
                Variable snapshot
              </h3>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono-display text-xs uppercase tracking-[0.24em] text-slate-300">
              {variableEntries.length} items
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10">
            <table className="min-w-full border-collapse">
              <thead className="bg-[rgba(255,255,255,0.04)]">
                <tr>
                  <th className="px-4 py-3 text-left font-mono-display text-xs uppercase tracking-[0.24em] text-slate-400">
                    Variable
                  </th>
                  <th className="px-4 py-3 text-left font-mono-display text-xs uppercase tracking-[0.24em] text-slate-400">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left font-mono-display text-xs uppercase tracking-[0.24em] text-slate-400">
                    Unit
                  </th>
                </tr>
              </thead>
              <tbody>
                {variableEntries.map(([key, value]) => (
                  <tr
                    key={key}
                    className="border-t border-white/10 bg-[#09111f]/70"
                  >
                    <td className="px-4 py-3 text-sm text-slate-200">
                      {toLabel(key)}
                    </td>
                    <td className="px-4 py-3 font-mono-display text-sm text-white">
                      {formatNumber(value)}
                    </td>
                    <td className="px-4 py-3 font-mono-display text-sm text-[#00f5ff]">
                      {parsedData.units?.[key] ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#0b1324]/76 p-5">
          <p className="font-mono-display text-xs uppercase tracking-[0.3em] text-[rgba(0,245,255,0.78)]">
            Variables Lab
          </p>
          <h3 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-white">
            Explore the parameter space
          </h3>
          <div className="mt-5 space-y-4">
            {variableEntries.map(([key, value]) => {
              const sliderConfig = getSliderConfig(value)

              return (
                <label
                  key={key}
                  className="block rounded-[24px] border border-white/10 bg-[#09111f]/72 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {toLabel(key)}
                      </p>
                      <p className="mt-1 font-mono-display text-xs uppercase tracking-[0.22em] text-slate-400">
                        Range {formatNumber(sliderConfig.min)} to{' '}
                        {formatNumber(sliderConfig.max)} {parsedData.units?.[key]}
                      </p>
                    </div>
                    <div className="font-mono-display text-sm text-[#00f5ff]">
                      {formatNumber(value)} {parsedData.units?.[key]}
                    </div>
                  </div>

                  <input
                    type="range"
                    min={sliderConfig.min}
                    max={sliderConfig.max}
                    step={sliderConfig.step}
                    value={value}
                    onChange={(event) => {
                      if (typeof onVariableChange === 'function') {
                        onVariableChange(key, Number(event.target.value))
                      }
                    }}
                    className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-[linear-gradient(90deg,rgba(0,245,255,0.45),rgba(255,255,255,0.08))] accent-[#00f5ff]"
                  />
                </label>
              )
            })}
          </div>
        </section>
      </div>
    </section>
  )
}

export default SolutionPanel
