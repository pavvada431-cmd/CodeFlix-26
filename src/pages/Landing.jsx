import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { m, useInView, useScroll, useTransform } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Html, Line, OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import {
  ArrowRight,
  Atom,
  Brain,
  ChevronRight,
  Code2,
  Cpu,
  Eye,
  Flame,
  FlaskConical,
  Layers,
  LineChart,
  Magnet,
  Pause,
  Play,
  Radio,
  Sliders,
  Sparkles,
  Sun,
  Waves,
  Wind,
} from 'lucide-react'

const NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E\")"

const FEATURES = [
  {
    icon: Brain,
    title: 'AI Problem Parsing',
    description: 'Describe any problem in plain language.\nCodeFlix maps it to simulation variables.',
  },
  {
    icon: Layers,
    title: '17+ Simulations',
    description: 'Mechanics, waves, EM, optics,\nthermo, and chemistry in one place.',
  },
  {
    icon: LineChart,
    title: 'Real-Time Graphs',
    description: 'See position, velocity, energy,\nand trends while experiments run.',
  },
  {
    icon: Sliders,
    title: 'Interactive Controls',
    description: 'Tune sliders, play/pause, speed,\nand camera zoom instantly.',
  },
  {
    icon: Cpu,
    title: 'Multi-Provider AI',
    description: 'OpenAI, Anthropic, Gemini,\nGroq, and Ollama support.',
  },
  {
    icon: Sun,
    title: 'Dark & Light Themes',
    description: 'Clean contrast and readability\nfor any study environment.',
  },
]

const SHOWCASE = [
  { name: 'Projectile Motion', category: 'Mechanics', icon: Waves, demo: 'A ball is launched at 24 m/s at an angle of 52 degrees.' },
  { name: 'Pendulum', category: 'Mechanics', icon: Layers, demo: 'A simple pendulum has length 2.2 m and starts at 30 degrees.' },
  { name: 'Wave Motion', category: 'Waves', icon: Wind, demo: 'A wave has amplitude 0.4 m, wavelength 2 m, and frequency 2 Hz.' },
  { name: 'Electric Fields', category: 'EM', icon: Magnet, demo: 'Two charges +1μC and -1μC are separated by 2 meters.' },
  { name: 'Optics', category: 'Optics', icon: Eye, demo: 'A convex lens has focal length 12 cm and object distance 24 cm.' },
  { name: 'Thermodynamics', category: 'Thermo', icon: Flame, demo: 'An ideal gas expands from 2 L to 5 L at constant temperature.' },
  { name: 'Radioactive Decay', category: 'Nuclear', icon: Radio, demo: 'A sample starts with 1000 nuclei and half-life of 6 minutes.' },
  { name: 'Orbital Motion', category: 'Space', icon: Atom, demo: 'A satellite orbits Earth at 420 km altitude.' },
]

const STEPS = [
  {
    number: '01',
    icon: Brain,
    title: 'Describe Your Problem',
    description: 'Type your question in plain English with whatever details you know.',
  },
  {
    number: '02',
    icon: Cpu,
    title: 'AI Parses & Validates',
    description: 'CodeFlix extracts variables, sanity-checks values, and builds the model.',
  },
  {
    number: '03',
    icon: Play,
    title: 'Watch It Come Alive',
    description: 'Interact with a real simulation and verify concepts with live feedback.',
  },
]

const MotionDiv = m.div
const MotionArticle = m.article
const MotionButton = m.button
const MotionH1 = m.h1
const MotionP = m.p

function useThemeDark() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const parseColor = (value) => {
      if (!value) return [10, 15, 30]
      if (value.startsWith('#')) {
        const hex = value.replace('#', '')
        if (hex.length === 3) {
          return hex.split('').map((c) => parseInt(c + c, 16))
        }
        if (hex.length === 6) {
          return [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map((h) => parseInt(h, 16))
        }
      }
      if (value.startsWith('rgb')) {
        const parts = value.match(/\d+/g)
        if (parts?.length >= 3) return parts.slice(0, 3).map(Number)
      }
      return [10, 15, 30]
    }

    const readTheme = () => {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()
      const [r, g, b] = parseColor(bg)
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      setIsDark(luminance < 0.52)
    }

    readTheme()
    const observer = new MutationObserver(readTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    window.addEventListener('themechange', readTheme)
    return () => {
      observer.disconnect()
      window.removeEventListener('themechange', readTheme)
    }
  }, [])

  return isDark
}

