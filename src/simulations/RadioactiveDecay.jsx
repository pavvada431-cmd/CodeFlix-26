import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Html, Line, OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import useSanitizedProps from './shared/useSanitizedProps'

const SCENE_SCALE = 1

function FrostedLabel({ position, color = '#00f5ff', children }) {
  return (
    <Html position={position} center distanceFactor={10} zIndexRange={[100, 0]}>
      <div
        style={{
          background: 'rgba(10, 15, 30, 0.86)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${color}40`,
          borderRadius: '8px',
          padding: '4px 10px',
          color,
          fontFamily: 'monospace',
          fontSize: '11px',
          fontWeight: 700,
          boxShadow: `0 4px 18px ${color}25`,
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </div>
    </Html>
  )
}

function Atom({ position, isDecayed, isFlashing, flashProgress }) {
  const meshRef = useRef()
  const initialScale = 0.15

  useFrame(() => {
    if (meshRef.current) {
      if (isFlashing) {
        const scale = initialScale * (1 + Math.sin(flashProgress * Math.PI * 8) * 0.3)
        meshRef.current.scale.setScalar(scale)
        meshRef.current.material.emissiveIntensity = 2 + Math.sin(flashProgress * Math.PI * 8) * 2
        meshRef.current.material.color.setHex(0xffffff)
      } else if (isDecayed) {
        meshRef.current.scale.setScalar(initialScale * 0.8)
        meshRef.current.material.color.setHex(0x666666)
        meshRef.current.material.emissive.setHex(0x333333)
        meshRef.current.material.emissiveIntensity = 0.1
      } else {
        meshRef.current.scale.setScalar(initialScale)
        meshRef.current.material.color.setHex(0x00ff88)
        meshRef.current.material.emissive.setHex(0x00ff44)
        meshRef.current.material.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.003) * 0.2
      }
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshPhysicalMaterial
        color="#00ff88"
        emissive="#00ff44"
        emissiveIntensity={0.5}
        metalness={0.3}
        roughness={0.5}
      />
    </mesh>
  )
}

function DecayParticle({ startPos, velocity, color, lifetime, onComplete }) {
  const meshRef = useRef()
  const positionRef = useRef({ ...startPos })
  const trailRef = useRef([])
  const [trailPoints, setTrailPoints] = useState([])
  const startTimeRef = useRef(0)
  const completedRef = useRef(false)

  useFrame(() => {
    if (completedRef.current) return
    if (startTimeRef.current === 0) {
      startTimeRef.current = Date.now()
    }

    const elapsed = (Date.now() - startTimeRef.current) / 1000
    const progress = elapsed / lifetime

    if (progress >= 1) {
      completedRef.current = true
      onComplete?.()
      return
    }

    positionRef.current.x += velocity.x * 0.016
    positionRef.current.y += velocity.y * 0.016
    positionRef.current.z += velocity.z * 0.016

    trailRef.current = [...trailRef.current.slice(-19), { ...positionRef.current }]
    setTrailPoints(trailRef.current)

    if (meshRef.current) {
      meshRef.current.position.set(
        positionRef.current.x,
        positionRef.current.y,
        positionRef.current.z
      )
      meshRef.current.material.opacity = 1 - progress
    }

  })

  return (
    <group>
      {trailPoints.length > 1 && (
        <Line
          points={trailPoints.map(p => [p.x, p.y, p.z])}
          color={color}
          transparent
          opacity={0.65}
          lineWidth={1.5}
        />
      )}
      <mesh ref={meshRef} position={[startPos.x, startPos.y, startPos.z]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={1} transparent opacity={1} />
      </mesh>
    </group>
  )
}

function GeigerCounter({ lastDecay }) {
  const ledRefs = useRef([])
  const [ledStates, setLedStates] = useState(Array(12).fill(false))

  useEffect(() => {
    if (lastDecay) {
      const timeoutId = setTimeout(() => {
        setLedStates(prev => {
          const newStates = [...prev.slice(1), true]
          setTimeout(() => {
            setLedStates(prevLedStates => [...prevLedStates.slice(1), false])
          }, 100)
          return newStates
        })
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [lastDecay])

  return (
    <div className="flex items-center gap-1 rounded-lg border border-[rgba(0,255,136,0.3)] bg-[rgba(10,15,30,0.9)] p-2">
      <span className="mr-2 font-mono-display text-xs text-slate-400">Geiger:</span>
      {ledStates.map((on, i) => (
        <div
          key={i}
          ref={el => ledRefs.current[i] = el}
          className={`h-3 w-3 rounded-full transition-all duration-100 ${
            on ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'bg-[#333]'
          }`}
        />
      ))}
    </div>
  )
}

function GraphPanel({ mode, dataHistory, halfLife }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dataHistory.length < 2) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const padding = 35

    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      const y = padding + (height - 2 * padding) * i / 4
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    const N0 = dataHistory[0]?.N_remaining || 1
    const tMax = dataHistory[dataHistory.length - 1]?.t || 1

    if (mode === 'population') {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('N vs Time (Exponential Decay)', padding + 5, 18)

      ctx.strokeStyle = '#00ff88'
      ctx.lineWidth = 2
      ctx.beginPath()

      dataHistory.forEach((point, i) => {
        const x = padding + (point.t / tMax) * (width - 2 * padding)
        const y = height - padding - (point.N_remaining / N0) * (height - 2 * padding)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      ctx.strokeStyle = '#ff6b35'
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      const lambda = Math.log(2) / halfLife
      dataHistory.forEach((point, i) => {
        const x = padding + (point.t / tMax) * (width - 2 * padding)
        const y = height - padding - (N0 * Math.exp(-lambda * point.t) / N0) * (height - 2 * padding)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.setLineDash([])

      const halfLifeX = padding + (halfLife / tMax) * (width - 2 * padding)
      if (halfLifeX < width - padding) {
        ctx.strokeStyle = '#ffff00'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(halfLifeX, padding)
        ctx.lineTo(halfLifeX, height - padding)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.fillStyle = '#ffff00'
        ctx.font = '8px monospace'
        ctx.fillText('t½', halfLifeX - 5, padding - 5)
      }

      ctx.fillStyle = '#888'
      ctx.font = '8px monospace'
      ctx.fillText('— Simulation    — Theoretical', padding + 5, height - 5)
    }

    if (mode === 'activity') {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('Activity vs Time', padding + 5, 18)

      ctx.strokeStyle = '#ff4444'
      ctx.lineWidth = 2
      ctx.beginPath()

      const maxActivity = Math.max(...dataHistory.map(d => d.activity || 1), 1)
      dataHistory.forEach((point, i) => {
        const x = padding + (point.t / tMax) * (width - 2 * padding)
        const y = height - padding - ((point.activity || 0) / maxActivity) * (height - 2 * padding)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      const lambda = Math.log(2) / halfLife
      ctx.strokeStyle = '#ff6b35'
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      dataHistory.forEach((point, i) => {
        const x = padding + (point.t / tMax) * (width - 2 * padding)
        const activity0 = lambda * N0
        const y = height - padding - ((activity0 * Math.exp(-lambda * point.t)) / maxActivity) * (height - 2 * padding)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = '#888'
      ctx.font = '8px monospace'
      ctx.fillText('— Simulation    — Theoretical', padding + 5, height - 5)
    }
  }, [dataHistory, mode, halfLife])

  return (
    <div style={{
      backgroundColor: '#0a0a0f',
      border: '1px solid #333',
      borderRadius: '6px',
      overflow: 'hidden'
    }}>
      <canvas ref={canvasRef} width={280} height={160} />
    </div>
  )
}

function AtomCluster({
  initialAtoms,
  halfLife,
  decayType,
  isPlaying,
  onDataUpdate,
  chainDecay,
}) {
  const [atoms, setAtoms] = useState([])
  const [decayedAtoms, setDecayedAtoms] = useState(new Set())
  const [flashingAtoms, setFlashingAtoms] = useState(new Set())
  const [flashProgress, setFlashProgress] = useState({})
  const [particles, setParticles] = useState([])

  const lambda = Math.log(2) / halfLife
  const startTimeRef = useRef(0)

  useEffect(() => {
    const newAtoms = []
    const radius = Math.pow(initialAtoms * 0.01, 1/3)

    for (let i = 0; i < initialAtoms; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.cbrt(Math.random()) * radius

      newAtoms.push({
        id: i,
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        decayed: false,
      })
    }

    setAtoms(newAtoms)
    setDecayedAtoms(new Set())
    setFlashingAtoms(new Set())
    startTimeRef.current = 0
  }, [initialAtoms])

  const handleDecayComplete = useCallback((atomId, particleId) => {
    setFlashingAtoms(prev => {
      const next = new Set(prev)
      next.delete(atomId)
      return next
    })
    setParticles(prev => prev.filter(p => p.id !== particleId))
  }, [])

  useFrame((state, delta) => {
    if (!isPlaying || atoms.length === 0) return

    if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now() / 1000
    }

    const elapsed = (performance.now() / 1000) - startTimeRef.current
    const dt = Math.min(delta, 0.1)

    const undecayedAtoms = atoms.filter(a => !decayedAtoms.has(a.id) && !flashingAtoms.has(a.id))

    let newDecays = 0
    undecayedAtoms.forEach(atom => {
      const P = 1 - Math.exp(-lambda * dt)
      if (Math.random() < P) {
        newDecays++

        setFlashingAtoms(prev => new Set([...prev, atom.id]))
        setFlashProgress(prev => ({ ...prev, [atom.id]: 0 }))

        const particleId = `particle-${Date.now()}-${atom.id}`
        const particleColors = {
          alpha: '#ff4444',
          beta: '#ffff00',
          gamma: '#00ffff',
        }

        const numParticles = decayType === 'alpha' ? 4 : 1
        const newParticles = []

        for (let i = 0; i < numParticles; i++) {
          const theta = Math.random() * Math.PI * 2
          const phi = Math.acos(2 * Math.random() - 1)
          const speed = 2 + Math.random() * 2

          newParticles.push({
            id: `${particleId}-${i}`,
            startPos: { x: atom.x, y: atom.y, z: atom.z },
            velocity: {
              x: speed * Math.sin(phi) * Math.cos(theta),
              y: speed * Math.sin(phi) * Math.sin(theta),
              z: speed * Math.cos(phi),
            },
            color: particleColors[decayType] || '#ff8800',
            lifetime: 1 + Math.random() * 0.5,
          })
        }

        setParticles(prev => [...prev, ...newParticles])

        setTimeout(() => {
          setDecayedAtoms(prev => new Set([...prev, atom.id]))
        }, 500)
      }
    })

    setFlashProgress(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(id => {
        next[id] = (next[id] || 0) + dt * 2
        if (next[id] >= 1) delete next[id]
      })
      return next
    })

    const N_remaining = initialAtoms - decayedAtoms.size - flashingAtoms.size
    const activity = lambda * N_remaining
    const decayRate = newDecays / dt
    const theoreticalN = initialAtoms * Math.exp(-lambda * elapsed)
    const halfLifeMarkers = [halfLife, 2 * halfLife, 3 * halfLife]

    onDataUpdate?.({
      t_s: elapsed,
      t: elapsed,
      N_remaining,
      N_theoretical: theoreticalN,
      decayRate,
      activity,
      halfLife_s: halfLife,
      halfLifeMarkers_s: halfLifeMarkers,
      chainDecayActive: Boolean(chainDecay),
    })
  })

  return (
    <group>
      {atoms.map(atom => (
        <Atom
          key={atom.id}
          position={[atom.x, atom.y, atom.z]}
          isDecayed={decayedAtoms.has(atom.id)}
          isFlashing={flashingAtoms.has(atom.id)}
          flashProgress={flashProgress[atom.id] || 0}
        />
      ))}

      {particles.map(particle => (
        <DecayParticle
          key={particle.id}
          startPos={particle.startPos}
          velocity={particle.velocity}
          color={particle.color}
          lifetime={particle.lifetime}
          onComplete={() => handleDecayComplete(particle.startPos, particle.id)}
        />
      ))}
    </group>
  )
}

export default function RadioactiveDecay(rawProps) {
  const {
    initialAtoms = 100,
    halfLife = 5,
    decayType = 'alpha',
    isPlaying = false,
    onDataPoint,
  } = useSanitizedProps(rawProps)
  const [dataHistory, setDataHistory] = useState([])
  const [graphMode, setGraphMode] = useState('population')
  const [chainDecayEnabled, setChainDecayEnabled] = useState(false)
  const [decayCount, setDecayCount] = useState(0)
  const [lastDecay, setLastDecay] = useState(null)

  const lambda = Math.log(2) / halfLife

  const handleDataUpdate = useCallback((data) => {
    setDataHistory(prev => {
      const newHistory = [...prev, data]
      if (newHistory.length > 500) return newHistory.slice(-500)
      return newHistory
    })
    const currentDecayCount = Math.max(0, initialAtoms - (data.N_remaining ?? initialAtoms))
    setDecayCount(currentDecayCount)
    if (currentDecayCount > 0) {
      setLastDecay(Date.now())
    }
    onDataPoint?.({
      ...data,
      decayCount: currentDecayCount,
      halfLifeFormula: 't1/2 = ln(2)/λ',
      decayLaw: 'N(t)=N0 exp(-λt)',
    })
  }, [onDataPoint, initialAtoms])

  useEffect(() => {
    if (!isPlaying) {
      const timeoutId = setTimeout(() => {
        setDataHistory([])
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [isPlaying])

  const currentData = dataHistory[dataHistory.length - 1] || {}
  const N_remaining = currentData.N_remaining ?? initialAtoms
  const activity = currentData.activity ?? lambda * initialAtoms
  const decayRate = currentData.decayRate ?? 0

  return (
    <div className="relative h-full w-full">
      <Canvas
        onCreated={(state) => {
          if (!state.gl?.getContext) return;
          try {
            const gl = state.gl.getContext('webgl2') || state.gl.getContext('webgl');
            if (gl && gl.canvas) {
              gl.canvas.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                console.warn('WebGL context lost');
              });
              gl.canvas.addEventListener('webglcontextrestored', () => {
                console.warn('WebGL context restored');
              });
            }
          } catch (e) {
            console.warn('WebGL initialization warning:', e.message);
          }
        }}
        camera={{ position: [0, 2, 10], fov: 60 }}
        style={{ width: '100%', height: '100%', background: '#0a0f1e' }}
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }}
      >
        <fog attach="fog" args={['#060a12', 8, 30]} />
        <Environment preset="night" intensity={0.2} />
        <Stars radius={90} depth={40} count={2500} factor={3} saturation={0} fade speed={0.45} />
        <ambientLight intensity={0.25} color="#8fb09a" />
        <directionalLight position={[5, 10, 5]} intensity={0.95} color="#ffffff" />
        <pointLight position={[0, 4, 0]} intensity={0.7} color="#4dff88" />
        <pointLight position={[-4, 2, -4]} intensity={0.35} color="#00f5ff" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]}>
          <planeGeometry args={[16, 16]} />
          <meshPhysicalMaterial color="#0b1018" metalness={0.45} roughness={0.3} />
        </mesh>

        <AtomCluster
          initialAtoms={initialAtoms}
          halfLife={halfLife}
          decayType={decayType}
          isPlaying={isPlaying}
          onDataUpdate={handleDataUpdate}
          chainDecay={chainDecayEnabled}
        />

        <FrostedLabel position={[0, 4, 0]} color="#00ff88">
          {`${decayType.toUpperCase()} Decay | t½ = ${halfLife}s`}
        </FrostedLabel>
        <EffectComposer>
          <Bloom intensity={0.42} luminanceThreshold={0.55} luminanceSmoothing={0.9} mipmapBlur />
          <Vignette offset={0.28} darkness={0.5} />
        </EffectComposer>
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={6}
          maxDistance={20}
          autoRotate={!isPlaying}
          autoRotateSpeed={0.16}
        />
      </Canvas>

      <div className="absolute right-4 top-4 rounded-lg border border-[rgba(0,245,255,0.3)] bg-[rgba(10,15,30,0.9)] p-3">
        <div className="mb-2 font-mono-display text-xs text-slate-400">DECAY STATISTICS</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono-display text-[10px]">
          <span className="text-[#00ff88]">N:</span>
          <span className="text-white">{Math.floor(N_remaining)} / {initialAtoms}</span>
          <span className="text-[#ff4444]">Decayed:</span>
          <span className="text-white">{initialAtoms - Math.floor(N_remaining)}</span>
          <span className="text-[#ffff00]">A:</span>
          <span className="text-white">{activity.toFixed(2)} Bq</span>
          <span className="text-[#ff8800]">Rate:</span>
          <span className="text-white">{decayRate.toFixed(1)} /s</span>
          <span className="text-[#888]">λ:</span>
          <span className="text-white">{(lambda).toFixed(3)} s⁻¹</span>
        </div>
      </div>

      <div className="absolute left-4 top-4">
        <GeigerCounter decayCount={decayCount} lastDecay={lastDecay} />
      </div>

      <div className="absolute bottom-20 right-4">
        <div className="mb-2 font-mono-display text-xs text-slate-400">
          GRAPH: {graphMode === 'population' ? 'N vs Time' : 'Activity vs Time'}
        </div>
        <div className="mb-2 flex gap-2">
          <button
            onClick={() => setGraphMode('population')}
            className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
              graphMode === 'population'
                ? 'bg-[rgba(0,255,136,0.2)] text-[#00ff88]'
                : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
            }`}
          >
            N vs t
          </button>
          <button
            onClick={() => setGraphMode('activity')}
            className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
              graphMode === 'activity'
                ? 'bg-[rgba(255,68,68,0.2)] text-[#ff4444]'
                : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
            }`}
          >
            A vs t
          </button>
        </div>
        <GraphPanel
          mode={graphMode}
          dataHistory={dataHistory}
          halfLife={halfLife}
        />
      </div>

      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <div className="font-mono-display text-xs text-slate-400">DECAY TYPE</div>
        <div className="flex gap-1">
          {['alpha', 'beta', 'gamma'].map(type => (
            <button
              key={type}
              className={`rounded px-3 py-1.5 font-mono-display text-[10px] transition ${
                decayType === type
                  ? type === 'alpha'
                    ? 'border-[rgba(255,68,68,0.5)] bg-[rgba(255,68,68,0.2)] text-[#ff4444]'
                    : type === 'beta'
                    ? 'border-[rgba(255,255,0,0.5)] bg-[rgba(255,255,0,0.2)] text-[#ffff00]'
                    : 'border-[rgba(0,255,255,0.5)] bg-[rgba(0,255,255,0.2)] text-[#00ffff]'
                  : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400'
              }`}
              style={{ borderWidth: '1px', borderStyle: 'solid' }}
            >
              {type}
            </button>
          ))}
        </div>

        <button
          onClick={() => setChainDecayEnabled(!chainDecayEnabled)}
          className={`rounded px-4 py-2 font-mono-display text-xs transition ${
            chainDecayEnabled
              ? 'border-[rgba(136,0,255,0.5)] bg-[rgba(136,0,255,0.2)] text-[#8800ff]'
              : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400'
          }`}
          style={{ borderWidth: '1px', borderStyle: 'solid' }}
        >
          {chainDecayEnabled ? 'Chain Decay: ON' : 'Chain Decay: OFF'}
        </button>
      </div>

      <div className="absolute top-4 right-4 rounded-full border border-[rgba(0,255,136,0.3)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#00ff88]">
        N(t) = N₀ · e^(-λt)
      </div>

      <div className="absolute bottom-4 right-4 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.5)] p-2 font-mono-display text-[9px] text-slate-400">
        <div className="mb-1 text-slate-500">LEGEND:</div>
        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-green-500" /> <span>Undecayed</span></div>
        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-gray-500" /> <span>Decayed</span></div>
        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-white" /> <span>Decaying</span></div>
      </div>

      {chainDecayEnabled && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-[rgba(136,0,255,0.5)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#8800ff]">
          Chain Decay: Parent → Daughter → Granddaughter
        </div>
      )}
    </div>
  )
}

RadioactiveDecay.getSceneConfig = (variables = {}) => {
  const { initialAtoms = 100, halfLife = 5, decayType = 'alpha' } = variables

  const lambda = Math.log(2) / halfLife
  const activity0 = lambda * initialAtoms

  return {
    name: 'Radioactive Decay',
    description: `${decayType} decay with half-life of ${halfLife}s`,
    type: 'radioactive_decay',
    physics: {
      initialAtoms,
      halfLife,
      decayType,
      decayConstant: lambda,
    },
    calculations: {
      decayConstant: `λ = ln(2)/t½ = ${lambda.toFixed(4)} s⁻¹`,
      activity: `A = λN₀ = ${activity0.toFixed(2)} Bq`,
      decayLaw: `N(t) = N₀e^(-λt)`,
      halfLifeMarkers: `t½ markers at ${halfLife.toFixed(2)}, ${(2 * halfLife).toFixed(2)}, ${(3 * halfLife).toFixed(2)} s`,
    },
  }
}
