import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const MotionDiv = motion.div
const MotionLi = motion.li
const MotionSpan = motion.span

const LOADING_TIPS = [
  'Did you know? Projectile motion forms a parabola because horizontal and vertical motion are independent.',
  'Tip: Try changing variables with the sliders after parsing.',
  'A pendulum period depends on length, not mass, for small angles.',
  'In circular motion, acceleration points toward the center even at constant speed.',
  'Energy in ideal springs swaps between kinetic and potential continuously.',
  'For electric fields, force scales with charge and inversely with distance squared.',
  'Lenses form real or virtual images based on object distance and focal length.',
  'Half-life means equal time for each 50% reduction, not a fixed amount decayed.',
  'Try pausing simulations to inspect vectors, trajectories, and exact values.',
  'Dimensional checks are a fast way to catch impossible equations.',
]

const PARSING_STEPS = [
  'Cleaning input...',
  'Sending to AI...',
  'Parsing response...',
  'Validating data...',
  'Building simulation...',
]

const COMMON_SNAP_VALUES = [0, 1, 2, 5, 10, 20, 25, 30, 45, 50, 60, 75, 90, 100]

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function formatCounterValue(value, decimals = 2, formatter) {
  if (!Number.isFinite(value)) return String(value ?? '--')
  if (typeof formatter === 'function') return formatter(value)
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: Number.isInteger(value) ? 0 : Math.min(decimals, 1),
  }).format(value)
}

function LoadingStateStyles() {
  return (
    <style>{`
      @keyframes cf-orbit-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes cf-pulse-glow { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.08); opacity: 1; } }
      @keyframes cf-shimmer { 0% { transform: translateX(-140%); } 100% { transform: translateX(180%); } }
      @keyframes cf-soft-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }

      .cf-atom-core { animation: cf-pulse-glow 1.8s ease-in-out infinite; }
      .cf-orbit-a { animation: cf-orbit-spin 3.2s linear infinite; transform-origin: 100px 100px; }
      .cf-orbit-b { animation: cf-orbit-spin 4.4s linear infinite reverse; transform-origin: 100px 100px; }
      .cf-orbit-c { animation: cf-orbit-spin 5.2s linear infinite; transform-origin: 100px 100px; }
      .cf-shimmer::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.16) 45%, transparent 70%);
        animation: cf-shimmer 1.6s linear infinite;
      }
      .cf-floating { animation: cf-soft-float 2.2s ease-in-out infinite; }
    `}</style>
  )
}

