import { useRef, useState, useMemo } from 'react'
import { sanitizeInput } from '../utils/validator'

const MAX_INPUT_LENGTH = 500
const AI_PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude Sonnet 4)' },
  { value: 'openai', label: 'OpenAI (GPT-4o)' },
  { value: 'gemini', label: 'Google Gemini (1.5 Flash)' },
  { value: 'groq', label: 'Groq (Llama 3.3 70B)' },
]

const EXAMPLES = [
  {
    label: 'Inclined Plane',
    text: 'A 10kg block slides down a 30-degree frictionless incline. Find its acceleration and the normal force.',
    type: 'inclined_plane',
  },
  {
    label: 'Projectile Motion',
    text: 'A ball is launched at 20 m/s at an angle of 45 degrees from the ground. Find the range and time of flight.',
    type: 'projectile',
  },
  {
    label: 'Pendulum',
    text: "A simple pendulum has length 2 m. Calculate its period near Earth's surface.",
    type: 'pendulum',
  },
  {
    label: 'Spring-Mass',
    text: 'A 2kg mass attached to a spring with k=100 N/m is pulled 0.5m and released. Find the oscillation period.',
    type: 'spring_mass',
  },
  {
    label: 'Circular Motion',
    text: 'A car of mass 1000kg travels at 20 m/s around a circular track of radius 50m. Find the centripetal force.',
    type: 'circular_motion',
  },
  {
    label: 'Collision',
    text: 'Two balls with masses 2kg and 3kg collide head-on at velocities 5 m/s and -3 m/s respectively. Calculate final velocities for elastic collision.',
    type: 'collisions',
  },
  {
    label: 'Wave Motion',
    text: 'A wave travels with amplitude 0.3m, frequency 2Hz, and wavelength 1.5m. Visualize transverse wave propagation.',
    type: 'wave_motion',
  },
  {
    label: 'Rotational Mechanics',
    text: 'A solid disk of mass 5kg and radius 0.5m rotates from rest under a 20N force applied at the rim. Find angular acceleration.',
    type: 'rotational_mechanics',
  },
  {
    label: 'Orbital Mechanics',
    text: 'A satellite of mass 500kg orbits Earth at altitude 400km with circular velocity. Calculate orbital period and velocity.',
    type: 'orbital',
  },
  {
    label: 'Buoyancy',
    text: 'A wooden block with density 600 kg/m³ and volume 0.001 m³ floats in water. Will it sink or float? Find the buoyant force.',
    type: 'buoyancy',
  },
  {
    label: 'Thermodynamics',
    text: 'An ideal gas container holds 100 particles at 300K in a volume of 8 m³. Calculate pressure and average kinetic energy.',
    type: 'ideal_gas',
  },
  {
    label: 'Radioactive Decay',
    text: 'A sample contains 1000 atoms of Carbon-14 with half-life of 5730 years. Simulate exponential decay over time.',
    type: 'radioactive_decay',
  },
]

