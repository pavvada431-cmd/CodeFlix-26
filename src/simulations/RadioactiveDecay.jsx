import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const SCENE_SCALE = 1

function createLabelTexture(text, color = '#ffffff') {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
  ctx.roundRect(0, 0, 512, 64, 8)
  ctx.fill()
  ctx.fillStyle = color
  ctx.font = 'bold 28px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(text, 256, 42)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
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
      <meshStandardMaterial
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
  const trailRef = useRef()
  const positionRef = useRef({ ...startPos })
  const trailRef_ = useRef([])
  const startTimeRef = useRef(Date.now())
  const completedRef = useRef(false)

  useFrame(() => {
    if (completedRef.current) return

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

    trailRef_.current = [...trailRef_.current.slice(-19), { ...positionRef.current }]

    if (meshRef.current) {
      meshRef.current.position.set(
        positionRef.current.x,
        positionRef.current.y,
        positionRef.current.z
      )
      meshRef.current.material.opacity = 1 - progress
    }

    if (trailRef.current && trailRef_.current.length > 1) {
      const positions = trailRef_.current.flatMap(p => [p.x, p.y, p.z])
      trailRef.current.geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
      )
    }
  })

  return (
    <group>
      <line ref={trailRef}>
        <bufferGeometry />
        <lineBasicMaterial color={color} transparent opacity={0.6} />
      </line>
      <mesh ref={meshRef} position={[startPos.x, startPos.y, startPos.z]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} transparent opacity={1} />
      </mesh>
    </group>
  )
}

function GeigerCounter({ flashCount, lastDecay }) {
  const ledRefs = useRef([])
  const [ledStates, setLedStates] = useState(Array(12).fill(false))

  useEffect(() => {
    if (lastDecay) {
      setLedStates(prev => {
        const newStates = [...prev.slice(1), true]
        setTimeout(() => {
          setLedStates(prev => [...prev.slice(1), false])
        }, 100)
        return newStates
      })
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

function GraphPanel({ mode, dataHistory, theoreticalDecay, halfLife }) {
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
  onDecay,
  onDataUpdate,
  chainDecay,
}) {
  const [atoms, setAtoms] = useState([])
  const [decayedAtoms, setDecayedAtoms] = useState(new Set())
  const [flashingAtoms, setFlashingAtoms] = useState(new Set())
  const [flashProgress, setFlashProgress] = useState({})
  const [particles, setParticles] = useState([])
  const [decayCount, setDecayCount] = useState(0)
  const [lastDecay, setLastDecay] = useState(null)

  const lambda = Math.log(2) / halfLife
  const startTimeRef = useRef(0)
  const decayQueueRef = useRef([])

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
    setDecayCount(0)
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
          setDecayCount(prev => prev + 1)
          setLastDecay(Date.now())
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

    onDataUpdate?.({
      t: elapsed,
      N_remaining,
      decayRate,
      activity,
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

export default function RadioactiveDecay({
  initialAtoms = 100,
  halfLife = 5,
  decayType = 'alpha',
  isPlaying = false,
  onDataPoint,
}) {
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
    setDecayCount(prev => {
      if (data.N_remaining < (prev.prevN || initialAtoms)) {
        setLastDecay(Date.now())
      }
      return { count: data.N_remaining, prevN: data.N_remaining }
    })
    onDataPoint?.(data)
  }, [onDataPoint, initialAtoms])

  useEffect(() => {
    if (!isPlaying) {
      setDataHistory([])
    }
  }, [isPlaying])

  const currentData = dataHistory[dataHistory.length - 1] || {}
  const N_remaining = currentData.N_remaining ?? initialAtoms
  const activity = currentData.activity ?? lambda * initialAtoms
  const decayRate = currentData.decayRate ?? 0

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ background: '#0a0f1e' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1} />

        <AtomCluster
          initialAtoms={initialAtoms}
          halfLife={halfLife}
          decayType={decayType}
          isPlaying={isPlaying}
          onDataUpdate={handleDataUpdate}
          chainDecay={chainDecayEnabled}
        />

        <sprite scale={[4, 1, 1]} position={[0, 4, 0]}>
          <spriteMaterial
            map={createLabelTexture(
              `${decayType.toUpperCase()} Decay | t½ = ${halfLife}s`,
              '#00ff88'
            )}
            transparent
          />
        </sprite>
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
          theoreticalDecay={initialAtoms}
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
    },
  }
}
