import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

const G = 9.81
const BALL_SIZE = 0.3

function createArrowGeometry(length, headLength = 0.15, headWidth = 0.08) {
  const shape = new THREE.Shape()
  const hw = headWidth / 2
  shape.moveTo(0, length)
  shape.lineTo(-hw, length - headLength)
  shape.lineTo(-hw * 0.4, length - headLength)
  shape.lineTo(-hw * 0.4, 0)
  shape.lineTo(hw * 0.4, 0)
  shape.lineTo(hw * 0.4, length - headLength)
  shape.lineTo(hw, length - headLength)
  shape.closePath()
  const extrudeSettings = { depth: 0.04, bevelEnabled: false }
  return new THREE.ExtrudeGeometry(shape, extrudeSettings)
}

function createLabelTexture(text, color = '#ffffff') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
  ctx.roundRect(0, 0, 256, 64, 8)
  ctx.fill()
  ctx.fillStyle = color
  ctx.font = 'bold 28px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(text, 128, 42)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function FieldLine({ start, end, color }) {
  const points = useMemo(() => {
    const arr = []
    for (let t = 0; t <= 1; t += 0.05) {
      arr.push(new THREE.Vector3(
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t,
        start.z + (end.z - start.z) * t
      ))
    }
    return arr
  }, [start, end])

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [points])

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.5} />
    </line>
  )
}

function MagneticPole({ position, type }) {
  const color = type === 'north' ? '#ff4444' : '#4444ff'
  const label = type === 'north' ? 'N' : 'S'
  
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 32]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <sprite scale={[0.5, 0.25, 1]} position={[0, 0.7, 0]}>
        <spriteMaterial map={createLabelTexture(label, color)} transparent />
      </sprite>
    </group>
  )
}

function ChargedParticle({ position, charge, velocity, color }) {
  const emissiveIntensity = charge > 0 ? 0.5 : 0.2
  const actualColor = color || (charge > 0 ? '#00ffff' : '#ff4444')
  
  return (
    <mesh position={position}>
      <sphereGeometry args={[BALL_SIZE, 32, 32]} />
      <meshStandardMaterial 
        color={actualColor} 
        metalness={0.6} 
        roughness={0.3} 
        emissive={actualColor} 
        emissiveIntensity={emissiveIntensity} 
      />
    </mesh>
  )
}

function TrajectoryPath({ points, color }) {
  const geometryRef = useRef()

  useEffect(() => {
    if (geometryRef.current && points.length > 1) {
      const positions = []
      points.forEach(p => positions.push(p.x, p.y, p.z))
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geometryRef.current.geometry = geometry
    }
  }, [points])

  if (points.length < 2) return null

  return (
    <line ref={geometryRef}>
      <lineBasicMaterial color={color || '#ffff00'} transparent opacity={0.8} linewidth={2} />
    </line>
  )
}

