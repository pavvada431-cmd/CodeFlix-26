import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import {
  Sparkles, BrainCircuit, Rocket, FlaskConical, LineChart, Atom,
  ShieldCheck, Boxes, ArrowRight, CheckCircle2, Play, Command,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { useEffect, useRef, useState, useCallback } from 'react'
import ProjectileMotion2D from '../simulations/ProjectileMotion2D'

/* ----------------------------- Particle Field -----------------------------
 * A real, lightweight n-body-ish gravity field rendered to canvas.
 * Mouse acts as a soft attractor. Respects prefers-reduced-motion.
 * --------------------------------------------------------------------------*/
function ParticleField({ flipGravity = false }) {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -9999, y: -9999, active: false })
  const flipRef = useRef(flipGravity)
  useEffect(() => { flipRef.current = flipGravity }, [flipGravity])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = canvas.getContext('2d')
    let raf = 0
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      w = r.width; h = r.height
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const COUNT = reduced ? 24 : Math.min(110, Math.floor((w * h) / 11000))
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.6 + 0.6,
      hue: 180 + Math.random() * 90, // cyan→violet
    }))

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - r.left
      mouseRef.current.y = e.clientY - r.top
      mouseRef.current.active = true
    }
    const onLeave = () => { mouseRef.current.active = false }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)

    const tick = () => {
      ctx.clearRect(0, 0, w, h)

      const gFlip = flipRef.current ? -1 : 1
      const m = mouseRef.current

      // Update
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        // gentle gravity
        p.vy += 0.0035 * gFlip
        // mouse attractor
        if (m.active) {
          const dx = m.x - p.x, dy = m.y - p.y
          const d2 = dx * dx + dy * dy + 60
          const f = 28 / d2
          p.vx += dx * f * 0.02
          p.vy += dy * f * 0.02
        }
        // damping
        p.vx *= 0.992
        p.vy *= 0.992
        p.x += p.vx
        p.y += p.vy
        // wrap
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10
      }

      // Connecting lines (grid-like)
      ctx.lineWidth = 0.6
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < 14000) {
            const alpha = 1 - d2 / 14000
            ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 90%, 70%, ${alpha * 0.18})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // Draw points with bloom
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6)
        grad.addColorStop(0, `hsla(${p.hue}, 95%, 70%, 0.95)`)
        grad.addColorStop(1, `hsla(${p.hue}, 95%, 70%, 0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }
    if (!reduced) raf = requestAnimationFrame(tick)
    else tick() // single static frame

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: 'auto' }}
    />
  )
}

/* ----------------------------- Typing Prompt ----------------------------- */
const PROMPTS = [
  'A ball is thrown at 28 m/s at 55° from a height of 1.5 m...',
  'How far does a 0.2 kg projectile travel at 40° on Mars?',
  'Two carts collide elastically — m1 = 1.2 kg, v1 = 4 m/s...',
  'What is the pH of 0.01 M HCl mixed with 0.005 M NaOH?',
]

function TypingPrompt({ onResolved }) {
  const [text, setText] = useState('')
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState('typing') // typing | hold | erasing

  useEffect(() => {
    let t
    const target = PROMPTS[idx]
    if (phase === 'typing') {
      if (text.length < target.length) {
        t = setTimeout(() => setText(target.slice(0, text.length + 1)), 28 + Math.random() * 30)
      } else {
        t = setTimeout(() => {
          setPhase('hold')
          if (idx === 0) onResolved?.()
        }, 1100)
      }
    } else if (phase === 'hold') {
      t = setTimeout(() => setPhase('erasing'), 1400)
    } else if (phase === 'erasing') {
      if (text.length > 0) {
        t = setTimeout(() => setText(text.slice(0, -1)), 14)
      } else {
        t = setTimeout(() => {
          setIdx((i) => (i + 1) % PROMPTS.length)
          setPhase('typing')
        }, 0)
      }
    }
    return () => clearTimeout(t)
  }, [text, phase, idx, onResolved])

  return (
    <div className="gradient-border p-[1px]">
      <div className="rounded-2xl bg-[var(--color-bg)]/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          <Sparkles size={11} className="text-cyan-300" />
          AI parser · live demo
        </div>
        <div className="mt-2 flex min-h-[2.25rem] items-start font-mono text-sm text-white">
          <span className="mr-2 select-none text-cyan-300">›</span>
          <span className="break-words">{text}<span className="blink-caret text-cyan-300">▍</span></span>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- Mini Sim ----------------------------- */
function LandingMiniSim() {
  // Seamless loop: when sim finishes, briefly fade then re-key.
  const [cycle, setCycle] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const start = setTimeout(() => setPlaying(true), 350)
    const loop = setInterval(() => {
      setPlaying(false)
      setTimeout(() => {
        setCycle((c) => c + 1)
        setPlaying(true)
      }, 280)
    }, 6200)
    return () => { clearTimeout(start); clearInterval(loop) }
  }, [])

  return (
    <div className="relative">
      <div className="absolute -inset-3 -z-10 rounded-3xl bg-gradient-to-br from-cyan-500/25 via-violet-500/15 to-fuchsia-500/15 blur-2xl" />
      <div className="gradient-border overflow-hidden">
        <div className="relative h-[26rem] w-full overflow-hidden rounded-[15px] bg-[#070b14]">
          <ProjectileMotion2D
            key={cycle}
            initialVelocity={28}
            launchAngle={55}
            height={1.5}
            isPlaying={playing}
          />
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-cyan-300/30 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
            live · v=28 m/s · θ=55°
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/40 px-3 py-1 font-mono text-[10px] text-white/70 backdrop-blur">
            d = v₀cos(θ) · t
          </div>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- Floating Equations ----------------------------- */
const FLOATERS = [
  { t: 'F = ma',          x: '6%',  y: '18%', r: -8, d: 0 },
  { t: 'E = mc²',         x: '88%', y: '12%', r: 6,  d: 0.6 },
  { t: 'PV = nRT',        x: '4%',  y: '74%', r: 4,  d: 1.2 },
  { t: 'λ = h/p',         x: '92%', y: '68%', r: -6, d: 1.8 },
  { t: '∇·E = ρ/ε₀',     x: '50%', y: '8%',  r: 0,  d: 0.3 },
  { t: 'pH = -log[H⁺]',   x: '82%', y: '40%', r: -3, d: 2.4 },
]

function FloatingEquations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {FLOATERS.map((f, i) => (
        <span
          key={i}
          className="float-slow absolute font-mono text-xs md:text-sm"
          style={{
            left: f.x,
            top: f.y,
            color: 'rgba(186, 230, 253, 0.35)',
            ['--r']: `${f.r}deg`,
            animationDelay: `${f.d}s`,
            textShadow: '0 0 18px rgba(34,211,238,0.25)',
          }}
        >
          {f.t}
        </span>
      ))}
    </div>
  )
}

/* ----------------------------- Magnetic Button ----------------------------- */
function MagneticButton({ children, onClick, className = '', primary = false, ariaLabel }) {
  const ref = useRef(null)
  const onMove = (e) => {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left - r.width / 2
    const y = e.clientY - r.top - r.height / 2
    el.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`
  }
  const reset = () => { if (ref.current) ref.current.style.transform = '' }
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={reset}
      aria-label={ariaLabel}
      className={`${primary ? 'btn-primary' : 'btn-ghost'} ${className}`}
      style={{ transition: 'transform 0.18s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.25s ease, filter 0.2s ease' }}
    >
      {children}
    </button>
  )
}

