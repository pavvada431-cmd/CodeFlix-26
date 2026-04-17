import { useState, useRef, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Float } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import {
  Brain,
  Layers,
  LineChart,
  Sliders,
  Cpu,
  Sun,
  ArrowRight,
  Play,
  ChevronRight,
  Sparkles,
  Code2,
  Zap,
  Atom,
  FlaskConical,
  Wind,
  Waves,
  Magnet,
  Eye,
  FlaskRound,
  Flame,
  Radio,
} from 'lucide-react'
import * as THREE from 'three'

// Floating Formulas Component
function FloatingFormula({ formula, position, delay = 0 }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 0.08,
        y: [0, -15, 0],
        x: [0, 10, 0],
      }}
      transition={{
        duration: 8 + delay,
        repeat: Infinity,
        delay: delay,
        ease: 'easeInOut',
      }}
    >
      <span
        className="text-2xl font-mono font-bold"
        style={{ color: 'var(--color-accent)' }}
      >
        {formula}
      </span>
    </motion.div>
  )
}

// 3D Atom Component
function Atom3D({ isDark = true }) {
  const groupRef = useRef()
  const electronsRef = useRef([])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    groupRef.current.rotation.y = t * 0.3

    electronsRef.current.forEach((electron, i) => {
      if (electron) {
        const orbitIndex = i % 3
        const speed = 1.5 + i * 0.2
        const offset = (i * Math.PI * 2) / 3

        if (orbitIndex === 0) {
          electron.position.x = Math.cos(t * speed + offset) * 1.5
          electron.position.z = Math.sin(t * speed + offset) * 1.5
          electron.position.y = 0
        } else if (orbitIndex === 1) {
          electron.position.x = Math.cos(t * speed + offset) * 1.5
          electron.position.z = 0
          electron.position.y = Math.sin(t * speed + offset) * 1.5
        } else {
          electron.position.x = 0
          electron.position.z = Math.cos(t * speed + offset) * 1.5
          electron.position.y = Math.sin(t * speed + offset) * 1.5
        }
      }
    })
  })

  const electronColors = ['#22d3ee', '#a855f7', '#ec4899']

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshPhysicalMaterial
          color={isDark ? '#22d3ee' : '#0284c7'}
          emissive={isDark ? '#22d3ee' : '#0284c7'}
          emissiveIntensity={0.8}
          metalness={0.3}
          roughness={0.2}
          clearcoat={1}
        />
      </mesh>

      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[i === 0 ? 0 : Math.PI / 2, 0, i === 2 ? Math.PI / 2 : 0]}>
          <mesh>
            <torusGeometry args={[1.5, 0.008, 16, 100]} />
            <meshBasicMaterial
              color={electronColors[i]}
              transparent
              opacity={0.3}
            />
          </mesh>
        </group>
      ))}

      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={`electron-${i}`}
          ref={(el) => (electronsRef.current[i] = el)}
        >
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshPhysicalMaterial
            color={electronColors[i % 3]}
            emissive={electronColors[i % 3]}
            emissiveIntensity={1}
          />
        </mesh>
      ))}
    </group>
  )
}

// Mini Pendulum for Demo
function MiniPendulum({ swinging }) {
  const pendulumRef = useRef()
  const trailRef = useRef([])

  useFrame(({ clock }) => {
    if (!pendulumRef.current) return

    if (swinging) {
      const t = clock.getElapsedTime()
      const angle = Math.cos(t * 2) * 0.5
      pendulumRef.current.rotation.z = angle

      const x = Math.sin(angle) * 1.8
      const y = -Math.cos(angle) * 1.8
      trailRef.current = [...trailRef.current.slice(-20), { x, y }]
    }
  })

  return (
    <group position={[0, 0.5, 0]}>
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshPhysicalMaterial
          color="#374151"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh ref={pendulumRef} position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
        <meshPhysicalMaterial
          color="#6b7280"
          metalness={0.6}
          roughness={0.3}
        />
        <mesh position={[0, -0.75, 0]}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshPhysicalMaterial
            color="#22d3ee"
            emissive="#22d3ee"
            emissiveIntensity={0.5}
            metalness={0.8}
            roughness={0.1}
            clearcoat={1}
          />
        </mesh>
      </mesh>

      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 4]} />
        <meshPhysicalMaterial
          color="#111827"
          metalness={0.9}
          roughness={0.1}
          envMapIntensity={0.5}
        />
      </mesh>
    </group>
  )
}