function VelocityArrow({ position, direction, length, color }) {
  const geometry = useMemo(() => createArrowGeometry(Math.max(length, 0.05)), [length])
  
  const rotation = useMemo(() => {
    const angle = Math.atan2(direction.y, direction.x)
    return [0, 0, -angle + Math.PI / 2]
  }, [direction])

  if (length < 0.02) return null

  return (
    <group position={position}>
      <mesh geometry={geometry} rotation={rotation} position={[0, length / 2, 0]}>
        <meshStandardMaterial color={color} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

function SimulationScene({
  charge,
  velocity,
  magneticField,
  electricField,
  isPlaying,
  onDataPoint,
  mode,
}) {
  const [displayPosition, setDisplayPosition] = useState({ x: -3, y: 0, z: 0 })
  const [displayTrail, setDisplayTrail] = useState([])
  const [displayTime, setDisplayTime] = useState(0)
  const [dataHistory, setDataHistory] = useState([])

  const posRef = useRef({ x: -3, y: 0, z: 0 })
  const velRef = useRef({ x: velocity, y: 0, z: 0 })
  const startTimeRef = useRef(0)
  const animationRef = useRef(null)
  const isPlayingRef = useRef(isPlaying)
  const trailRef = useRef([])

  const lorentzForce = Math.abs(charge) * velocity * magneticField
  const radius = Math.abs(velocity) * Math.abs(charge) / magneticField || 10
  const period = 2 * Math.PI * Math.abs(charge) / magneticField || 100
  const speed = velocity

  const fieldLines = useMemo(() => {
    const lines = []
    for (let x = -2; x <= 2; x += 0.8) {
      for (let z = -2; z <= 2; z += 0.8) {
        if (Math.abs(x) > 0.1 || Math.abs(z) > 0.1) {
          lines.push({
            start: { x, y: -4, z },
            end: { x, y: 4, z },
            color: `hsl(${200 + x * 20}, 70%, 50%)`
          })
        }
      }
    }
    return lines
  }, [])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    posRef.current = { x: -3, y: 0, z: 0 }
    velRef.current = { x: velocity, y: 0, z: 0 }
    trailRef.current = []
    startTimeRef.current = 0
  }, [velocity, magneticField, charge])

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

    const dt = 0.016
    const q = charge
    const B = magneticField
    const E = electricField || 0
    const m = Math.abs(charge) * 1e5 || 1
    const callback = onDataPoint
    const vSign = velocity >= 0 ? 1 : -1

    const update = () => {
      const currentTime = performance.now() / 1000
      const elapsed = startTimeRef.current > 0 ? currentTime - startTimeRef.current : 0
      setDisplayTime(elapsed)

      const fx = q * velRef.current.y * B
      const fy = -q * velRef.current.x * B + q * E
      const fz = 0

      velRef.current.x += (fx / m) * dt
      velRef.current.y += (fy / m) * dt

      posRef.current.x += velRef.current.x * dt
      posRef.current.y += velRef.current.y * dt

      const newPos = { ...posRef.current }
      trailRef.current = [...trailRef.current.slice(-199), newPos]
      setDisplayPosition(newPos)
      setDisplayTrail([...trailRef.current])

      const currentSpeed = Math.sqrt(velRef.current.x ** 2 + velRef.current.y ** 2)
      const kineticEnergy = 0.5 * m * currentSpeed ** 2

      const dataPoint = {
        t: elapsed,
        x: posRef.current.x,
        y: posRef.current.y,
        vx: velRef.current.x,
        vy: velRef.current.y,
        speed: currentSpeed,
        kineticEnergy,
        lorentzForce: Math.abs(q) * currentSpeed * B,
        radius,
        time: elapsed,
      }
      setDataHistory(prev => [...prev.slice(-199), dataPoint])

      if (elapsed > 0.05) {
        callback?.(dataPoint)
      }

      if (posRef.current.x > 5 || posRef.current.x < -5 || 
          posRef.current.y > 5 || posRef.current.y < -5) {
        posRef.current = { x: -3, y: 0, z: 0 }
        velRef.current = { x: velocity, y: 0, z: 0 }
        trailRef.current = []
      }

      if (isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(update)
      }
    }

    animationRef.current = requestAnimationFrame(update)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [charge, velocity, magneticField, electricField, onDataPoint, radius])

  const infoTextures = useMemo(() => ({
    velocity: createLabelTexture(`v = ${velocity.toFixed(1)} m/s`, '#00ffff'),
    force: createLabelTexture(`F = ${lorentzForce.toFixed(2)} N`, '#ff4444'),
    radius: createLabelTexture(`r = ${radius.toFixed(2)} m`, '#88ff88'),
    field: createLabelTexture(`B = ${magneticField.toFixed(2)} T`, '#ffff00'),
    charge: createLabelTexture(charge > 0 ? 'q = +' + Math.abs(charge).toExponential(1) + ' C' : 'q = -' + Math.abs(charge).toExponential(1) + ' C', charge > 0 ? '#00ffff' : '#ff4444'),
  }), [velocity, lorentzForce, radius, magneticField, charge])

  if (mode === 'spectrometer') {
    const chargeColor = charge > 0 ? '#00ffff' : '#ff4444'
    return (
      <>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[12, 12]} />
          <meshStandardMaterial color="#0a0f1e" />
        </mesh>

        <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[3, 0.05, 16, 100]} />
          <meshStandardMaterial color="#444466" metalness={0.8} />
        </mesh>

        <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[3, 0.02, 16, 100]} />
          <meshStandardMaterial color="#00f5ff" transparent opacity={0.3} />
        </mesh>

        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 6, 32]} />
          <meshStandardMaterial color="#223344" metalness={0.9} roughness={0.2} side={THREE.DoubleSide} transparent opacity={0.3} />
        </mesh>

        <mesh position={[-3, 0, 0]}>
          <boxGeometry args={[0.2, 1, 0.1]} />
          <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.5} />
        </mesh>

        <ChargedParticle
          position={[displayPosition.x, displayPosition.y, 0]}
          charge={charge}
          velocity={velocity}
          color={chargeColor}
        />

        <TrajectoryPath points={displayTrail} color={chargeColor} />

        <sprite scale={[1, 0.25, 1]} position={[-5, 4, 0]}>
          <spriteMaterial map={infoTextures.velocity} transparent />
        </sprite>
        <sprite scale={[1, 0.25, 1]} position={[2, 4, 0]}>
          <spriteMaterial map={infoTextures.radius} transparent />
        </sprite>
        <sprite scale={[1, 0.25, 1]} position={[-5, 3.7, 0]}>
          <spriteMaterial map={infoTextures.force} transparent />
        </sprite>
        <sprite scale={[1, 0.25, 1]} position={[2, 3.7, 0]}>
          <spriteMaterial map={infoTextures.field} transparent />
        </sprite>

        <sprite scale={[1.5, 0.3, 1]} position={[0, -4.5, 0]}>
          <spriteMaterial map={createLabelTexture('Mass Spectrometer - Lorentz Force', '#ff88ff')} transparent />
        </sprite>
      </>
    )
  }

  if (mode === 'fieldLines') {
    return (
      <>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[12, 12]} />
          <meshStandardMaterial color="#0a0f1e" />
        </mesh>

        <MagneticPole position={[0, 3, 0]} type="north" />
        <MagneticPole position={[0, -3, 0]} type="south" />

        {fieldLines.map((line, i) => (
          <FieldLine key={i} {...line} />
        ))}

        <ChargedParticle
          position={[displayPosition.x, displayPosition.y, 0]}
          charge={charge}
          velocity={velocity}
        />

        <TrajectoryPath points={displayTrail} color="#ffff00" />

        <sprite scale={[1, 0.25, 1]} position={[-4, 4, 0]}>
          <spriteMaterial map={infoTextures.charge} transparent />
        </sprite>
        <sprite scale={[1, 0.25, 1]} position={[1, 4, 0]}>
          <spriteMaterial map={infoTextures.field} transparent />
        </sprite>

        <sprite scale={[1.5, 0.3, 1]} position={[0, -4.5, 0]}>
          <spriteMaterial map={createLabelTexture('Magnetic Field Lines - Lorentz Force', '#ff88ff')} transparent />
        </sprite>
      </>
    )
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#0a0f1e" />
      </mesh>

      {fieldLines.slice(0, 15).map((line, i) => (
        <FieldLine key={i} {...line} />
      ))}

      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 8, 16]} />
        <meshStandardMaterial color="#333344" metalness={0.9} />
      </mesh>

      <ChargedParticle
        position={[displayPosition.x, displayPosition.y, 0]}
        charge={charge}
        velocity={velocity}
      />

      <TrajectoryPath points={displayTrail} color="#ffff00" />

      {velocity !== 0 && (
        <VelocityArrow
          position={[displayPosition.x, displayPosition.y, 0]}
          direction={{ x: velRef.current.x, y: velRef.current.y }}
          length={Math.min(Math.sqrt(velRef.current.x ** 2 + velRef.current.y ** 2) * 0.3, 0.8)}
          color="#00ffff"
        />
      )}

      <sprite scale={[1, 0.25, 1]} position={[-4, 4, 0]}>
        <spriteMaterial map={infoTextures.charge} transparent />
      </sprite>
      <sprite scale={[1, 0.25, 1]} position={[1, 4, 0]}>
        <spriteMaterial map={infoTextures.velocity} transparent />
      </sprite>
      <sprite scale={[1, 0.25, 1]} position={[-4, 3.7, 0]}>
        <spriteMaterial map={infoTextures.force} transparent />
      </sprite>
      <sprite scale={[1, 0.25, 1]} position={[1, 3.7, 0]}>
        <spriteMaterial map={infoTextures.field} transparent />
      </sprite>

      <sprite scale={[1.5, 0.3, 1]} position={[0, -4.5, 0]}>
        <spriteMaterial map={createLabelTexture('F = qvB (Lorentz Force)', '#ff88ff')} transparent />
      </sprite>
    </>
  )
}

