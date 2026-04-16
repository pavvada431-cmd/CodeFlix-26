import { useRef, useState } from 'react'
import { parseProblem } from '../utils/problemParser'

const EXAMPLES = [
  {
    label: 'Inclined Plane',
    text: 'A 10kg block slides down a 30-degree frictionless incline. Find its acceleration and the normal force.',
  },
  {
    label: 'Projectile Motion',
    text: 'A ball is launched at 20 m/s at an angle of 45 degrees from the ground. Find the range and time of flight.',
  },
  {
    label: 'Pendulum',
    text: "A simple pendulum has length 2 m. Calculate its period near Earth's surface.",
  },
  {
    label: 'Simple Circuit',
    text: 'A 12 V battery is connected to a 6 ohm resistor. Find the current and power dissipated by the resistor.',
  },
  {
    label: 'Acid-Base Titration',
    text: 'How much 0.1 M NaOH is needed to neutralize 25 mL of 0.2 M HCl?',
  },
]

function ProblemInput({ onSolved }) {
  const textareaRef = useRef(null)
  const [problemText, setProblemText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleExampleClick = (text) => {
    setProblemText(text)
    setErrorMessage('')
    textareaRef.current?.focus()
  }

  const handleSolve = async () => {
    const trimmedProblem = problemText.trim()

    if (!trimmedProblem) {
      setErrorMessage('Describe a problem before starting the parser.')
      textareaRef.current?.focus()
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const parsedData = await parseProblem(trimmedProblem)

      if (typeof onSolved === 'function') {
        onSolved(parsedData)
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to parse the problem right now.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="rounded-[30px] border border-white/10 bg-[#07111f]/80 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.55)] backdrop-blur-xl">
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-mono-display text-xs uppercase tracking-[0.32em] text-[rgba(0,245,255,0.72)]">
            Problem Input
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-white">
            Describe the scenario
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Paste a word problem and SimuSolve will extract the variables,
            classify the domain, and prepare the next solve-and-simulate step.
          </p>
        </div>

        <div className="group relative mt-2">
          <div className="pointer-events-none absolute -inset-1 rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(0,245,255,0.2),transparent_45%),linear-gradient(135deg,rgba(0,245,255,0.28),transparent_55%,rgba(0,245,255,0.2))] opacity-0 blur-md transition duration-300 group-focus-within:opacity-100 group-focus-within:animate-pulse" />
          <div className="relative rounded-[26px] border border-white/10 bg-[#0b1324]/85 p-1 transition duration-300 group-focus-within:border-[rgba(0,245,255,0.35)] group-focus-within:shadow-[0_0_0_1px_rgba(0,245,255,0.15),0_0_32px_rgba(0,245,255,0.12)]">
            <label
              htmlFor="problem-input"
              className="sr-only"
            >
              Problem description
            </label>
            <textarea
              id="problem-input"
              ref={textareaRef}
              value={problemText}
              onChange={(event) => {
                setProblemText(event.target.value)
                if (errorMessage) {
                  setErrorMessage('')
                }
              }}
              placeholder="Describe your physics or chemistry problem... e.g. 'A 10kg block slides down a 30-degree frictionless incline'"
              className="min-h-64 w-full resize-none rounded-[22px] border border-transparent bg-transparent px-5 py-4 text-base leading-7 text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="mt-1">
          <p className="font-mono-display text-[11px] uppercase tracking-[0.3em] text-slate-400">
            Try an example
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => handleExampleClick(example.text)}
                disabled={isLoading}
                className="rounded-full border border-[rgba(255,255,255,0.12)] bg-white/5 px-4 py-2 font-mono-display text-xs uppercase tracking-[0.22em] text-slate-200 transition hover:border-[rgba(0,245,255,0.35)] hover:bg-[rgba(0,245,255,0.1)] hover:text-[#00f5ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSolve}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-3 rounded-2xl border border-[rgba(0,245,255,0.35)] bg-[linear-gradient(135deg,rgba(0,245,255,0.24),rgba(0,245,255,0.12))] px-6 py-4 font-heading text-lg font-semibold tracking-wide text-[#dffeff] shadow-[0_0_24px_rgba(0,245,255,0.18),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(0,245,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#00f5ff] shadow-[0_0_16px_rgba(0,245,255,0.9)]" />
            Solve &amp; Simulate
          </button>

          {isLoading ? (
            <div className="inline-flex items-center gap-3 text-[#00f5ff]">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[rgba(0,245,255,0.2)] border-t-[#00f5ff]" />
              <span className="animate-pulse font-mono-display text-sm uppercase tracking-[0.22em]">
                Parsing your problem...
              </span>
            </div>
          ) : null}

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-2xl border border-[rgba(248,113,113,0.25)] bg-[rgba(127,29,29,0.24)] px-4 py-3 text-sm text-red-300"
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