// Scene Component
function Scene3D({ children, isDark = true }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 2, -5]} intensity={0.5} color={isDark ? '#a855f7' : '#6366f1'} />

      <Suspense fallback={null}>
        <Environment preset={isDark ? 'night' : 'city'} />
        {children}
      </Suspense>

      <EffectComposer>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.5}
      />
    </Canvas>
  )
}

// Feature Card Component
function FeatureCard({ icon: Icon, title, description, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-6 backdrop-blur-xl transition-all duration-300 hover:border-[var(--color-accent)]/30 hover:shadow-lg hover:shadow-[var(--color-accent)]/10"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative z-10">
        <div className="mb-4 inline-flex rounded-xl bg-[var(--color-accent)]/10 p-3 text-[var(--color-accent)]">
          <Icon className="h-6 w-6" />
        </div>

        <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
          {title}
        </h3>

        <p className="text-sm text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>
    </motion.div>
  )
}

// Simulation Preview Card
function SimulationCard({ name, category, icon: Icon, index, onClick }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-30px' })

  const categoryColors = {
    Mechanics: 'from-blue-500 to-cyan-500',
    Waves: 'from-purple-500 to-pink-500',
    EM: 'from-yellow-500 to-orange-500',
    Thermo: 'from-red-500 to-pink-500',
    Optics: 'from-green-500 to-emerald-500',
    Chemistry: 'from-indigo-500 to-purple-500',
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="group relative flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-300 hover:border-[var(--color-accent)]/50 hover:shadow-xl hover:shadow-[var(--color-accent)]/20"
    >
      <div className={`h-32 w-48 bg-gradient-to-br ${categoryColors[category] || 'from-gray-500 to-gray-600'} opacity-20 transition-opacity duration-300 group-hover:opacity-30`} />

      <div className="absolute inset-0 flex flex-col justify-end p-4">
        <div className="mb-2">
          <span
            className={`inline-block rounded-full bg-gradient-to-r ${categoryColors[category]} px-2 py-0.5 text-[10px] font-medium text-white`}
          >
            {category}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--color-accent)]" />
          <h4 className="font-medium text-[var(--color-text)]">{name}</h4>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="rounded-full bg-[var(--color-accent)]/20 p-3 backdrop-blur-sm">
          <Play className="h-5 w-5 text-[var(--color-accent)]" />
        </div>
      </div>
    </motion.div>
  )
}

// Step Component
function StepCard({ number, icon: Icon, title, description, isLast, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
      transition={{ duration: 0.5, delay: index * 0.2 }}
      className="relative"
    >
      <div className="flex gap-6">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] text-lg font-bold text-white shadow-lg shadow-[var(--color-accent)]/30">
            {number}
          </div>

          {!isLast && (
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 + 0.3 }}
              className="mt-4 h-20 w-0.5 bg-gradient-to-b from-[var(--color-accent)] to-transparent"
            />
          )}
        </div>

        <div className="flex-1 pb-12">
          <div className="mb-3 inline-flex rounded-xl bg-[var(--color-accent)]/10 p-3 text-[var(--color-accent)]">
            <Icon className="h-6 w-6" />
          </div>

          <h3 className="mb-2 text-xl font-semibold text-[var(--color-text)]">
            {title}
          </h3>

          <p className="text-[var(--color-text-muted)]">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// Stats Bar Component