function GraphPanel({ dataHistory, mode, charge, magneticField, velocity }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

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

    if (mode === 'trajectory') {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('Particle Trajectory (x-y)', padding + 5, 18)

      if (dataHistory.length > 1) {
        const xMin = Math.min(...dataHistory.map(d => d.x))
        const xMax = Math.max(...dataHistory.map(d => d.x))
        const yMin = Math.min(...dataHistory.map(d => d.y))
        const yMax = Math.max(...dataHistory.map(d => d.y))
        const xRange = xMax - xMin || 1
        const yRange = yMax - yMin || 1

        ctx.strokeStyle = '#ffff00'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        dataHistory.forEach((d, i) => {
          const x = padding + ((d.x - xMin) / xRange) * (width - 2 * padding)
          const y = height - padding - ((d.y - yMin) / yRange) * (height - 2 * padding)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()

        const last = dataHistory[dataHistory.length - 1]
        const dotX = padding + ((last.x - xMin) / xRange) * (width - 2 * padding)
        const dotY = height - padding - ((last.y - yMin) / yRange) * (height - 2 * padding)
        ctx.fillStyle = charge > 0 ? '#00ffff' : '#ff4444'
        ctx.beginPath()
        ctx.arc(dotX, dotY, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = '#888'
      ctx.fillText('x →', width - padding - 20, height - 8)
      ctx.fillText('y →', padding + 3, padding - 10)
    } else if (mode === 'energy') {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('Kinetic Energy vs Time', padding + 5, 18)

      if (dataHistory.length > 1) {
        const maxKE = Math.max(...dataHistory.map(d => d.kineticEnergy)) || 1

        ctx.strokeStyle = '#00ff88'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        dataHistory.slice(-50).forEach((d, i) => {
          const x = padding + (i / 49) * (width - 2 * padding)
          const y = height - padding - (d.kineticEnergy / maxKE) * (height - 2 * padding)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()
      }

      ctx.fillStyle = '#888'
      ctx.fillText('t →', width - padding - 20, height - 8)
      ctx.fillText('KE →', padding + 3, padding - 10)
    } else {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('Lorentz Force vs Speed', padding + 5, 18)

      const speeds = []
      const forces = []
      for (let v = 0.1; v <= Math.abs(velocity) * 2; v += 0.2) {
        speeds.push(v)
        forces.push(Math.abs(charge) * v * magneticField)
      }

      const maxF = Math.max(...forces) || 1

      ctx.strokeStyle = '#ff4444'
      ctx.lineWidth = 2
      ctx.beginPath()
      speeds.forEach((v, i) => {
        const x = padding + (v / (Math.abs(velocity) * 2)) * (width - 2 * padding)
        const y = height - padding - (forces[i] / maxF) * (height - 2 * padding)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      const currentF = Math.abs(charge) * Math.abs(velocity) * magneticField
      const cx = padding + (Math.abs(velocity) / (Math.abs(velocity) * 2)) * (width - 2 * padding)
      const cy = height - padding - (currentF / maxF) * (height - 2 * padding)
      ctx.fillStyle = '#ffff00'
      ctx.beginPath()
      ctx.arc(cx, cy, 5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#888'
      ctx.fillText('v →', width - padding - 20, height - 8)
      ctx.fillText('F →', padding + 3, padding - 10)
    }
  }, [dataHistory, mode, charge, magneticField, velocity])

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

export default function MagneticFields({
  charge = 1.6e-19,
  velocity = 1e6,
  magneticField = 0.5,
  electricField = 0,
  isPlaying = false,
  onDataPoint,
}) {
  const [dataHistory, setDataHistory] = useState([])
  const [mode, setMode] = useState('default')
  const [graphMode, setGraphMode] = useState('trajectory')

  const lorentzForce = Math.abs(charge) * velocity * magneticField
  const radius = Math.abs(velocity) * Math.abs(charge) / magneticField || 10

  const handleDataPoint = useCallback((data) => {
    setDataHistory(prev => [...prev.slice(-199), data])
    onDataPoint?.(data)
  }, [onDataPoint])

  const handleReset = useCallback(() => {
    setDataHistory([])
  }, [])

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ width: '100%', height: '100%', background: '#0a0f1e' }}
      >
        <SimulationScene
          charge={charge}
          velocity={velocity}
          magneticField={magneticField}
          electricField={electricField}
          isPlaying={isPlaying}
          onDataPoint={handleDataPoint}
          mode={mode}
        />
      </Canvas>

      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <button
          onClick={() => setMode('default')}
          className={`rounded-full border px-4 py-2 font-mono-display text-xs uppercase tracking-wider transition ${
            mode === 'default'
              ? 'border-[rgba(255,255,0,0.5)] bg-[rgba(255,255,0,0.2)] text-[#ffff00]'
              : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
          }`}
        >
          Lorentz Force
        </button>
        <button
          onClick={() => setMode('fieldLines')}
          className={`rounded-full border px-4 py-2 font-mono-display text-xs uppercase tracking-wider transition ${
            mode === 'fieldLines'
              ? 'border-[rgba(0,200,255,0.5)] bg-[rgba(0,200,255,0.2)] text-[#00c8ff]'
              : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
          }`}
        >
          Field Lines
        </button>
        <button
          onClick={() => setMode('spectrometer')}
          className={`rounded-full border px-4 py-2 font-mono-display text-xs uppercase tracking-wider transition ${
            mode === 'spectrometer'
              ? 'border-[rgba(0,255,136,0.5)] bg-[rgba(0,255,136,0.2)] text-[#00ff88]'
              : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
          }`}
        >
          Mass Spectrometer
        </button>
      </div>

      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={handleReset}
          className="rounded-full border border-[rgba(0,245,255,0.5)] bg-[rgba(0,245,255,0.15)] px-4 py-2 font-mono-display text-xs uppercase tracking-wider text-[#00f5ff] transition hover:bg-[rgba(0,245,255,0.25)]"
        >
          Reset
        </button>
      </div>

      <div className="absolute right-4 top-4 rounded-lg border border-[rgba(0,245,255,0.3)] bg-[rgba(10,15,30,0.9)] p-3">
        <div className="mb-2 font-mono-display text-xs text-slate-400">PHYSICS DATA</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono-display text-[10px]">
          <span className="text-[#00ffff]">F:</span>
          <span className="text-white">{lorentzForce.toExponential(2)} N</span>
          <span className="text-[#88ff88]">r:</span>
          <span className="text-white">{radius.toFixed(2)} m</span>
          <span className="text-[#ffff00]">B:</span>
          <span className="text-white">{magneticField.toFixed(2)} T</span>
          <span className="text-[#ff4444]">q:</span>
          <span className="text-white">{charge > 0 ? '+' : ''}{charge.toExponential(1)} C</span>
        </div>
      </div>

      <div className="absolute bottom-20 left-4">
        <div className="mb-2 font-mono-display text-xs text-slate-400">
          GRAPH: {graphMode === 'trajectory' ? 'Trajectory (x-y)' : graphMode === 'energy' ? 'KE vs Time' : 'Force vs Speed'}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setGraphMode('trajectory')}
              className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
                graphMode === 'trajectory'
                  ? 'bg-[rgba(255,255,0,0.2)] text-[#ffff00]'
                  : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
              }`}
            >
              Trajectory
            </button>
            <button
              onClick={() => setGraphMode('energy')}
              className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
                graphMode === 'energy'
                  ? 'bg-[rgba(0,255,136,0.2)] text-[#00ff88]'
                  : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
              }`}
            >
              KE vs t
            </button>
            <button
              onClick={() => setGraphMode('force')}
              className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
                graphMode === 'force'
                  ? 'bg-[rgba(255,68,68,0.2)] text-[#ff4444]'
                  : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
              }`}
            >
              F vs v
            </button>
          </div>
          <GraphPanel
            dataHistory={dataHistory}
            mode={graphMode}
            charge={charge}
            magneticField={magneticField}
            velocity={velocity}
          />
        </div>
      </div>

      <div className="absolute right-4 bottom-4 rounded-lg border border-[rgba(136,255,136,0.3)] bg-[rgba(10,15,30,0.9)] p-3">
        <div className="mb-2 font-mono-display text-xs text-[#88ff88]">FORMULA</div>
        <div className="space-y-1 font-mono-display text-[10px]">
          <div className="text-slate-300">F = qvB sin(θ)</div>
          <div className="text-slate-500">r = mv / (qB)</div>
          <div className="text-slate-500">T = 2πm / (qB)</div>
        </div>
      </div>
    </div>
  )
}

MagneticFields.getSceneConfig = (variables = {}) => {
  const { charge = 1.6e-19, velocity = 1e6, magneticField = 0.5, electricField = 0 } = variables
  const lorentzForce = Math.abs(charge) * velocity * magneticField
  const radius = Math.abs(velocity) * Math.abs(charge) / magneticField

  return {
    name: 'Magnetic Fields',
    description: 'Lorentz force and charged particle motion in magnetic fields',
    type: 'electromagnetic',
    physics: {
      charge,
      velocity,
      magneticField,
      electricField,
      lorentzForce,
      radius,
    },
    calculations: {
      lorentzForce: `F = qvB = ${lorentzForce.toExponential(2)} N`,
      radius: `r = mv/(qB) = ${radius.toFixed(2)} m`,
      period: `T = 2πm/(qB) = ${(2 * Math.PI * Math.abs(charge) / magneticField).toFixed(2)} s`,
    },
  }
}
