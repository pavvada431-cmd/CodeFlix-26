import { useRef, useState } from 'react'

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

function ProblemInput({ onSolved, isLoading = false }) {
  const textareaRef = useRef(null)
  const [problemText, setProblemText] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleExampleClick = (text) => {
    setProblemText(text)
    setErrorMessage('')
    textareaRef.current?.focus()
  }

  const handleSolve = () => {
    const trimmedProblem = problemText.trim()

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

  return (
    <section className="rounded-[24px] border border-white/10 bg-[#07111f]/80 p-5 shadow-[0_16px_60px_rgba(2,8,23,0.45)] backdrop-blur-xl">
      <div className="flex flex-col gap-3">
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
              onChange={(event) => {
                setProblemText(event.target.value)
                if (errorMessage) setErrorMessage('')
              }}
              onKeyDown={handleKeyDown}
              placeholder="Describe your physics or chemistry problem... e.g. 'A 10kg block slides down a 30-degree frictionless incline'"
              disabled={isLoading}
              className="min-h-48 w-full resize-none rounded-[18px] border border-transparent bg-transparent px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <p className="font-mono-display text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Try an example
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
            disabled={isLoading || !problemText.trim()}
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
