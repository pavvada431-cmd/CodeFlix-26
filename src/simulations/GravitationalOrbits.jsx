import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

const G = 6.674e-3
const SCALE = 1

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

function CentralBody({ radius, color }) {
  return (
    <mesh>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  )
}

function OrbitingBody({ position, radius, color, trail }) {
  const meshRef = useRef()
  const trailRef = useRef()

  useEffect(() => {
    if (trailRef.current && trail.length > 1) {
      const positions = []
      trail.forEach(p => {
        positions.push(p.x, 0, p.z)
      })
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      trailRef.current.geometry = geometry
    }
  }, [trail])

  return (
    <group>
      {trail.length > 1 && (
        <line ref={trailRef}>
          <lineBasicMaterial vertexColors transparent opacity={0.8} />
        </line>
      )}
      <mesh ref={meshRef} position={[position.x, 0, position.z]}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          metalness={0.4}
          roughness={0.5}
        />
      </mesh>
    </group>
  )
}

function ForceArrow({ position, direction, length, color }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    const hw = 0.02
    shape.moveTo(0, length)
    shape.lineTo(-hw, length - 0.1)
    shape.lineTo(-hw * 0.4, length - 0.1)
    shape.lineTo(-hw * 0.4, 0)
    shape.lineTo(hw * 0.4, 0)
    shape.lineTo(hw * 0.4, length - 0.1)
    shape.lineTo(hw, length - 0.1)
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false })
  }, [length])

  const rotation = useMemo(() => {
    const angle = Math.atan2(direction[1], direction[0])
    return [0, 0, -angle - Math.PI / 2]
  }, [direction])

  if (length < 0.05) return null

  return (
    <group position={[position.x, 0, position.z]}>
      <mesh geometry={geometry} rotation={rotation} position={[0, 0, 0.02]}>
        <meshStandardMaterial color={color} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

function GraphPanel({ mode, dataHistory }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dataHistory.length < 2) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const padding = 30

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

    if (mode === 'radius') {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('Distance vs Time (Elliptical Oscillation)', padding + 5, 18)

      const rValues = dataHistory.map(d => d.r)
      const tValues = dataHistory.map(d => d.t)
      const minR = Math.min(...rValues)
      const maxR = Math.max(...rValues)
      const range = maxR - minR || 1

      ctx.strokeStyle = '#00f5ff'
      ctx.lineWidth = 2
      ctx.beginPath()

      dataHistory.forEach((point, i) => {
        const x = padding + (i / (dataHistory.length - 1)) * (width - 2 * padding)
        const y = height - padding - ((point.r - minR) / range) * (height - 2 * padding)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      ctx.fillStyle = '#00f5ff'
      ctx.fillText(`Min: ${minR.toFixed(2)} (apoapsis)`, padding + 5, height - 5)
      ctx.fillStyle = '#ff4444'
      ctx.fillText(`Max: ${maxR.toFixed(2)} (periapsis)`, width / 2 + 20, height - 5)

      ctx.fillStyle = '#888'
      ctx.fillText('t →', width - padding - 20, height - 5)
      ctx.fillText('r →', padding, padding - 10)
    }

    if (mode === 'energy') {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('Energy vs Time (Conservation Check)', padding + 5, 18)

      const E0 = dataHistory[0].totalEnergy
      const EValues = dataHistory.map(d => d.totalEnergy)
      const maxE = Math.max(...EValues)
      const minE = Math.min(...EValues)
      const range = maxE - minE || 1

      ctx.strokeStyle = '#00ff88'
      ctx.lineWidth = 2
      ctx.beginPath()

      dataHistory.forEach((point, i) => {
        const x = padding + (i / (dataHistory.length - 1)) * (width - 2 * padding)
        const y = height - padding - ((point.totalEnergy - minE) / range) * (height - 2 * padding)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      const energyDrift = maxE - minE
      const relativeDrift = Math.abs(energyDrift / E0) * 100

      ctx.fillStyle = '#888'
      ctx.fillText(`E₀ = ${E0.toFixed(4)} J`, padding + 5, height - 25)
      ctx.fillStyle = relativeDrift < 1 ? '#00ff88' : '#ff4444'
      ctx.fillText(`Drift: ${relativeDrift.toFixed(2)}%`, padding + 5, height - 10)

      if (relativeDrift < 1) {
        ctx.fillStyle = '#00ff88'
        ctx.fillText('✓ Energy Conserved', width / 2, height - 10)
      }

      ctx.fillStyle = '#888'
      ctx.fillText('t →', width - padding - 20, height - 5)
      ctx.fillText('E →', padding, padding - 10)
    }
  }, [dataHistory, mode])

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

function SimulationScene({
  centralMass,
  orbitingMass,
  initialDistance,
  initialVelocity,
  isPlaying,
  orbitType,
  onDataUpdate,
  enableMultiBody,
}) {
  const [position, setPosition] = useState({ x: initialDistance, y: 0, z: 0 })
  const [velocity, setVelocity] = useState({ x: 0, y: 0, z: initialVelocity })
  const [trail, setTrail] = useState([])
  const [trail2, setTrail2] = useState([])
  const [position2, setPosition2] = useState({ x: -initialDistance * 0.7, y: 0, z: 0 })
  const [velocity2, setVelocity2] = useState({ x: 0, y: 0, z: -initialVelocity * 0.8 })

  const animationRef = useRef(null)
  const isPlayingRef = useRef(isPlaying)
  const posRef = useRef(position)
  const velRef = useRef(velocity)
  const pos2Ref = useRef(position2)
  const vel2Ref = useRef(velocity2)
  const trailRef = useRef([])
  const trail2Ref = useRef([])
  const startTimeRef = useRef(0)
  const elapsedRef = useRef(0)
  const lastDataTimeRef = useRef(0)

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    const circularV = Math.sqrt(G * centralMass / initialDistance)
    let vx = 0
    let vz = initialVelocity

    switch (orbitType) {
      case 'circular':
        vz = circularV
        break
      case 'elliptical':
        vz = circularV * 1.1
        break
      case 'escape':
        vz = Math.sqrt(2 * G * centralMass / initialDistance) * 0.9
        break
      default:
        vz = circularV
    }

    const newPos = { x: initialDistance, y: 0, z: 0 }
    const newVel = { x, y: 0, z: vz }
    setPosition(newPos)
    setVelocity(newVel)
    posRef.current = newPos
    velRef.current = newVel
    trailRef.current = []
    setTrail([])
    startTimeRef.current = 0
    elapsedRef.current = 0
  }, [centralMass, initialDistance, initialVelocity, orbitType, enableMultiBody])

  useEffect(() => {
    if (!isPlayingRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now() / 1000
    }

    const dt = 0.01

    const animate = () => {
      const currentTime = performance.now() / 1000
      elapsedRef.current = currentTime - startTimeRef.current

      if (enableMultiBody) {
        const p1 = posRef.current
        const v1 = velRef.current
        const p2 = pos2Ref.current
        const v2 = vel2Ref.current

        const dx12 = p2.x - p1.x
        const dz12 = p2.z - p1.z
        const r12 = Math.sqrt(dx12 * dx12 + dz12 * dz12) + 0.001
        const F12 = G * orbitingMass * orbitingMass / (r12 * r12)

        const ax1 = F12 * dx12 / r12 / orbitingMass
        const az1 = F12 * dz12 / r12 / orbitingMass

        const ax2 = -F12 * dx12 / r12 / orbitingMass
        const az2 = -F12 * dz12 / r12 / orbitingMass

        const newV1 = { x: v1.x + ax1 * dt, y: 0, z: v1.z + az1 * dt }
        const newP1 = { x: p1.x + newV1.x * dt, y: 0, z: p1.z + newV1.z * dt }

        const newV2 = { x: v2.x + ax2 * dt, y: 0, z: v2.z + az2 * dt }
        const newP2 = { x: p2.x + newV2.x * dt, y: 0, z: p2.z + newV2.z * dt }

        posRef.current = newP1
        velRef.current = newV1
        pos2Ref.current = newP2
        vel2Ref.current = newV2

        trailRef.current = [...trailRef.current.slice(-499), { ...newP1 }]
        trail2Ref.current = [...trail2Ref.current.slice(-499), { ...newP2 }]

        setPosition(newP1)
        setVelocity(newV1)
        setPosition2(newP2)
        setVelocity2(newV2)
        setTrail([...trailRef.current])
        setTrail2([...trail2Ref.current])

        if (currentTime - lastDataTimeRef.current > 0.05) {
          const speed1 = Math.sqrt(newV1.x * newV1.x + newV1.z * newV1.z)
          const r1 = Math.sqrt(newP1.x * newP1.x + newP1.z * newP1.z)
          const KE1 = 0.5 * orbitingMass * speed1 * speed1
          const PE1 = -G * centralMass * orbitingMass / r1
          const L1 = orbitingMass * r1 * speed1

          onDataUpdate?.({
            t: elapsedRef.current,
            r: r1,
            v: speed1,
            KE: KE1,
            PE: PE1,
            totalEnergy: KE1 + PE1,
            angularMomentum: L1,
          })
          lastDataTimeRef.current = currentTime
        }
      } else {
        const p = posRef.current
        const v = velRef.current
        const r = Math.sqrt(p.x * p.x + p.z * p.z)
        const a = G * centralMass / (r * r)
        const ax = -a * p.x / r
        const az = -a * p.z / r

        const newV = { x: v.x + ax * dt, y: 0, z: v.z + az * dt }
        const newP = { x: p.x + newV.x * dt, y: 0, z: p.z + newV.z * dt }

        posRef.current = newP
        velRef.current = newV

        trailRef.current = [...trailRef.current.slice(-499), { ...newP }]
        setPosition(newP)
        setVelocity(newV)
        setTrail([...trailRef.current])

        if (currentTime - lastDataTimeRef.current > 0.05) {
          const speed = Math.sqrt(newV.x * newV.x + newV.z * newV.z)
          const dist = Math.sqrt(newP.x * newP.x + newP.z * newP.z)
          const KE = 0.5 * orbitingMass * speed * speed
          const PE = -G * centralMass * orbitingMass / dist
          const L = orbitingMass * dist * speed

          onDataUpdate?.({
            t: elapsedRef.current,
            r: dist,
            v: speed,
            KE,
            PE,
            totalEnergy: KE + PE,
            angularMomentum: L,
          })
          lastDataTimeRef.current = currentTime
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [centralMass, orbitingMass, onDataUpdate, enableMultiBody])

  const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z)
  const distance = Math.sqrt(position.x * position.x + position.z * position.z)
  const forceMag = G * centralMass * orbitingMass / (distance * distance)
  const forceDir = distance > 0 ? [-position.x / distance, -position.z / distance] : [0, 0]

  const infoTextures = useMemo(() => ({
    params: createLabelTexture(
      `r=${distance.toFixed(1)}m v=${speed.toFixed(2)}m/s F=${forceMag.toFixed(2)}N`,
      '#00f5ff'
    ),
    energy: createLabelTexture(
      `KE=${(0.5 * orbitingMass * speed * speed).toFixed(1)} PE=${(-G * centralMass * orbitingMass / distance).toFixed(1)} E=${(0.5 * orbitingMass * speed * speed - G * centralMass * orbitingMass / distance).toFixed(1)}`,
      '#ff88ff'
    ),
  }), [distance, speed, forceMag, orbitingMass, centralMass])

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0a0f1e" />
      </mesh>

      <gridHelper args={[30, 30, '#222', '#1a1a2e']} position={[0, -0.49, 0]} />

      <CentralBody radius={0.5} color="#ff8800" />

      <OrbitingBody
        position={position}
        radius={0.15}
        color="#00f5ff"
        trail={trail}
      />

      {enableMultiBody && (
        <OrbitingBody
          position={position2}
          radius={0.12}
          color="#ff00ff"
          trail={trail2}
        />
      )}

      <ForceArrow
        position={position}
        direction={forceDir}
        length={Math.min(forceMag * 0.5, 2)}
        color="#ff4444"
      />

      <sprite scale={[6, 0.75, 1]} position={[0, 3, 0]}>
        <spriteMaterial map={infoTextures.params} transparent />
      </sprite>
      <sprite scale={[8, 0.5, 1]} position={[0, 2.5, 0]}>
        <spriteMaterial map={infoTextures.energy} transparent />
      </sprite>
    </>
  )
}

function LiveDataPanel({ data, orbitType }) {
  const speed = data?.v || 0
  const distance = data?.r || 0
  const KE = data?.KE || 0
  const PE = data?.PE || 0
  const E = data?.totalEnergy || 0
  const L = data?.angularMomentum || 0
  const t = data?.t || 0

  const circularV = Math.sqrt(G * 100 / distance) || 0
  const escapeV = Math.sqrt(2 * G * 100 / distance) || 0

  return (
    <div className="absolute right-4 top-4 rounded-lg border border-[rgba(0,245,255,0.3)] bg-[rgba(10,15,30,0.9)] p-3">
      <div className="mb-2 font-mono-display text-xs text-slate-400">ORBITAL PARAMETERS</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono-display text-[10px]">
        <span className="text-[#00f5ff]">r:</span>
        <span className="text-white">{distance.toFixed(2)} m</span>
        <span className="text-[#ff8800]">v:</span>
        <span className="text-white">{speed.toFixed(3)} m/s</span>
        <span className="text-[#88ff88]">KE:</span>
        <span className="text-white">{KE.toFixed(2)} J</span>
        <span className="text-[#ff4444]">PE:</span>
        <span className="text-white">{PE.toFixed(2)} J</span>
        <span className="text-[#ff88ff]">E:</span>
        <span className="text-white">{E.toFixed(2)} J</span>
        <span className="text-[#ffff00]">L:</span>
        <span className="text-white">{L.toFixed(2)}</span>
        <span className="text-[#888]">t:</span>
        <span className="text-white">{t.toFixed(2)} s</span>
      </div>
      <div className="mt-2 border-t border-[#333] pt-2">
        <div className="mb-1 font-mono-display text-[10px] text-slate-500">VELOCITY COMPARISON</div>
        <div className="grid grid-cols-2 gap-x-4 font-mono-display text-[9px]">
          <span className="text-[#888]">v_circ:</span>
          <span className="text-white">{circularV.toFixed(3)}</span>
          <span className="text-[#888]">v_esc:</span>
          <span className="text-white">{escapeV.toFixed(3)}</span>
        </div>
      </div>
    </div>
  )
}

export default function GravitationalOrbits({
  centralMass = 100,
  orbitingMass = 1,
  initialDistance = 5,
  initialVelocity = 1,
  isPlaying = false,
  onDataPoint,
}) {
  const [orbitType, setOrbitType] = useState('circular')
  const [enableMultiBody, setEnableMultiBody] = useState(false)
  const [dataHistory, setDataHistory] = useState([])
  const [currentData, setCurrentData] = useState(null)
  const [graphMode, setGraphMode] = useState('radius')

  const handleDataUpdate = useCallback((data) => {
    setCurrentData(data)
    setDataHistory(prev => {
      const newHistory = [...prev, data]
      if (newHistory.length > 500) return newHistory.slice(-500)
      return newHistory
    })
    onDataPoint?.(data)
  }, [onDataPoint])

  useEffect(() => {
    if (!isPlaying) {
      setDataHistory([])
      setCurrentData(null)
    }
  }, [isPlaying, orbitType, enableMultiBody])

  const orbitTypes = [
    { key: 'circular', label: 'Circular', desc: 'v = √(GM/r)' },
    { key: 'elliptical', label: 'Elliptical', desc: 'v > v_circular' },
    { key: 'escape', label: 'Escape', desc: 'v > √(2GM/r)' },
  ]

  return (
    <div className="relative h-full w-full">
      <Canvas
        onCreated={(state) => {
        try {
          state.gl.getContext("webgl2") || state.gl.getContext("webgl");
        } catch (e) {
          console.warn("WebGL initialization warning:", e);
        }
      }}
      camera={{ position: [0, 12, 8], fov: 50 }}
        style={{ width: '100%', height: '100%', background: '#0a0f1e' }}
      >
        <SimulationScene
          centralMass={centralMass}
          orbitingMass={orbitingMass}
          initialDistance={initialDistance}
          initialVelocity={initialVelocity}
          isPlaying={isPlaying}
          orbitType={orbitType}
          onDataUpdate={handleDataUpdate}
          enableMultiBody={enableMultiBody}
        />
      </Canvas>

      <LiveDataPanel data={currentData} orbitType={orbitType} />

      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <div className="font-mono-display text-xs text-slate-400">ORBIT TYPE</div>
        <div className="flex flex-col gap-1">
          {orbitTypes.map(type => (
            <button
              key={type.key}
              onClick={() => setOrbitType(type.key)}
              className={`rounded px-3 py-1.5 text-left font-mono-display text-[10px] transition ${
                orbitType === type.key
                  ? 'border-[rgba(0,245,255,0.5)] bg-[rgba(0,245,255,0.2)] text-[#00f5ff]'
                  : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
              }`}
              style={{ borderWidth: '1px', borderStyle: 'solid' }}
            >
              <div>{type.label}</div>
              <div className="text-[9px] text-slate-500">{type.desc}</div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setEnableMultiBody(!enableMultiBody)}
          className={`mt-2 rounded px-3 py-1.5 font-mono-display text-[10px] transition ${
            enableMultiBody
              ? 'border-[rgba(255,0,255,0.5)] bg-[rgba(255,0,255,0.2)] text-[#ff00ff]'
              : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
          }`}
          style={{ borderWidth: '1px', borderStyle: 'solid' }}
        >
          {enableMultiBody ? 'Multi-Body: ON' : 'Multi-Body: OFF'}
        </button>
      </div>

      <div className="absolute bottom-20 right-4">
        <div className="mb-2 font-mono-display text-xs text-slate-400">
          GRAPH: {graphMode === 'radius' ? 'Distance vs Time' : 'Energy vs Time'}
        </div>
        <div className="mb-2 flex gap-2">
          <button
            onClick={() => setGraphMode('radius')}
            className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
              graphMode === 'radius'
                ? 'bg-[rgba(0,245,255,0.2)] text-[#00f5ff]'
                : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
            }`}
          >
            r vs t
          </button>
          <button
            onClick={() => setGraphMode('energy')}
            className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
              graphMode === 'energy'
                ? 'bg-[rgba(0,255,136,0.2)] text-[#00ff88]'
                : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
            }`}
          >
            E vs t
          </button>
        </div>
        <GraphPanel mode={graphMode} dataHistory={dataHistory} />
      </div>

      <div className="absolute top-4 left-4 rounded-full border border-[rgba(255,136,0,0.3)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#ff8800]">
        🌟 Central Mass: {centralMass}
      </div>

      {orbitType === 'escape' && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-[rgba(255,68,68,0.5)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#ff4444]">
          ⚠️ Escape velocity mode — body will fly to infinity!
        </div>
      )}

      {enableMultiBody && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-[rgba(255,0,255,0.5)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#ff00ff]">
          🔄 Multi-body gravitational interaction
        </div>
      )}
    </div>
  )
}

GravitationalOrbits.getSceneConfig = (variables = {}) => {
  const { centralMass = 100, orbitingMass = 1, initialDistance = 5 } = variables

  const circularV = Math.sqrt(G * centralMass / initialDistance)
  const escapeV = Math.sqrt(2 * G * centralMass / initialDistance)
  const PE = -G * centralMass * orbitingMass / initialDistance
  const KE = 0.5 * orbitingMass * circularV * circularV
  const totalE = PE + KE

  return {
    name: 'Gravitational Orbits',
    description: 'Orbital mechanics with Verlet integration',
    type: 'gravitational_orbits',
    physics: {
      centralMass,
      orbitingMass,
      initialDistance,
      circularVelocity: circularV,
      escapeVelocity: escapeV,
    },
    calculations: {
      circularVelocity: `v = √(GM/r) = ${circularV.toFixed(3)} m/s`,
      escapeVelocity: `v_esc = √(2GM/r) = ${escapeV.toFixed(3)} m/s`,
      orbitalEnergy: `E = KE + PE = ${totalE.toFixed(3)} J`,
      gravitationalForce: `F = GMm/r² = ${(G * centralMass * orbitingMass / (initialDistance * initialDistance)).toFixed(3)} N`,
    },
  }
}
