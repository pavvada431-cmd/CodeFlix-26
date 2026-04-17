import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import {
  Sparkles,
  BrainCircuit,
  Rocket,
  FlaskConical,
  LineChart,
  Atom,
  ShieldCheck,
  Boxes,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import Navbar from '../components/Navbar'

const featureCards = [
  {
    icon: BrainCircuit,
    title: 'AI Problem Parsing',
    description: 'Write naturally. SeeTheScience extracts variables, units, assumptions, and solution steps automatically.',
  },
  {
    icon: Boxes,
    title: 'Physics + Chemistry Coverage',
    description: 'Mechanics, waves, EM, optics, thermodynamics, stoichiometry, bonding, gas laws, and more.',
  },
  {
    icon: Rocket,
    title: 'Interactive 3D Simulations',
    description: 'Manipulate parameters in real time and immediately observe trajectories, forces, and state changes.',
  },
  {
    icon: LineChart,
    title: 'Live Telemetry Graphs',
    description: 'Track key metrics while the simulation runs: position, velocity, energy, fields, pH, and derived values.',
  },
  {
    icon: FlaskConical,
    title: 'Learning-First Explanations',
    description: 'Step-by-step solution panels, formula references, and what-if explorations reinforce understanding.',
  },
  {
    icon: ShieldCheck,
    title: 'Reliable Multi-Provider AI',
    description: 'Compatible with OpenAI, Anthropic, Gemini, Groq, and Ollama for flexibility and resilience.',
  },
]

const workflow = [
  {
    title: 'Describe your problem',
    description: 'Use plain language with whatever details you have.',
  },
  {
    title: 'AI structures the scenario',
    description: 'The parser maps it into validated variables and simulation-ready data.',
  },
  {
    title: 'Explore and iterate',
    description: 'Run, pause, modify sliders, and inspect graphs + step-by-step reasoning.',
  },
]

const coverage = [
  'Projectile Motion',
  'Pendulum',
  'Collisions',
  'Waves',
  'Electric Fields',
  'Optics',
  'Thermodynamics',
  'Stoichiometry',
  'Atomic Structure',
  'Gas Laws',
  'Chemical Bonding',
  'Titration',
]

function FadeUp({ children, delay = 0, className = '' }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className={className}
    >
      {children}
    </Motion.div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const stats = useMemo(
    () => [
      { label: 'Simulation Types', value: '20+' },
      { label: 'AI Providers', value: '5' },
      { label: 'Problem Flow', value: 'Parse → Simulate → Explain' },
      { label: 'Focus', value: 'Deep Concept Clarity' },
    ],
    []
  )

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar onOpenSettings={() => {}} apiConnected currentPage="physics" />

      <main className="pt-16">
        <section className="relative overflow-hidden border-b border-[var(--color-border)]">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
            <FadeUp className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                <Sparkles size={14} />
                AI-powered interactive science learning
              </div>

              <h1 className="text-4xl font-bold leading-tight md:text-6xl">
                Where science stops being abstract and starts being explorable.
              </h1>

              <p className="max-w-2xl text-base text-[var(--color-text-muted)] md:text-lg">
                SeeTheScience turns plain-English physics and chemistry problems into live, visual, interactive simulations with guided steps and real-time graphs.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/90 px-5 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
                >
                  Launch Simulator
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/formulas')}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 font-semibold transition hover:scale-[1.02]"
                >
                  Explore Formula Sheet
                </button>
              </div>
            </FadeUp>

            <FadeUp delay={0.08} className="grid gap-3 sm:grid-cols-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-[var(--color-border)] bg-[color:color-mix(in_oklab,var(--color-surface)_86%,transparent)] p-5 backdrop-blur"
                >
                  <p className="text-sm text-[var(--color-text-muted)]">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                </div>
              ))}
            </FadeUp>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <FadeUp>
            <h2 className="text-3xl font-semibold md:text-4xl">What the platform actually does</h2>
            <p className="mt-3 max-w-3xl text-[var(--color-text-muted)]">
              This is not a static formula app. It is a simulation-first learning system that combines AI parsing, interactive visualization, and guided solution intelligence.
            </p>
          </FadeUp>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature, index) => {
              const Icon = feature.icon
              return (
                <FadeUp key={feature.title} delay={0.04 * index}>
                  <article className="h-full rounded-2xl border border-[var(--color-border)] bg-[color:color-mix(in_oklab,var(--color-surface)_88%,transparent)] p-5">
                    <div className="mb-4 inline-flex rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-2 text-cyan-300">
                      <Icon size={18} />
                    </div>
                    <h3 className="text-lg font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{feature.description}</p>
                  </article>
                </FadeUp>
              )
            })}
          </div>
        </section>

        <section className="border-y border-[var(--color-border)] bg-[color:color-mix(in_oklab,var(--color-surface)_92%,transparent)]">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <FadeUp>
              <h2 className="text-3xl font-semibold md:text-4xl">How it works</h2>
            </FadeUp>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {workflow.map((step, index) => (
                <FadeUp key={step.title} delay={0.06 * index}>
                  <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Step {index + 1}</p>
                    <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">{step.description}</p>
                  </article>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <FadeUp>
            <h2 className="text-3xl font-semibold md:text-4xl">Simulation coverage</h2>
            <p className="mt-3 max-w-3xl text-[var(--color-text-muted)]">
              Built for hackathon demos, classrooms, tutoring sessions, and rapid concept intuition checks.
            </p>
          </FadeUp>

          <div className="mt-8 flex flex-wrap gap-2">
            {coverage.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
              >
                <CheckCircle2 size={14} className="text-cyan-300" />
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="border-t border-[var(--color-border)]">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm text-cyan-300">
                <Atom size={16} />
                Ready to try it?
              </p>
              <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Start solving with interactive science.</h2>
              <p className="mt-3 text-[var(--color-text-muted)]">
                Parse a problem, run the simulation, inspect the graph, and understand the why.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
            >
              Open SeeTheScience
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
