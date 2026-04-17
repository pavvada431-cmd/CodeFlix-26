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
  const safeValue = Number.isFinite(value) ? Math.abs(value) : 1
  
  // Smart range calculation
  let min, max, step
  
  if (safeValue === 0) {
    min = -1
    max = 1
    step = 0.1
  } else if (safeValue < 0.1) {
    min = safeValue * 0.01
    max = safeValue * 100
    step = safeValue * 0.001
  } else if (safeValue < 1) {
    min = safeValue * 0.1
    max = safeValue * 10
    step = safeValue * 0.01
  } else if (safeValue < 100) {
    min = safeValue * 0.1
    max = safeValue * 3
    step = Math.max(safeValue * 0.01, 0.1)
  } else {
    min = safeValue * 0.5
    max = safeValue * 2
    step = Math.max(safeValue * 0.01, 1)
  }
  
  return {
    min: Math.max(0, min), // Prevent negative for most physics values
    max: Math.max(min + 0.1, max),
    step: step || 0.01,
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
            const percentage = sliderConfig.max > sliderConfig.min 
              ? ((value - sliderConfig.min) / (sliderConfig.max - sliderConfig.min)) * 100
              : 50
            
            return (
              <label key={key} className="block rounded-xl border border-[#1f2937] bg-[#0b0f17] p-3 hover:border-[#22d3ee]/50 transition-colors cursor-pointer">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#e5e7eb]">{toLabel(key)}</span>
                  <span className="text-xs font-mono text-[#22d3ee] bg-[#0a0d14] px-2 py-1 rounded">
                    {formatNumber(value)} {parsedData.units?.[key] || ''}
                  </span>
                </div>
                <div className="relative mb-2">
                  <input
                    type="range"
                    min={sliderConfig.min}
                    max={sliderConfig.max}
                    step={sliderConfig.step}
                    value={value}
                    onChange={(event) => {
                      const newValue = Number(event.target.value)
                      onVariableChange?.(key, newValue)
                    }}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#1f2937] accent-[#22d3ee] hover:accent-[#06b6d4] transition-all"
                    style={{
                      background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${Math.max(0, Math.min(100, percentage))}%, #1f2937 ${Math.max(0, Math.min(100, percentage))}%, #1f2937 100%)`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[#6b7280]">
                  <span>{formatNumber(sliderConfig.min)}</span>
                  <span>{formatNumber(sliderConfig.max)}</span>
                </div>
              </label>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}
