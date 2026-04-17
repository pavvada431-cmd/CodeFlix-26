import { useMemo } from 'react'
import { formatNumber } from '../utils/formatters'
import { AnimatedCounter, VariableSlider } from './LoadingStates'
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

  let min
  let max
  let step

  if (safeValue === 0) {
    min = 0
    max = 1
    step = 0.05
  } else if (safeValue < 1) {
    min = safeValue * 0.1
    max = safeValue * 10
    step = Math.max(safeValue * 0.02, 0.01)
  } else if (safeValue < 100) {
    min = safeValue * 0.2
    max = safeValue * 3
    step = Math.max(safeValue * 0.02, 0.1)
  } else {
    min = safeValue * 0.5
    max = safeValue * 2
    step = Math.max(safeValue * 0.02, 1)
  }

  return {
    min: Math.max(0, min),
    max: Math.max(min + step, max),
    step,
  }
}

function getSnapValues(unit, key, value) {
  const unitValue = String(unit ?? '').toLowerCase()
  const keyValue = String(key ?? '').toLowerCase()
  const base = [0, 1, 2, 5, 10, 20, 25, 30, 45, 50, 60, 75, 90, 100]

  if (unitValue.includes('°') || keyValue.includes('angle')) {
    return [0, 15, 30, 45, 60, 75, 90]
  }
  if (unitValue.includes('m/s') || keyValue.includes('velocity') || keyValue.includes('speed')) {
    return [0, 5, 10, 15, 20, 25, 30, 40, 50]
  }
  if (unitValue.includes('kg') || keyValue.includes('mass')) {
    return [0, 0.5, 1, 2, 5, 10, 20, 50, 100]
  }
  if (unitValue.includes('m') || keyValue.includes('distance') || keyValue.includes('length')) {
    return [0, 0.5, 1, 2, 5, 10, 20, 50, 100]
  }
  if (Number.isFinite(value) && Math.abs(value) < 1) {
    return [0, 0.1, 0.2, 0.5, 1, 2]
  }
  return base
}

export default function SolutionPanel({ parsedData, onVariableChange }) {
  const variableEntries = useMemo(() => {
    if (!parsedData?.variables) return []
    return Object.entries(parsedData.variables).filter(([, value]) => Number.isFinite(value))
  }, [parsedData])

  if (!parsedData) {
    return (
      <Panel title="Solution" subtitle="Steps and variables appear after solving a problem.">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No parsed data yet.</p>
      </Panel>
    )
  }

  const answerValue = Number(parsedData.answer?.value)
  const answerUnit = parsedData.answer?.unit || ''

  return (
    <Panel
      title="Solution"
      subtitle={toTitleCase(parsedData.type)}
      action={<Badge variant="neutral">{String(parsedData.domain ?? 'physics').toUpperCase()}</Badge>}
    >
      <div className="space-y-4">
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Answer</p>
          <div className="mt-1 text-lg font-semibold">
            <AnimatedCounter
              value={answerValue}
              unit={answerUnit}
              formatter={formatNumber}
              significantDelta={Math.max(Math.abs(answerValue) * 0.1, 0.5)}
            />
          </div>
          {parsedData.answer?.explanation ? (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{parsedData.answer.explanation}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Steps</p>
          {(parsedData.steps ?? []).slice(0, 6).map((step, index) => (
            <div
              key={`${index + 1}-${step}`}
              className="rounded-xl border p-3"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}
            >
              <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Step {index + 1}</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text)' }}>{step}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Variables</p>
            <Badge variant="neutral">{variableEntries.length}</Badge>
          </div>
          {variableEntries.map(([key, value]) => {
            const sliderConfig = getSliderConfig(value)
            const unit = parsedData.units?.[key] || ''
            return (
              <div key={key} className="rounded-xl border p-1" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                <VariableSlider
                  label={toLabel(key)}
                  value={value}
                  min={sliderConfig.min}
                  max={sliderConfig.max}
                  step={sliderConfig.step}
                  unit={unit}
                  formatter={formatNumber}
                  snaps={getSnapValues(unit, key, value)}
                  onChange={(newValue) => onVariableChange?.(key, Number(newValue))}
                />
              </div>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}
