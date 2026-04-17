import { useMemo } from 'react'
import { formatNumber } from '../utils/formatters'
import Panel from './ui/Panel'
import Badge from './ui/Badge'

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

export default function SolutionPanel({ parsedData, onVariableChange }) {
  const variableEntries = useMemo(() => {
    if (!parsedData?.variables) return []
    return Object.entries(parsedData.variables).filter(([, value]) => Number.isFinite(value))
  }, [parsedData])

  if (!parsedData) {
    return (
      <Panel title="Solution" subtitle="Steps and variables appear after solving a problem.">
        <p className="text-sm text-[#9ca3af]">No parsed data yet.</p>
      </Panel>
    )
  }

  return (
    <Panel
      title="Solution"
      subtitle={toTitleCase(parsedData.type)}
      action={<Badge variant="neutral">{String(parsedData.domain ?? 'physics').toUpperCase()}</Badge>}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[#1f2937] bg-[#0b0f17] p-3">
          <p className="text-xs text-[#9ca3af]">Answer</p>
          <p className="mt-1 text-sm font-medium text-[#e5e7eb]">
            {formatNumber(parsedData.answer?.value)}{' '}
            <span className="text-[#22d3ee]">{parsedData.answer?.unit}</span>
          </p>
          {parsedData.answer?.explanation ? (
            <p className="mt-2 text-xs text-[#9ca3af]">{parsedData.answer.explanation}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#9ca3af]">Steps</p>
          {(parsedData.steps ?? []).slice(0, 6).map((step, index) => (
            <div key={`${index + 1}-${step}`} className="rounded-xl border border-[#1f2937] bg-[#0b0f17] p-3">
              <p className="text-xs text-[#9ca3af]">Step {index + 1}</p>
              <p className="mt-1 text-sm text-[#e5e7eb]">{step}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9ca3af]">Variables</p>
            <Badge variant="neutral">{variableEntries.length}</Badge>
          </div>
          {variableEntries.map(([key, value]) => {
            const sliderConfig = getSliderConfig(value)
            return (
              <label key={key} className="block rounded-xl border border-[#1f2937] bg-[#0b0f17] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-[#e5e7eb]">{toLabel(key)}</span>
                  <span className="text-xs text-[#9ca3af]">
                    {formatNumber(value)} {parsedData.units?.[key] || ''}
                  </span>
                </div>
                <input
                  type="range"
                  min={sliderConfig.min}
                  max={sliderConfig.max}
                  step={sliderConfig.step}
                  value={value}
                  onChange={(event) => onVariableChange?.(key, Number(event.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded bg-[#1f2937] accent-[#22d3ee]"
                />
              </label>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}