function StatsBar() {
  const stats = [
    { value: '17+', label: 'Simulations' },
    { value: '5', label: 'AI Providers' },
    { value: '21', label: 'Problem Types' },
    { value: '∞', label: 'Curiosity' },
  ]

  return (
    <div className="flex flex-wrap justify-center gap-8 border-y border-[var(--color-border)] py-8">
      {stats.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] bg-clip-text text-3xl font-bold text-transparent">
            {stat.value}
          </div>
          <div className="mt-1 text-sm text-[var(--color-text-muted)]">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// Main Landing Component
export default function Landing() {
  const navigate = useNavigate()
  const heroRef = useRef(null)
  const [isSwinging, setIsSwinging] = useState(false)

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 100])

  const handleNavigate = (path) => {
    navigate(path)
  }

  const features = [
    {
      icon: Brain,
      title: 'AI Problem Parsing',
      description: 'Describe physics problems in plain English. Our AI understands context, extracts variables, and validates inputs.',
    },
    {
      icon: Layers,
      title: '17+ Simulations',
      description: 'From mechanics to electromagnetism, thermodynamics to optics. Complete coverage of undergraduate physics.',
    },
    {
      icon: LineChart,
      title: 'Real-Time Graphs',
      description: 'Watch data unfold as simulations run. Velocity, acceleration, energy — all visualized live.',
    },
    {
      icon: Sliders,
      title: 'Interactive Controls',
      description: 'Adjust parameters mid-simulation. Change angles, masses, velocities and see instant results.',
    },
    {
      icon: Cpu,
      title: 'Multi-Provider AI',
      description: 'Choose your AI backend. OpenAI, Anthropic, Gemini, Groq, or local Ollama — you decide.',
    },
    {
      icon: Sun,
      title: 'Dark & Light Themes',
      description: 'Student-friendly in any environment. Easy on the eyes during late-night study sessions.',
    },
  ]

  const simulations = [
    { name: 'Projectile Motion', category: 'Mechanics', icon: Waves },
    { name: 'Pendulum', category: 'Mechanics', icon: Layers },
    { name: 'Gravitational Orbits', category: 'Mechanics', icon: Atom },
    { name: 'Wave Motion', category: 'Waves', icon: Wind },
    { name: 'Electric Fields', category: 'EM', icon: Zap },
    { name: 'Magnetic Fields', category: 'EM', icon: Magnet },
    { name: 'Optics', category: 'Optics', icon: Eye },
    { name: 'Thermodynamics', category: 'Thermo', icon: Flame },
  ]

  const formulas = [
    { formula: '∑F = ma', position: { x: 5, y: 20 } },
    { formula: 'E = mc²', position: { x: 85, y: 15 } },
    { formula: 'PV = nRT', position: { x: 10, y: 70 } },
    { formula: 'F = Gm₁m₂/r²', position: { x: 80, y: 65 } },
    { formula: 'λ = h/p', position: { x: 50, y: 85 } },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-[var(--color-border)]/50 bg-[var(--color-bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] font-bold text-white shadow-lg shadow-[var(--color-accent)]/30">
              <Atom className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              CodeFlix
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-6"
          >
            <a
              href="#features"
              className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
            >
              Features
            </a>
            <a
              href="#demo"
              className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
            >
              Demo
            </a>
            <a
              href="https://github.com/pavvada431-cmd/CodeFlix-26"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
            >
              <Code2 className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen pt-16">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            style={{ opacity: heroOpacity, y: heroY }}
            className="absolute inset-0"
          >
            <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[var(--color-accent)]/20 to-transparent blur-[100px]" />
            <div className="absolute right-0 bottom-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-purple-500/20 to-transparent blur-[80px]" />

            {formulas.map((f, i) => (
              <FloatingFormula
                key={i}
                formula={f.formula}
                position={f.position}
                delay={i * 2}
              />
            ))}

            <div
              className="absolute inset-0 opacity-[0.015]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            />
          </motion.div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:flex lg:items-center lg:py-32 lg:px-8">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="lg:w-1/2"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2"
            >
              <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                AI-Powered Physics & Chemistry
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6 text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl"
            >
              <span style={{ color: 'var(--color-text)' }}>Where Science</span>
              <br />
              <span className="bg-gradient-to-r from-[var(--color-accent)] via-purple-500 to-[var(--color-accent-hover)] bg-clip-text text-transparent">
                Comes Alive
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-8 text-lg text-[var(--color-text-muted)] sm:text-xl"
            >
              Transform complex physics and chemistry problems into stunning 3D simulations.
              Just describe your problem — our AI handles the rest.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <button
                onClick={() => handleNavigate('/physics')}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] px-8 py-4 font-semibold text-white shadow-lg shadow-[var(--color-accent)]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-accent)]/40 hover:-translate-y-0.5"
              >
                <Atom className="h-5 w-5" />
                <span>Try Physics</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => handleNavigate('/chemistry')}
                className="group inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--color-accent)]/30 bg-transparent px-8 py-4 font-semibold text-[var(--color-accent)] transition-all duration-300 hover:bg-[var(--color-accent)]/10"
              >
                <FlaskConical className="h-5 w-5" />
                <span>Try Chemistry</span>
              </button>
            </motion.div>
          </motion.div>

          {/* Right - 3D Canvas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 h-[400px] lg:mt-0 lg:ml-16 lg:h-[500px] lg:w-1/2"
          >
            <div className="h-full w-full overflow-hidden rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/20 shadow-2xl shadow-[var(--color-accent)]/10 backdrop-blur-sm">
              <Scene3D>
                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                  <Atom3D />
                </Float>
              </Scene3D>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-xs text-[var(--color-text-dim)]">Scroll to explore</span>
            <div className="h-8 w-5 rounded-full border-2 border-[var(--color-text-dim)] p-1">
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold sm:text-5xl" style={{ color: 'var(--color-text)' }}>
              Powerful Features
            </h2>
            <p className="text-lg text-[var(--color-text-muted)]">
              Everything you need to master physics and chemistry
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <FeatureCard key={i} {...feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section id="demo" className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold sm:text-5xl" style={{ color: 'var(--color-text)' }}>
              Try It Right Here
            </h2>
            <p className="text-lg text-[var(--color-text-muted)]">
              Don't take our word for it — experience the magic yourself
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/30 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex h-[400px] flex-col lg:flex-row">
              {/* Demo Canvas */}
              <div className="relative h-64 w-full lg:h-full lg:w-2/3">
                <Canvas
                  camera={{ position: [3, 2, 5], fov: 50 }}
                  gl={{ antialias: true, alpha: true }}
                  style={{ background: 'transparent' }}
                >
                  <ambientLight intensity={0.3} />
                  <directionalLight position={[5, 5, 5]} intensity={0.8} />

                  <Suspense fallback={null}>
                    <MiniPendulum swinging={isSwinging} />
                  </Suspense>

                  <EffectComposer>
                    <Bloom intensity={0.4} luminanceThreshold={0.3} />
                  </EffectComposer>
                </Canvas>

                <div className="absolute bottom-4 left-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-2 backdrop-blur-sm">
                  <span className="font-mono text-sm text-[var(--color-text-muted)]">
                    Simple Pendulum • L = 1.5m
                  </span>
                </div>
              </div>

              {/* Demo Controls */}
              <div className="flex w-full flex-col justify-center border-t border-[var(--color-border)] p-6 lg:h-full lg:w-1/3 lg:border-t-0 lg:border-l">
                <h3 className="mb-6 text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                  Interactive Demo
                </h3>

                <div className="space-y-4">
                  <button
                    onClick={() => setIsSwinging(!isSwinging)}
                    className={`group inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-medium transition-all duration-300 ${
                      isSwinging
                        ? 'bg-[var(--color-error)] text-white'
                        : 'bg-[var(--color-accent)] text-white'
                    }`}
                  >
                    {isSwinging ? (
                      <>
                        <span>Stop</span>
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          <FlaskRound className="h-5 w-5" />
                        </motion.div>
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5" />
                        <span>Start Pendulum</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleNavigate('/physics')}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-transparent px-6 py-3 font-medium text-[var(--color-text-muted)] transition-all duration-300 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    <span>Explore More</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>

                <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-text-dim)]">
                    Physics Info
                  </div>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-muted)]">Period:</span>
                      <span style={{ color: 'var(--color-accent)' }}>T = 2π√(L/g)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-muted)]">Length:</span>
                      <span style={{ color: 'var(--color-accent)' }}>1.5 m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-muted)]">Gravity:</span>
                      <span style={{ color: 'var(--color-accent)' }}>9.81 m/s²</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold sm:text-5xl" style={{ color: 'var(--color-text)' }}>
              How It Works
            </h2>
            <p className="text-lg text-[var(--color-text-muted)]">
              From problem to simulation in three simple steps
            </p>
          </motion.div>

          <div className="space-y-8">
            {[
              {
                icon: Brain,
                title: 'Describe Your Problem',
                description: 'Type your physics or chemistry problem in plain English. "A 5kg ball is thrown at 20 m/s at 45 degrees"',
              },
              {
                icon: Cpu,
                title: 'AI Parses & Validates',
                description: 'Our AI analyzes your input, extracts variables like mass, velocity, and angle, then validates the physics.',
              },
              {
                icon: Atom,
                title: 'Watch It Come Alive',
                description: 'A beautiful 3D simulation appears. Interact with it — adjust parameters, pause, explore from any angle.',
              },
            ].map((step, i) => (
              <StepCard
                key={i}
                number={i + 1}
                {...step}
                isLast={i === 2}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Simulation Showcase */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="mb-4 text-4xl font-bold sm:text-5xl" style={{ color: 'var(--color-text)' }}>
              Simulation Showcase
            </h2>
            <p className="text-lg text-[var(--color-text-muted)]">
              Click any simulation to try it instantly
            </p>
          </motion.div>

          <div className="relative -mx-4 overflow-x-auto px-4 pb-4">
            <div className="flex gap-4">
              <AnimatePresence mode="popLayout">
                {simulations.map((sim, i) => (
                  <SimulationCard
                    key={sim.name}
                    {...sim}
                    index={i}
                    onClick={() => handleNavigate(`/physics?sim=${encodeURIComponent(sim.name)}`)}
                  />
                ))}
              </AnimatePresence>
            </div>

            <div className="pointer-events-none absolute right-0 top-0 h-full w-24 bg-gradient-to-r from-transparent to-[var(--color-bg)]" />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <StatsBar />
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-bg)] p-12 text-center shadow-2xl"
          >
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[var(--color-accent)]/10 blur-[60px]" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-purple-500/10 blur-[60px]" />

            <div className="relative">
              <h2 className="mb-4 text-4xl font-bold sm:text-5xl" style={{ color: 'var(--color-text)' }}>
                Ready to Transform
                <br />
                <span className="bg-gradient-to-r from-[var(--color-accent)] to-purple-500 bg-clip-text text-transparent">
                  How You Learn?
                </span>
              </h2>

              <p className="mx-auto mb-8 max-w-xl text-lg text-[var(--color-text-muted)]">
                Join thousands of students who have discovered a new way to understand science.
              </p>

              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <button
                  onClick={() => handleNavigate('/app')}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] px-8 py-4 font-semibold text-white shadow-lg shadow-[var(--color-accent)]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-accent)]/40 hover:-translate-y-0.5"
                >
                  <span>Launch App</span>
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  onClick={() => window.open('https://github.com/pavvada431-cmd/CodeFlix-26', '_blank')}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-transparent px-8 py-4 font-semibold text-[var(--color-text)] transition-all duration-300 hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-surface)]/50"
                >
                  <Code2 className="h-5 w-5" />
                  <span>View on GitHub</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col items-center justify-between gap-8 lg:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] font-bold text-white shadow-lg shadow-[var(--color-accent)]/30">
                <Atom className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                  CodeFlix
                </span>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Science, Simulated.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {['React 19', 'Three.js', 'Tailwind CSS 4', 'Framer Motion', 'OpenAI'].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--color-border)] pt-8 text-center lg:flex-row">
            <p className="text-sm text-[var(--color-text-dim)]">
              Built for Hackathon 2026 • Revolutionizing Science Education
            </p>

            <div className="flex items-center gap-6">
              <a
                href="https://github.com/pavvada431-cmd/CodeFlix-26"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
              >
                <Code2 className="h-4 w-4" />
                <span>GitHub</span>
              </a>

              <a
                href="#"
                className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
              >
                <Code2 className="h-4 w-4" />
                <span>Docs</span>
              </a>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-[var(--color-text-dim)]">
            © 2026 CodeFlix. Open source under MIT License.
          </div>
        </div>
      </footer>
    </div>
  )
}