export function SimulationLoader({
  isLoading,
  className = '',
  title = 'AI is parsing your problem',
}) {
  const [shouldRender, setShouldRender] = useState(() => isLoading)
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)
  const animationRef = useRef(null)
  const exitTimerRef = useRef(null)
  const tipsTimerRef = useRef(null)

  useEffect(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    if (tipsTimerRef.current) clearInterval(tipsTimerRef.current)

    if (isLoading) {
      requestAnimationFrame(() => {
        setShouldRender(true)
        setIsExiting(false)
        setProgress(0)
      })

      const duration = 3000 + Math.random() * 5000
      const start = performance.now()

      const tick = (now) => {
        const elapsed = now - start
        const normalized = clamp(elapsed / duration, 0, 1)
        const eased = 1 - Math.pow(1 - normalized, 3)
        setProgress(Math.min(94, eased * 100))
        if (normalized < 1 && isLoading) {
          animationRef.current = requestAnimationFrame(tick)
        }
      }
      animationRef.current = requestAnimationFrame(tick)

      tipsTimerRef.current = setInterval(() => {
        setTipIndex((previous) => (previous + 1) % LOADING_TIPS.length)
      }, 2600)

      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current)
        if (tipsTimerRef.current) clearInterval(tipsTimerRef.current)
      }
    }

    if (shouldRender) {
      requestAnimationFrame(() => {
        setProgress(100)
        setIsExiting(true)
      })
      exitTimerRef.current = setTimeout(() => {
        setShouldRender(false)
        setIsExiting(false)
      }, 420)
    }

    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    }
  }, [isLoading, shouldRender])

  if (!shouldRender) return null

  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`absolute inset-0 z-30 flex items-center justify-center bg-[var(--color-bg)]/85 p-4 backdrop-blur-md ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Simulation loading overlay"
    >
      <LoadingStateStyles />
      <div className="w-full max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-5 shadow-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <svg className="cf-floating h-20 w-20" viewBox="0 0 200 200" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="cfAtomAccent" x1="0" y1="0" x2="200" y2="200">
                <stop offset="0%" stopColor="var(--color-accent)" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="14" className="cf-atom-core" fill="url(#cfAtomAccent)" />
            <g className="cf-orbit-a">
              <ellipse cx="100" cy="100" rx="66" ry="28" stroke="url(#cfAtomAccent)" strokeWidth="3" opacity="0.85" />
              <circle cx="166" cy="100" r="5" fill="var(--color-accent)" />
            </g>
            <g className="cf-orbit-b" transform="rotate(60 100 100)">
              <ellipse cx="100" cy="100" rx="66" ry="28" stroke="url(#cfAtomAccent)" strokeWidth="3" opacity="0.72" />
              <circle cx="166" cy="100" r="5" fill="#67e8f9" />
            </g>
            <g className="cf-orbit-c" transform="rotate(-60 100 100)">
              <ellipse cx="100" cy="100" rx="66" ry="28" stroke="url(#cfAtomAccent)" strokeWidth="3" opacity="0.62" />
              <circle cx="166" cy="100" r="5" fill="#c084fc" />
            </g>
          </svg>

          <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
          <AnimatePresence mode="wait">
            <MotionDiv
              key={tipIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="min-h-10 text-xs leading-relaxed text-[var(--color-text-muted)]"
            >
              {LOADING_TIPS[tipIndex]}
            </MotionDiv>
          </AnimatePresence>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]/70">
            <div
              className="h-full rounded-full transition-[width] duration-200"
              style={{
                width: `${clamp(progress, 0, 100)}%`,
                background: 'linear-gradient(90deg, var(--color-accent), #a855f7)',
              }}
            />
          </div>
        </div>
      </div>
    </MotionDiv>
  )
}

export function SkeletonSimulation({ className = '' }) {
  return (
    <div className={`relative h-full w-full overflow-hidden rounded-xl bg-[var(--color-bg)] ${className}`}>
      <LoadingStateStyles />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-surface)]/35 to-transparent" />

      <div className="absolute left-1/2 top-[22%] h-16 w-16 -translate-x-1/2 rounded-full bg-[var(--color-border)]/70 animate-pulse" />
      <div className="absolute left-[18%] top-[48%] h-2 w-[65%] rounded-full bg-[var(--color-border)]/70" />
      <div className="absolute left-[16%] top-[53%] h-1 w-[48%] rotate-[8deg] rounded-full bg-[var(--color-border)]/60" />
      <div className="absolute left-[36%] top-[42%] h-1 w-[32%] -rotate-[12deg] rounded-full bg-[var(--color-border)]/55" />

      <div className="absolute bottom-[16%] left-[10%] right-[10%] h-6 rounded-lg bg-[var(--color-border)]/70" />
      <div className="absolute bottom-[10%] left-[8%] right-[8%] h-2 rounded-full bg-[var(--color-border)]/55" />

      <div className="cf-shimmer absolute inset-0" />
    </div>
  )
}

export function ParsingSteps({ isLoading, className = '' }) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (!isLoading) return
    const resetTimer = setTimeout(() => setCurrentStep(0), 0)
    const interval = setInterval(() => {
      setCurrentStep((previous) => (previous < PARSING_STEPS.length - 1 ? previous + 1 : previous))
    }, 850)
    return () => {
      clearTimeout(resetTimer)
      clearInterval(interval)
    }
  }, [isLoading])

  return (
    <div className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/55 p-3 ${className}`}>
      <LoadingStateStyles />
      <ul className="space-y-2">
        {PARSING_STEPS.map((step, index) => {
          const completed = isLoading ? index < currentStep : true
          const active = isLoading && index === currentStep

          return (
            <MotionLi
              key={step}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
              className="flex items-center gap-2"
            >
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold"
                style={{
                  borderColor: completed || active ? 'var(--color-accent)' : 'var(--color-border)',
                  color: completed || active ? 'var(--color-accent)' : 'var(--color-text-dim)',
                  backgroundColor: completed ? 'var(--color-accent-dim)' : 'transparent',
                }}
              >
                {completed ? (
                  <MotionSpan initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>✓</MotionSpan>
                ) : active ? (
                  <span
                    className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-border)]" aria-hidden="true" />
                )}
              </span>
              <span
                className="text-xs"
                style={{
                  color: active ? 'var(--color-text)' : completed ? 'var(--color-text-muted)' : 'var(--color-text-dim)',
                }}
              >
                {step}
              </span>
            </MotionLi>
          )
        })}
      </ul>
    </div>
  )
}

