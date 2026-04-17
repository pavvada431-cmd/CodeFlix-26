import { useEffect, useMemo, useState } from 'react'

const DEFAULT_STEPS = [
  { selector: '[data-tour="problem-input"]', title: 'Type your problem here', description: 'Write your physics or chemistry problem in plain English.' },
  { selector: '[data-tour="ai-provider"]', title: 'Choose your AI provider', description: 'Select the model/provider you want to parse your prompt.' },
  { selector: '[data-tour="solve-button"]', title: 'Click Solve to start', description: 'This runs parsing and loads the simulation automatically.' },
  { selector: '[data-tour="simulation-canvas"]', title: 'Your simulation appears here', description: 'This is the interactive 3D simulation viewport.' },
  { selector: '[data-tour="playback-controls"]', title: 'Control playback here', description: 'Play, pause, reset, and adjust simulation speed.' },
  { selector: '[data-tour="solution-panel"]', title: 'Adjust variables with these sliders', description: 'Use controls and formulas to explore how outcomes change.' },
  { selector: '[data-tour="graph-panel"]', title: 'See real-time data here', description: 'Graphs update live with telemetry while the simulation runs.' },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export default function GuidedTour({
  isOpen,
  onClose,
  steps = DEFAULT_STEPS,
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [highlightRect, setHighlightRect] = useState(null)

  const currentStep = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  useEffect(() => {
    if (!isOpen) return undefined

    const updateRect = () => {
      const target = document.querySelector(currentStep?.selector)
      if (!target) {
        setHighlightRect(null)
        return
      }
      const rect = target.getBoundingClientRect()
      setHighlightRect({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      })
    }

    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [currentStep?.selector, isOpen])

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0)
      setHighlightRect(null)
    }
  }, [isOpen])

  const cardPosition = useMemo(() => {
    if (!highlightRect) {
      return {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    const padding = 14
    const cardWidth = 320
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const left = clamp(highlightRect.x, padding, viewportWidth - cardWidth - padding)
    const top = highlightRect.y + highlightRect.height + 14
    const adjustedTop = top > viewportHeight - 220 ? highlightRect.y - 196 : top

    return {
      left,
      top: clamp(adjustedTop, padding, viewportHeight - 210),
    }
  }, [highlightRect])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px]" />

      {highlightRect ? (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-cyan-300/80"
          style={{
            left: highlightRect.x - 6,
            top: highlightRect.y - 6,
            width: highlightRect.width + 12,
            height: highlightRect.height + 12,
            boxShadow: '0 0 0 9999px rgba(2,6,23,0.68)',
          }}
        />
      ) : null}

      <div
        className="absolute z-[121] w-[min(92vw,340px)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl"
        style={cardPosition}
      >
        <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">
          Step {stepIndex + 1} / {steps.length}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[var(--color-text)]">{currentStep.title}</h3>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{currentStep.description}</p>

        <div className="mt-4 flex justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)]"
          >
            Skip Tour
          </button>

          <button
            type="button"
            onClick={() => {
              if (isLast) {
                onClose?.()
              } else {
                setStepIndex((prev) => prev + 1)
              }
            }}
            className="rounded-lg border border-cyan-300/40 bg-cyan-400/90 px-3 py-2 text-sm font-semibold text-slate-950"
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
