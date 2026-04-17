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

  if (safeValue === 0) {
    return { min: 0, max: 1, step: 0.05 }
  }
  if (safeValue < 1) {
    return {
      min: Math.max(0, safeValue * 0.1),
      max: safeValue * 10,
      step: Math.max(safeValue * 0.02, 0.01),
    }
  }
  if (safeValue < 100) {
    return {
      min: Math.max(0, safeValue * 0.2),
      max: safeValue * 3,
      step: Math.max(safeValue * 0.02, 0.1),
    }
  }
  return {
    min: Math.max(0, safeValue * 0.5),
    max: safeValue * 2,
    step: Math.max(safeValue * 0.02, 1),
  }
}

function getSnapValues(unit, key, value) {
  const unitValue = String(unit ?? '').toLowerCase()
  const keyValue = String(key ?? '').toLowerCase()
  const base = [0, 1, 2, 5, 10, 20, 25, 30, 45, 50, 60, 75, 90, 100]

  if (unitValue.includes('°') || keyValue.includes('angle')) return [0, 15, 30, 45, 60, 75, 90]
  if (unitValue.includes('m/s') || keyValue.includes('velocity') || keyValue.includes('speed')) return [0, 5, 10, 15, 20, 25, 30, 40, 50]
  if (unitValue.includes('kg') || keyValue.includes('mass')) return [0, 0.5, 1, 2, 5, 10, 20, 50, 100]
  if (unitValue.includes('m') || keyValue.includes('distance') || keyValue.includes('length') || keyValue.includes('height')) return [0, 0.5, 1, 2, 5, 10, 20, 50, 100]
  if (Number.isFinite(value) && Math.abs(value) < 1) return [0, 0.1, 0.2, 0.5, 1, 2]
  return base
}

function MultiConceptStageCard({ stage, index, onVariableChange }) {
  const numericVariables = useMemo(
    () => Object.entries(stage?.variables || {}).filter(([, value]) => Number.isFinite(value)),
    [stage],
  )
  const stageResult = stage?.result || stage?.answer || stage?.output || {}
  const numericResultEntries = Object.entries(stageResult).filter(([, value]) => Number.isFinite(value))

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-text)' }}>
          Stage {index + 1}: {toTitleCase(stage?.type)}
        </p>
        <Badge variant="neutral">{numericVariables.length} vars</Badge>
      </div>

      <div className="space-y-2">
        {numericVariables.map(([key, value]) => {
          const unit = stage?.units?.[key] || ''
          const sliderConfig = getSliderConfig(value)
          return (
            <div key={`${index}-${key}`} className="rounded-xl border p-1" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
              <VariableSlider
                label={toLabel(key)}
                value={value}
                min={sliderConfig.min}
                max={sliderConfig.max}
                step={sliderConfig.step}
                unit={unit}
                formatter={formatNumber}
                snaps={getSnapValues(unit, key, value)}
                onChange={(newValue) => onVariableChange?.(`stage:${index}:${key}`, Number(newValue))}
              />
            </div>
          )
        })}
      </div>

      <div className="mt-3 rounded-lg border p-2" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-dim)' }}>Stage result</p>
        {numericResultEntries.length ? (
          <div className="mt-1 grid grid-cols-2 gap-2">
            {numericResultEntries.map(([key, value]) => (
              <div key={`${index}-result-${key}`} className="text-xs">
                <p style={{ color: 'var(--color-text-muted)' }}>{toLabel(key)}</p>
                <AnimatedCounter value={value} formatter={formatNumber} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Results update live while the pipeline runs (see graph panel for continuous stage outputs).
          </p>
        )}
      </div>
    </div>
  )
}

export default function SolutionPanel({ parsedData, onVariableChange }) {
  const isMultiConcept = parsedData?.isMultiConcept === true && Array.isArray(parsedData?.stages)
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
      subtitle={isMultiConcept ? 'Multi-Concept Pipeline' : toTitleCase(parsedData.type)}
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
          {(parsedData.steps ?? []).slice(0, 8).map((step, index) => (
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

        {isMultiConcept ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Pipeline Stages</p>
              <Badge variant="neutral">{parsedData.stages.length}</Badge>
            </div>
            {parsedData.stages.map((stage, index) => (
              <MultiConceptStageCard
                key={`${stage.type}-${index}`}
                stage={stage}
                index={index}
                onVariableChange={onVariableChange}
              />
            ))}
          </div>
        ) : (
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
        )}
      </div>
    </Panel>
  )
}