function FormulaFloat({ text, className, delay }) {
  return (
    <MotionDiv
      className={`pointer-events-none absolute select-none font-mono text-sm md:text-base ${className}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 0.16, y: [0, -14, 0], x: [0, 12, 0] }}
      transition={{ duration: 11 + delay, ease: 'easeInOut', repeat: Infinity, delay }}
    >
      {text}
    </MotionDiv>
  )
}

function AtomSignature({ isDark }) {
  const rootRef = useRef()
  const electrons = useRef([])

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    if (rootRef.current) {
      rootRef.current.rotation.y += delta * 0.25
      rootRef.current.rotation.x = Math.sin(t * 0.4) * 0.15
    }

    electrons.current.forEach((electron, i) => {
      if (!electron) return
      const orbit = i % 3
      const speed = 1.6 + i * 0.35
      const radius = 1.5 + (i % 2) * 0.15
      const phase = i * 1.4
      const a = t * speed + phase

      if (orbit === 0) {
        electron.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius)
      } else if (orbit === 1) {
        electron.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0)
      } else {
        electron.position.set(0, Math.cos(a) * radius, Math.sin(a) * radius)
      }
    })
  })

  return (
    <>
      <fog attach="fog" args={[isDark ? '#071022' : '#dff6ff', 6, 16]} />
      <ambientLight intensity={0.25} color={isDark ? '#88a2c0' : '#8aa2b6'} />
      <directionalLight position={[3.5, 5, 4]} intensity={1.1} color="#ffffff" />
      <pointLight position={[-3, 2, -2]} intensity={0.5} color="#22d3ee" />
      <pointLight position={[2.5, -1, 2.5]} intensity={0.35} color="#a855f7" />
      <Environment preset={isDark ? 'night' : 'city'} intensity={0.22} />

      <group ref={rootRef}>
        <mesh>
          <sphereGeometry args={[0.38, 48, 48]} />
          <meshPhysicalMaterial
            color={isDark ? '#67e8f9' : '#0891b2'}
            emissive={isDark ? '#22d3ee' : '#0891b2'}
            emissiveIntensity={0.7}
            roughness={0.22}
            metalness={0.24}
            clearcoat={1}
            clearcoatRoughness={0.12}
            transmission={0.08}
          />
        </mesh>

        {[0, 1, 2].map((ring) => (
          <group key={ring} rotation={[ring === 0 ? 0 : Math.PI / 2, ring === 2 ? Math.PI / 3 : 0, ring === 1 ? Math.PI / 2 : 0]}>
            <mesh>
              <torusGeometry args={[1.52, 0.012, 18, 180]} />
              <meshPhysicalMaterial
                color={ring === 0 ? '#22d3ee' : ring === 1 ? '#a855f7' : '#22c55e'}
                emissive={ring === 0 ? '#22d3ee' : ring === 1 ? '#a855f7' : '#22c55e'}
                emissiveIntensity={0.22}
                roughness={0.35}
                metalness={0.2}
                transparent
                opacity={0.75}
              />
            </mesh>
          </group>
        ))}

        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={`electron-${i}`} ref={(el) => (electrons.current[i] = el)}>
            <sphereGeometry args={[0.07, 18, 18]} />
            <meshPhysicalMaterial
              color={i % 2 === 0 ? '#22d3ee' : '#a855f7'}
              emissive={i % 2 === 0 ? '#22d3ee' : '#a855f7'}
              emissiveIntensity={1.2}
              roughness={0.18}
              metalness={0.32}
              clearcoat={1}
            />
          </mesh>
        ))}
      </group>
    </>
  )
}

function SignatureMoment({ isDark }) {
  return (
    <div className="h-[320px] w-full overflow-hidden rounded-3xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/40 shadow-2xl backdrop-blur-xl md:h-[420px]">
      <Canvas
        camera={{ position: [0, 0.8, 5.5], fov: 48 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <AtomSignature isDark={isDark} />
        <EffectComposer>
          <Bloom intensity={0.42} luminanceThreshold={0.35} luminanceSmoothing={0.9} mipmapBlur />
          <Vignette offset={0.25} darkness={0.45} />
        </EffectComposer>
        <OrbitControls enableDamping dampingFactor={0.08} minDistance={3.6} maxDistance={7.5} enablePan={false} />
      </Canvas>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description, index }) {
  const ref = useRef(null)
  const visible = useInView(ref, { once: true, margin: '-60px' })

  return (
    <MotionArticle
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/50 p-5 backdrop-blur-xl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)]/8 via-transparent to-purple-500/8 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10">
        <div className="mb-4 inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/55 p-3 text-[var(--color-accent)]">
          {createElement(Icon, { className: 'h-5 w-5' })}
        </div>
        <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">{title}</h3>
        <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-text-muted)]">{description}</p>
      </div>
    </MotionArticle>
  )
}

function ProjectileScene({ speed, angle, running, resetToken, onSample, onStop, isDark }) {
  const posRef = useRef({ x: -2.8, y: 1.15, z: 0 })
  const velRef = useRef({ x: 0, y: 0, z: 0 })
  const projectileRef = useRef()
  const activeRef = useRef(false)
  const lastSyncRef = useRef(0)
  const trailRef = useRef([])
  const [trail, setTrail] = useState([])
  const GRAVITY = -9.81 * 0.28

  useEffect(() => {
    const rad = (angle * Math.PI) / 180
    posRef.current = { x: -2.8, y: 1.15, z: 0 }
    velRef.current = { x: speed * Math.cos(rad) * 0.22, y: speed * Math.sin(rad) * 0.22, z: 0 }
    activeRef.current = running
    trailRef.current = [[posRef.current.x, posRef.current.y, 0]]
    setTrail([[posRef.current.x, posRef.current.y, 0]])
    if (projectileRef.current) {
      projectileRef.current.position.set(posRef.current.x, posRef.current.y, 0)
    }
    onSample?.({ time: 0, x: 0, y: 1.15, speed: 0 })
  }, [speed, angle, running, resetToken, onSample])

  useEffect(() => {
    activeRef.current = running
  }, [running])

  useFrame(({ clock }, delta) => {
    if (!activeRef.current) return

    const dt = Math.min(delta, 0.033)
    velRef.current.y += GRAVITY * dt
    posRef.current.x += velRef.current.x * dt
    posRef.current.y += velRef.current.y * dt
    if (projectileRef.current) {
      projectileRef.current.position.set(posRef.current.x, posRef.current.y, 0)
    }

    if (posRef.current.y <= 0.12) {
      posRef.current.y = 0.12
      activeRef.current = false
      onStop?.()
    }

    trailRef.current = [...trailRef.current.slice(-140), [posRef.current.x, posRef.current.y, 0]]

    if (clock.elapsedTime - lastSyncRef.current > 0.05) {
      setTrail([...trailRef.current])
      const v = Math.hypot(velRef.current.x, velRef.current.y) / 0.22
      onSample?.({
        time: clock.elapsedTime,
        x: Math.max(0, (posRef.current.x + 2.8) / 0.22),
        y: Math.max(0, posRef.current.y),
        speed: v,
      })
      lastSyncRef.current = clock.elapsedTime
    }
  })

  return (
    <>
      <fog attach="fog" args={[isDark ? '#081223' : '#e4f7ff', 7, 16]} />
      <Environment preset={isDark ? 'city' : 'warehouse'} intensity={0.2} />
      <ambientLight intensity={0.28} color={isDark ? '#96afd0' : '#93a5b8'} />
      <directionalLight position={[4, 6, 4]} intensity={1.05} />
      <pointLight position={[-3, 3, -2]} intensity={0.45} color="#22d3ee" />
      <pointLight position={[3, 1, 2]} intensity={0.35} color="#ff8a4c" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[14, 14]} />
        <meshPhysicalMaterial color={isDark ? '#0c1524' : '#d9eef7'} metalness={0.36} roughness={0.3} />
      </mesh>

      <Line
        points={[
          [-6, 0.001, 0],
          [6, 0.001, 0],
        ]}
        color={isDark ? '#254b66' : '#6b879c'}
        transparent
        opacity={0.65}
        lineWidth={1.2}
      />

      <mesh position={[-2.8, 0.58, 0]}>
        <boxGeometry args={[0.45, 1.16, 0.45]} />
        <meshPhysicalMaterial color="#3a5268" metalness={0.58} roughness={0.22} clearcoat={0.7} />
      </mesh>

      <mesh ref={projectileRef} position={[-2.8, 1.15, 0]}>
        <sphereGeometry args={[0.12, 28, 28]} />
        <meshPhysicalMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.3}
          clearcoat={1}
          transmission={0.08}
        />
      </mesh>

      {trail.length > 1 && (
        <Line
          points={trail}
          color="#67e8f9"
          transparent
          opacity={0.78}
          lineWidth={2}
        />
      )}

      <Html position={[-4.3, 1.8, 0]} center>
        <div className="rounded-lg border border-cyan-300/30 bg-[#0b1222]/70 px-2 py-1 text-[10px] font-medium text-cyan-200 backdrop-blur-md">
          Live Projectile
        </div>
      </Html>

      <EffectComposer>
        <Bloom intensity={0.36} luminanceThreshold={0.42} luminanceSmoothing={0.92} mipmapBlur />
      </EffectComposer>
    </>
  )
}

function LiveDemo({ isDark, onOpenPhysics }) {
  const [speed, setSpeed] = useState(20)
  const [angle, setAngle] = useState(50)
  const [running, setRunning] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  const [sample, setSample] = useState({ x: 0, y: 1.15, speed: 0 })

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/45 shadow-xl backdrop-blur-xl">
      <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
        <div className="h-[320px] md:h-[380px]">
          <Canvas camera={{ position: [0, 2.2, 6.6], fov: 47 }} style={{ background: 'transparent' }}>
            <ProjectileScene
              speed={speed}
              angle={angle}
              running={running}
              resetToken={resetToken}
              onSample={setSample}
              onStop={() => setRunning(false)}
              isDark={isDark}
            />
            <OrbitControls enableDamping dampingFactor={0.08} minDistance={4} maxDistance={9} />
          </Canvas>
        </div>

        <div className="border-t border-[var(--color-border)]/70 p-5 lg:border-l lg:border-t-0">
          <p className="mb-5 text-sm text-[var(--color-text-muted)]">
            Don&apos;t take our word for it — try it right here
          </p>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-dim)]">Launch speed: {speed} m/s</span>
              <input
                type="range"
                min={8}
                max={35}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-dim)]">Angle: {angle}°</span>
              <input
                type="range"
                min={20}
                max={75}
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="w-full accent-purple-400"
              />
            </label>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setRunning((v) => !v)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2.5 font-medium text-[#02111a] transition hover:brightness-110"
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? 'Pause' : 'Launch'}
            </button>
            <button
              onClick={() => {
                setRunning(false)
                setResetToken((n) => n + 1)
              }}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-text-muted)] transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-text)]"
            >
              Reset
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-bg)]/40 p-3 text-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Range</div>
              <div className="font-mono text-sm text-[var(--color-text)]">{sample.x.toFixed(1)} m</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Height</div>
              <div className="font-mono text-sm text-[var(--color-text)]">{sample.y.toFixed(2)} m</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Speed</div>
              <div className="font-mono text-sm text-[var(--color-text)]">{sample.speed.toFixed(1)} m/s</div>
            </div>
          </div>

          <button
            onClick={onOpenPhysics}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] transition hover:gap-3"
          >
            Open full simulator
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ShowcaseCard({ item, index, onClick }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const Icon = item.icon

  const badgeTone = useMemo(() => {
    if (item.category === 'EM') return 'bg-cyan-500/15 text-cyan-300 border-cyan-300/40'
    if (item.category === 'Thermo') return 'bg-orange-500/15 text-orange-300 border-orange-300/40'
    if (item.category === 'Optics') return 'bg-emerald-500/15 text-emerald-300 border-emerald-300/40'
    if (item.category === 'Nuclear') return 'bg-green-500/15 text-green-300 border-green-300/40'
    if (item.category === 'Space') return 'bg-indigo-500/15 text-indigo-300 border-indigo-300/40'
    return 'bg-purple-500/15 text-purple-300 border-purple-300/40'
  }, [item.category])

  return (
    <MotionButton
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group relative w-[230px] flex-shrink-0 snap-start overflow-hidden rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/55 p-3 text-left backdrop-blur-xl"
    >
      <div className="relative mb-3 h-28 overflow-hidden rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-bg)]/55">
        <MotionDiv
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.30),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.26),transparent_50%)]"
          animate={{ rotate: [0, 8, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <MotionDiv
          className="absolute left-0 top-1/2 h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"
          animate={{ x: ['-70%', '70%'] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeTone}`}>
        {item.category}
      </span>
      <div className="mt-2 flex items-center gap-2">
        {createElement(Icon, { className: 'h-4 w-4 text-[var(--color-accent)]' })}
        <h4 className="text-sm font-semibold text-[var(--color-text)]">{item.name}</h4>
      </div>
      <div className="mt-2 flex items-center text-xs text-[var(--color-text-dim)]">
        Launch demo
        <ChevronRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </div>
    </MotionButton>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const isDark = useThemeDark()

  const heroRef = useRef(null)
  const featuresRef = useRef(null)
  const demoRef = useRef(null)
  const stepsRef = useRef(null)
  const showcaseRef = useRef(null)

  const heroInView = useInView(heroRef, { once: true })
  const featuresInView = useInView(featuresRef, { once: true, margin: '-120px' })
  const demoInView = useInView(demoRef, { once: true, margin: '-120px' })
  const stepsInView = useInView(stepsRef, { once: true, margin: '-120px' })
  const showcaseInView = useInView(showcaseRef, { once: true, margin: '-120px' })

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const heroParallaxOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.25])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <section ref={heroRef} className="relative min-h-screen overflow-hidden px-4 pb-14 pt-20 sm:px-6 lg:px-10">
        <MotionDiv
          style={{ y: heroParallaxY, opacity: heroParallaxOpacity }}
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.24),transparent_42%),radial-gradient(circle_at_86%_16%,rgba(168,85,247,0.22),transparent_48%),linear-gradient(180deg,rgba(0,0,0,0.03),transparent_45%)]" />
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: NOISE_SVG }} />
        </MotionDiv>

        <FormulaFloat text="∑F = ma" className="left-[8%] top-[18%] text-cyan-400" delay={0.4} />
        <FormulaFloat text="E = mc²" className="right-[9%] top-[16%] text-purple-400" delay={1.5} />
        <FormulaFloat text="PV = nRT" className="left-[12%] bottom-[20%] text-fuchsia-400" delay={2.4} />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <MotionDiv
            initial={{ opacity: 0, x: -28 }}
            animate={heroInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -28 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <MotionDiv
              initial={{ opacity: 0, y: 14 }}
              animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] backdrop-blur-xl"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              AI-powered science playground
            </MotionDiv>

            <MotionH1
              initial={{ opacity: 0, y: 18 }}
              animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-balance text-4xl font-black leading-[1.06] sm:text-5xl lg:text-6xl"
            >
              <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Where Science Comes Alive
              </span>
            </MotionH1>

            <MotionP
              initial={{ opacity: 0, y: 18 }}
              animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg"
            >
              AI understands your physics or chemistry question and converts it into a
              <br className="hidden sm:block" />
              fully interactive 3D simulation with live data you can explore instantly.
            </MotionP>

            <MotionDiv
              initial={{ opacity: 0, y: 18 }}
              animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ duration: 0.6, delay: 0.36 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <button
                onClick={() => navigate('/physics')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 px-6 py-3.5 font-semibold text-[#04131d] shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
              >
                <Atom className="h-5 w-5" />
                Try Physics
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate('/chemistry')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-transparent px-6 py-3.5 font-semibold text-[var(--color-text)] transition hover:border-purple-300/50 hover:bg-[var(--color-surface)]/55"
              >
                <FlaskConical className="h-5 w-5 text-purple-300" />
                Try Chemistry
              </button>
            </MotionDiv>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={heroInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.75, delay: 0.22 }}
          >
            <SignatureMoment isDark={isDark} />
          </MotionDiv>
        </div>
      </section>

      <section id="features" ref={featuresRef} className="px-4 py-16 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center"
          >
            <h2 className="text-3xl font-bold sm:text-4xl">Built to teach, not just render</h2>
          </MotionDiv>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section id="live-demo" ref={demoRef} className="px-4 py-16 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            animate={demoInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.55 }}
            className="mb-8 text-center"
          >
            <h2 className="text-3xl font-bold sm:text-4xl">Live demo</h2>
            <p className="mt-2 text-[var(--color-text-muted)]">Don&apos;t take our word for it — try it right here</p>
          </MotionDiv>
          <LiveDemo isDark={isDark} onOpenPhysics={() => navigate('/physics')} />
        </div>
      </section>

      <section id="how-it-works" ref={stepsRef} className="px-4 py-16 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            animate={stepsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center"
          >
            <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
          </MotionDiv>

          <div className="relative">
            <MotionDiv
              initial={{ scaleX: 0, opacity: 0 }}
              animate={stepsInView ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="absolute left-[16%] right-[16%] top-9 hidden h-[2px] origin-left bg-gradient-to-r from-cyan-400/60 via-purple-400/60 to-cyan-400/60 md:block"
            />
            <MotionDiv
              animate={{ x: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="absolute right-[15%] top-6 hidden md:block"
            >
              <ArrowRight className="h-5 w-5 text-cyan-300/70" />
            </MotionDiv>

            <div className="grid gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => {
                const Icon = step.icon
                return (
                  <MotionArticle
                    key={step.number}
                    initial={{ opacity: 0, y: 18 }}
                    animate={stepsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
                    transition={{ duration: 0.45, delay: index * 0.1 }}
                    className="rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/50 p-5 backdrop-blur-xl"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-xs font-bold tracking-widest text-[var(--color-text-dim)]">{step.number}</span>
                      <div className="rounded-lg border border-[var(--color-border)]/70 bg-[var(--color-bg)]/40 p-2 text-[var(--color-accent)]">
                        {createElement(Icon, { className: 'h-4 w-4' })}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--color-text)]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{step.description}</p>
                  </MotionArticle>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="showcase" ref={showcaseRef} className="px-4 py-16 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            animate={showcaseInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex flex-wrap items-end justify-between gap-2"
          >
            <h2 className="text-3xl font-bold sm:text-4xl">Simulation showcase</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Tap a card to launch a pre-loaded demo</p>
          </MotionDiv>

          <div className="relative -mx-4 overflow-x-auto px-4 pb-2">
            <div className="flex snap-x gap-3">
              {SHOWCASE.map((item, index) => (
                <ShowcaseCard
                  key={item.name}
                  item={item}
                  index={index}
                  onClick={() => navigate(`/app?demo=${encodeURIComponent(item.demo)}`)}
                />
              ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-r from-transparent to-[var(--color-bg)]" />
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)]/35 px-4 py-6 backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
            {[
              ['17+', 'Simulations'],
              ['5', 'AI Providers'],
              ['21', 'Problem Types'],
              ['∞', 'Curiosity'],
            ].map(([value, label], i) => (
              <div key={label} className={i > 0 ? 'md:border-l md:border-[var(--color-border)]/60' : ''}>
                <div className="bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-3xl font-black text-transparent">{value}</div>
                <div className="text-xs uppercase tracking-wider text-[var(--color-text-dim)]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)]/70 px-4 py-12 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">Built for Hackathon 2026</p>
            <p className="mt-1 text-xs text-[var(--color-text-dim)]">CodeFlix • Science, Simulated</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {['React 19', 'Tailwind 4.2', '@react-three/fiber', 'Framer Motion', 'Lucide'].map((tech) => (
              <span key={tech} className="rounded-full border border-[var(--color-border)]/80 bg-[var(--color-surface)]/50 px-3 py-1 text-xs text-[var(--color-text-muted)]">
                {tech}
              </span>
            ))}
          </div>

          <a
            href="https://github.com/your-org/codeflix"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-accent)]"
          >
            <Code2 className="h-4 w-4" />
            GitHub
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </footer>
    </div>
  )
}