/* ----------------------------- Konami easter egg ----------------------------- */
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']
function useKonami(onTrigger) {
  useEffect(() => {
    let buf = []
    const handler = (e) => {
      buf.push(e.key)
      if (buf.length > KONAMI.length) buf = buf.slice(-KONAMI.length)
      if (buf.length === KONAMI.length && buf.every((k, i) => k.toLowerCase() === KONAMI[i].toLowerCase())) {
        onTrigger()
        buf = []
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onTrigger])
}

/* ----------------------------- Static content ----------------------------- */
const featureCards = [
  { icon: BrainCircuit, title: 'AI problem parsing', description: 'Write naturally. We extract variables, units, assumptions, and a solution path automatically.' },
  { icon: Boxes,        title: 'Physics + Chemistry', description: 'Mechanics, waves, EM, optics, thermo, stoichiometry, bonding, gas laws, and more.' },
  { icon: Rocket,       title: 'Interactive simulations', description: 'Manipulate parameters in real time. See trajectories, forces, and state changes update live.' },
  { icon: LineChart,    title: 'Live telemetry graphs', description: 'Position, velocity, energy, fields, pH, derived values — all updating in real time.' },
  { icon: FlaskConical, title: 'Learning-first explanations', description: 'Step-by-step solutions, formula references, and what-if probes reinforce intuition.' },
  { icon: ShieldCheck,  title: 'Multi-provider AI', description: 'Compatible with OpenAI, Anthropic, Gemini, Groq, and Ollama for flexibility and resilience.' },
]

const workflow = [
  { title: 'Describe your problem', description: 'Plain language — whatever details you have.' },
  { title: 'AI structures the scenario', description: 'Validated variables and simulation-ready parameters.' },
  { title: 'Explore and iterate', description: 'Run, pause, slide, inspect graphs, and follow the reasoning.' },
]

const coverage = [
  'Projectile Motion','Pendulum','Collisions','Waves','Circular Motion',
  'Rotational Mechanics','Spring-Mass','Inclined Plane','Gravitational Orbits',
  'Electric Fields','Magnetic Fields','Optics','Buoyancy','Ideal Gas',
  'Radioactive Decay','Stoichiometry','Atomic Structure','Gas Laws',
  'Chemical Bonding','Titration','Combustion','Organic Chemistry',
]

function FadeUp({ children, delay = 0, className = '' }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
    >
      {children}
    </Motion.div>
  )
}

/* ============================== PAGE ============================== */
export default function Landing() {
  const navigate = useNavigate()
  const [konami, setKonami] = useState(false)
  const [eggToast, setEggToast] = useState(false)

  const triggerKonami = useCallback(() => {
    setKonami(true)
    setEggToast(true)
    setTimeout(() => setKonami(false), 6000)
    setTimeout(() => setEggToast(false), 4500)
  }, [])
  useKonami(triggerKonami)

  return (
    <div
      className={`min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] ${konami ? 'konami-mode' : ''}`}
    >
      <Navbar onOpenSettings={() => {}} apiConnected currentPage="physics" />

      <main className="pt-16">
        {/* === HERO === */}
        <section className="relative min-h-[92vh] overflow-hidden border-b border-[var(--color-border)]">
          {/* Aurora */}
          <div className="aurora" />
          {/* Particles */}
          <div className="absolute inset-0">
            <ParticleField flipGravity={konami} />
          </div>
          {/* Grid mask */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.45] mask-fade-bottom"
            style={{
              backgroundImage: `
                linear-gradient(rgba(34, 211, 238, 0.06) 1px, transparent 1px),
                linear-gradient(90deg, rgba(34, 211, 238, 0.06) 1px, transparent 1px)
              `,
              backgroundSize: '46px 46px',
            }}
          />
          <FloatingEquations />

          <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-12 md:py-28">
            {/* LEFT */}
            <div className="md:col-span-7 flex flex-col justify-center space-y-7">
              <FadeUp>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 backdrop-blur">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
                  </span>
                  Type a problem. Watch the physics.
                </div>
              </FadeUp>

              <FadeUp delay={0.05}>
                <h1 className="text-shadow-glow text-[clamp(2.6rem,6vw,5.5rem)] font-bold leading-[1.02] tracking-[-0.02em] text-white">
                  See the{' '}
                  <span className="bg-gradient-to-r from-cyan-200 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                    Science.
                  </span>
                  <br />
                  <span className="text-white/85">Don't just solve it.</span>
                </h1>
              </FadeUp>

              <FadeUp delay={0.1}>
                <p className="max-w-xl text-base text-[var(--color-text-muted)] md:text-lg">
                  An AI-powered playground where natural-language physics &amp; chemistry problems become
                  interactive simulations — with live telemetry, step-by-step reasoning, and what-if probes.
                </p>
              </FadeUp>

              <FadeUp delay={0.16}>
                <TypingPrompt />
              </FadeUp>

              <FadeUp delay={0.22}>
                <div className="flex flex-wrap gap-3">
                  <MagneticButton primary onClick={() => navigate('/app')} ariaLabel="Open simulator">
                    <Play size={16} fill="currentColor" />
                    Launch the simulator
                    <ArrowRight size={16} />
                  </MagneticButton>
                  <MagneticButton onClick={() => navigate('/formulas')} ariaLabel="Open formula sheet">
                    <Atom size={16} />
                    Browse formulas
                  </MagneticButton>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
                    className="hidden items-center gap-2 self-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-2 text-xs text-[var(--color-text-muted)] backdrop-blur transition hover:border-cyan-400/40 hover:text-cyan-200 md:flex"
                    aria-label="Open command palette"
                  >
                    <Command size={12} /> <span className="kbd">⌘</span><span className="kbd">K</span>
                    <span className="opacity-70">to search anything</span>
                  </button>
                </div>
              </FadeUp>

              <FadeUp delay={0.28}>
                <div className="grid max-w-xl grid-cols-4 gap-3 pt-2">
                  {[
                    { n: '23', l: 'simulations' },
                    { n: '2',  l: 'domains' },
                    { n: '5',  l: 'AI providers' },
                    { n: '0',  l: 'keys needed' },
                  ].map((s) => (
                    <div key={s.l} className="rounded-xl border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_60%,transparent)] px-3 py-2.5 backdrop-blur">
                      <div className="bg-gradient-to-br from-white to-cyan-200 bg-clip-text text-2xl font-bold leading-none text-transparent">
                        {s.n}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{s.l}</div>
                    </div>
                  ))}
                </div>
              </FadeUp>
            </div>

            {/* RIGHT */}
            <div className="md:col-span-5 flex items-center justify-center">
              <FadeUp delay={0.12} className="w-full max-w-md">
                <LandingMiniSim />
              </FadeUp>
            </div>
          </div>

          {/* Ticker */}
          <div className="relative overflow-hidden border-t border-[var(--color-border)] bg-[color:color-mix(in_oklab,var(--color-surface)_92%,transparent)] py-3">
            <div className="animate-slide-horizontal whitespace-nowrap">
              {[0, 1].map((i) => (
                <div key={i} className="inline-block pr-8 font-mono text-xs text-[var(--color-text-muted)]">
                  ✦ 23 simulations &nbsp;·&nbsp; physics + chemistry &nbsp;·&nbsp; 5 AI providers &nbsp;·&nbsp; live telemetry &nbsp;·&nbsp; offline fallback &nbsp;·&nbsp; what-if probes &nbsp;·&nbsp; guided tour &nbsp;·&nbsp; built for understanding &nbsp;✦&nbsp;
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* === FEATURES === */}
        <section className="relative mx-auto max-w-7xl px-6 py-20">
          <FadeUp>
            <div className="mb-12 max-w-3xl">
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-300">Capabilities</p>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Not a formula app.<br/>A simulation-first learning system.</h2>
              <p className="mt-4 text-[var(--color-text-muted)] md:text-lg">
                AI parses your problem, builds a validated scenario, and runs a real, interactive simulation alongside step-by-step reasoning.
              </p>
            </div>
          </FadeUp>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature, index) => {
              const Icon = feature.icon
              return (
                <FadeUp key={feature.title} delay={0.04 * index}>
                  <article
                    className="group relative h-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[color:color-mix(in_oklab,var(--color-surface)_88%,transparent)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-[0_18px_40px_-20px_rgba(34,211,238,0.4)]"
                  >
                    <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-500/0 blur-3xl transition-all duration-500 group-hover:bg-cyan-500/15" />
                    <div className="mb-4 inline-flex rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-2.5 text-cyan-300 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]">
                      <Icon size={18} />
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{feature.description}</p>
                  </article>
                </FadeUp>
              )
            })}
          </div>
        </section>

        {/* === WORKFLOW === */}
        <section className="relative border-y border-[var(--color-border)] bg-[color:color-mix(in_oklab,var(--color-surface)_92%,transparent)]">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <FadeUp>
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-300">How it works</p>
              <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Three steps from prompt to insight.</h2>
            </FadeUp>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {workflow.map((step, index) => (
                <FadeUp key={step.title} delay={0.06 * index}>
                  <article className="relative h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
                    <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-950">
                      Step {String(index + 1).padStart(2, '0')}
                    </div>
                    <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">{step.description}</p>
                  </article>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* === COVERAGE === */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <FadeUp>
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-300">Library</p>
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">23 simulations. Zero setup.</h2>
            <p className="mt-3 max-w-3xl text-[var(--color-text-muted)] md:text-lg">
              From projectile motion to titrations — every concept ships with a live, parameter-tweakable simulation.
            </p>
          </FadeUp>

          <div className="mt-10 flex flex-wrap gap-2">
            {coverage.map((item, i) => (
              <Motion.span
                key={item}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.012 }}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm transition-all hover:scale-[1.04] hover:border-cyan-400/50 hover:text-cyan-200"
              >
                <CheckCircle2 size={14} className="text-cyan-300" />
                {item}
              </Motion.span>
            ))}
          </div>
        </section>

        {/* === FINAL CTA === */}
        <section className="relative overflow-hidden border-t border-[var(--color-border)]">
          <div className="aurora opacity-60" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-6 py-20 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm text-cyan-300">
                <Atom size={16} />
                Ready to make science visible?
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
                Stop reading equations.<br/>
                <span className="bg-gradient-to-r from-cyan-200 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Start running them.</span>
              </h2>
              <p className="mt-3 max-w-xl text-[var(--color-text-muted)]">
                Parse a problem, run the simulation, inspect the graph, follow the reasoning. Built in a hackathon — engineered like a product.
              </p>
            </div>
            <MagneticButton primary onClick={() => navigate('/app')} ariaLabel="Open SeeTheScience">
              <Command size={16} />
              Open SeeTheScience
              <ArrowRight size={16} />
            </MagneticButton>
          </div>
          <div className="border-t border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-text-muted)]">
            Crafted with curiosity. Pro tip: try the Konami code.
          </div>
        </section>
      </main>

      {/* Easter egg toast */}
      {eggToast && (
        <Motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-cyan-300/40 bg-black/80 px-5 py-2.5 text-sm text-cyan-200 shadow-2xl backdrop-blur"
        >
          ✨ Gravity inverted. The universe is watching.
        </Motion.div>
      )}
    </div>
  )
}