function ProblemInput({
  onSolved,
  isLoading = false,
  provider = 'anthropic',
  onProviderChange,
}) {
  const textareaRef = useRef(null)
  const [problemText, setProblemText] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const sanitizedText = useMemo(() => {
    return sanitizeInput(problemText)
  }, [problemText])

  const charCount = problemText.length
  const isNearLimit = charCount >= MAX_INPUT_LENGTH * 0.9
  const isAtLimit = charCount >= MAX_INPUT_LENGTH

  const handleExampleClick = (text) => {
    setProblemText(text)
    setErrorMessage('')
    textareaRef.current?.focus()
  }

  const handleSolve = () => {
    const trimmedProblem = sanitizedText.trim()

    if (!trimmedProblem) {
      setErrorMessage('Describe a problem before starting the parser.')
      textareaRef.current?.focus()
      return
    }

    setErrorMessage('')

    if (typeof onSolved === 'function') {
      onSolved(trimmedProblem)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSolve()
    }
  }

  const handleChange = (e) => {
    let value = e.target.value

    value = sanitizeInput(value)

    if (value.length > MAX_INPUT_LENGTH) {
      value = value.substring(0, MAX_INPUT_LENGTH)
    }

    setProblemText(value)

    if (errorMessage) {
      setErrorMessage('')
    }
  }

  return (
    <section className="rounded-[24px] border border-white/10 bg-[#07111f]/80 p-5 shadow-[0_16px_60px_rgba(2,8,23,0.45)] backdrop-blur-xl">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono-display text-[10px] uppercase tracking-[0.32em] text-[rgba(0,245,255,0.72)]">
              Problem Input
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-white">
              Describe the scenario
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#8892a4]">
              Paste a word problem and SimuSolve will extract variables and build an interactive simulation.
            </p>
          </div>

          <div className="sm:self-start">
            <label
              htmlFor="ai-provider"
              className="block text-right font-mono-display text-[10px] uppercase tracking-[0.28em] text-slate-500"
            >
              AI Provider
            </label>
            <select
              id="ai-provider"
              value={provider}
              disabled={isLoading}
              onChange={(event) => onProviderChange?.(event.target.value)}
              className="mt-2 min-w-[230px] rounded-xl border border-white/10 bg-[#0b1324]/90 px-3 py-2 font-mono-display text-xs text-slate-200 outline-none transition focus:border-[rgba(0,245,255,0.45)] focus:bg-[rgba(0,245,255,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {AI_PROVIDERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="group relative mt-1">
          <div className="pointer-events-none absolute -inset-1 rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(0,245,255,0.15),transparent_50%),linear-gradient(135deg,rgba(0,245,255,0.25),transparent_55%,rgba(0,245,255,0.15))] opacity-0 blur-md transition duration-300 group-focus-within:opacity-100" />
          <div className="relative rounded-[22px] border border-white/10 bg-[#0b1324]/85 p-1 transition duration-300 group-focus-within:border-[rgba(0,245,255,0.35)] group-focus-within:shadow-[0_0_0_1px_rgba(0,245,255,0.15),0_0_24px_rgba(0,245,255,0.1)]">
            <label htmlFor="problem-input" className="sr-only">
              Problem description
            </label>
            <textarea
              id="problem-input"
              ref={textareaRef}
              value={problemText}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Describe your physics or chemistry problem... e.g. 'A 10kg block slides down a 30-degree frictionless incline'"
              disabled={isLoading}
              maxLength={MAX_INPUT_LENGTH}
              className="min-h-48 w-full resize-none rounded-[18px] border border-transparent bg-transparent px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className={`font-mono-display text-[10px] uppercase tracking-[0.28em] ${isAtLimit ? 'text-[#f87171]' : isNearLimit ? 'text-[#fbbf24]' : 'text-slate-500'}`}>
            {charCount}/{MAX_INPUT_LENGTH} characters
          </p>
        </div>

        <div>
          <p className="font-mono-display text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Try an example (click to load)
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => handleExampleClick(example.text)}
                disabled={isLoading}
                className="rounded-full border border-[rgba(255,255,255,0.1)] bg-white/5 px-3 py-1.5 font-mono-display text-[10px] uppercase tracking-[0.18em] text-[#8892a4] transition hover:border-[rgba(0,245,255,0.3)] hover:bg-[rgba(0,245,255,0.08)] hover:text-[#00f5ff] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSolve}
            disabled={isLoading || !sanitizedText.trim()}
            className="inline-flex items-center justify-center gap-3 rounded-xl border border-[rgba(0,245,255,0.35)] bg-[linear-gradient(135deg,rgba(0,245,255,0.2),rgba(0,245,255,0.1))] px-5 py-3 font-heading text-base font-semibold tracking-wide text-[#dffeff] shadow-[0_0_20px_rgba(0,245,255,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] transition hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(0,245,255,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="h-2 w-2 rounded-full bg-[#00f5ff] shadow-[0_0_12px_rgba(0,245,255,0.8)]" />
            Solve &amp; Simulate
          </button>

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-xl border border-[rgba(248,113,113,0.25)] bg-[rgba(127,29,29,0.2)] px-4 py-2 text-sm text-red-300"
            >
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default ProblemInput