export function VariableSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  snaps = COMMON_SNAP_VALUES,
  onChange,
  disabled = false,
  className = '',
  formatter,
}) {
  const safeMin = Number.isFinite(min) ? min : 0
  const safeMax = Number.isFinite(max) ? max : safeMin + 1
  const safeValue = Number.isFinite(value) ? clamp(value, safeMin, safeMax) : safeMin
  const [animatedValue, setAnimatedValue] = useState(safeValue)
  const animationRef = useRef(null)
  const previousValueRef = useRef(safeValue)

  useEffect(() => {
    const from = previousValueRef.current
    const to = safeValue
    previousValueRef.current = safeValue
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    const start = performance.now()
    const duration = 180

    const tick = (now) => {
      const t = clamp((now - start) / duration, 0, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimatedValue(from + (to - from) * eased)
      if (t < 1) animationRef.current = requestAnimationFrame(tick)
    }
    animationRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [safeValue])

  const percentage = safeMax > safeMin
    ? ((safeValue - safeMin) / (safeMax - safeMin)) * 100
    : 0

  const tooltipValue = formatCounterValue(animatedValue, 3, formatter)

  const handleChange = (event) => {
    const raw = Number(event.target.value)
    if (!Number.isFinite(raw)) return
    const threshold = Math.max((safeMax - safeMin) * 0.02, Math.abs(step) * 2)
    const snapped = snaps.reduce((closest, point) => {
      const candidate = Number(point)
      if (!Number.isFinite(candidate)) return closest
      const distance = Math.abs(raw - candidate)
      if (distance <= threshold && distance < Math.abs(raw - closest)) return candidate
      return closest
    }, raw)
    onChange?.(clamp(snapped, safeMin, safeMax))
  }

  return (
    <label className={`block rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/45 p-3 ${className}`}>
      <LoadingStateStyles />
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
        {unit ? <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-dim)]">{unit}</span> : null}
      </div>

      <div className="relative pt-7">
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border border-[var(--color-accent)]/45 bg-[var(--color-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent)] shadow-md transition-all duration-150"
          style={{ left: `calc(${clamp(percentage, 0, 100)}%)` }}
        >
          {tooltipValue}{unit ? ` ${unit}` : ''}
        </div>
        <input
          type="range"
          min={safeMin}
          max={safeMax}
          step={step}
          value={safeValue}
          onChange={handleChange}
          disabled={disabled}
          className="h-2 w-full cursor-pointer appearance-none rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${clamp(percentage, 0, 100)}%, var(--color-border) ${clamp(percentage, 0, 100)}%, var(--color-border) 100%)`,
          }}
        />
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-[var(--color-text-dim)]">
        <span>{formatCounterValue(safeMin, 3, formatter)}</span>
        <span>{formatCounterValue(safeMax, 3, formatter)}</span>
      </div>
    </label>
  )
}

export function AnimatedCounter({
  value,
  unit = '',
  className = '',
  decimals = 2,
  formatter,
  significantDelta,
}) {
  const numericValue = Number(value)
  const [displayValue, setDisplayValue] = useState(Number.isFinite(numericValue) ? numericValue : 0)
  const [flash, setFlash] = useState('')
  const previousRef = useRef(Number.isFinite(numericValue) ? numericValue : 0)
  const animationRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (!Number.isFinite(numericValue)) return
    const from = previousRef.current
    const to = numericValue
    previousRef.current = numericValue

    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    const start = performance.now()
    const duration = 300

    const tick = (now) => {
      const t = clamp((now - start) / duration, 0, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayValue(from + (to - from) * eased)
      if (t < 1) animationRef.current = requestAnimationFrame(tick)
    }
    animationRef.current = requestAnimationFrame(tick)

    const delta = Math.abs(to - from)
    const threshold = Number.isFinite(significantDelta)
      ? Math.abs(significantDelta)
      : Math.max(0.5, Math.abs(from) * 0.15)
    if (delta >= threshold) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      requestAnimationFrame(() => setFlash(to > from ? 'up' : 'down'))
      timeoutRef.current = setTimeout(() => setFlash(''), 260)
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [numericValue, significantDelta])

  if (!Number.isFinite(numericValue)) {
    return (
      <span className={className}>
        {String(value ?? '--')}
        {unit ? ` ${unit}` : ''}
      </span>
    )
  }

  const color =
    flash === 'up'
      ? 'var(--color-accent)'
      : flash === 'down'
        ? '#f59e0b'
        : 'var(--color-text)'

  return (
    <MotionSpan
      animate={{ scale: flash ? [1, 1.04, 1] : 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`inline-flex items-baseline gap-1 transition-colors duration-200 ${className}`}
      style={{ color }}
    >
      <span>{formatCounterValue(displayValue, decimals, formatter)}</span>
      {unit ? <span className="text-xs text-[var(--color-text-dim)]">{unit}</span> : null}
    </MotionSpan>
  )
}

export function SimulationTransition({ transitionKey, children, className = '' }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <MotionDiv
        key={transitionKey}
        initial={{ opacity: 0, scale: 0.965 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.965 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={className}
      >
        {children}
      </MotionDiv>
    </AnimatePresence>
  )
}
