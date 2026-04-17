import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const K_BOLTZMANN = 1.0
const PARTICLE_MASS = 1.0
const HISTOGRAM_BINS = 20
const HISTOGRAM_UPDATE_INTERVAL = 500

function createLabelTexture(text, color = '#ffffff', width = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
  ctx.roundRect(0, 0, width, 64, 8)
  ctx.fill()
  ctx.fillStyle = color
  ctx.font = 'bold 28px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(text, width / 2, 42)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function MaxwellBoltzmann(v, T) {
  const vth = Math.sqrt(2 * K_BOLTZMANN * T / PARTICLE_MASS)
  return 4 * Math.PI * Math.pow(PARTICLE_MASS / (2 * Math.PI * K_BOLTZMANN * T), 1.5) * v * v * Math.exp(-PARTICLE_MASS * v * v / (2 * K_BOLTZMANN * T))
}

function Particle({ position, speed, maxSpeed }) {
  const normalizedSpeed = Math.min(speed / maxSpeed, 1)
  
  const color = useMemo(() => {
    if (normalizedSpeed < 0.33) {
      return new THREE.Color().setHSL(0.6, 0.8, 0.5)
    } else if (normalizedSpeed < 0.66) {
      return new THREE.Color().setHSL(0.1, 0.3, 0.8)
    } else {
      return new THREE.Color().setHSL(0.0, 0.8, 0.5)
    }
  }, [normalizedSpeed])

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3 + normalizedSpeed * 0.4}
        metalness={0.4}
        roughness={0.5}
      />
    </mesh>
  )
}

function ParticleSystem({ numParticles, temperature, volume, isPlaying, onDataUpdate }) {
  const particlesRef = useRef([])
  const velocitiesRef = useRef([])
  const meshRefs = useRef([])
  const maxSpeedRef = useRef(5)

  const boxSize = volume ** (1/3)
  const initialSpeed = Math.sqrt(3 * K_BOLTZMANN * temperature / PARTICLE_MASS)

  useEffect(() => {
    particlesRef.current = []
    velocitiesRef.current = []

    for (let i = 0; i < numParticles; i++) {
      const r = boxSize / 2 - 0.2
      particlesRef.current.push({
        x: (Math.random() - 0.5) * boxSize * 0.8,
        y: (Math.random() - 0.5) * boxSize * 0.8,
        z: (Math.random() - 0.5) * boxSize * 0.8,
      })

      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = initialSpeed * (0.5 + Math.random() * 0.5)
      velocitiesRef.current.push({
        vx: speed * Math.sin(phi) * Math.cos(theta),
        vy: speed * Math.sin(phi) * Math.sin(theta),
        vz: speed * Math.cos(phi),
      })
    }
  }, [numParticles, temperature, boxSize, initialSpeed])

  useFrame((state, delta) => {
    if (!isPlaying) return

    const dt = Math.min(delta, 0.033)
    const halfBox = boxSize / 2 - 0.1
    let totalMomentumTransfer = 0
    let totalKE = 0
    let maxSpeed = 0

    particlesRef.current.forEach((p, i) => {
      const v = velocitiesRef.current[i]
      p.x += v.vx * dt
      p.y += v.vy * dt
      p.z += v.vz * dt

      if (p.x > halfBox) { p.x = halfBox; v.vx = -Math.abs(v.vx); totalMomentumTransfer += Math.abs(v.vx) * PARTICLE_MASS }
      if (p.x < -halfBox) { p.x = -halfBox; v.vx = Math.abs(v.vx); totalMomentumTransfer += Math.abs(v.vx) * PARTICLE_MASS }
      if (p.y > halfBox) { p.y = halfBox; v.vy = -Math.abs(v.vy); totalMomentumTransfer += Math.abs(v.vy) * PARTICLE_MASS }
      if (p.y < -halfBox) { p.y = -halfBox; v.vy = Math.abs(v.vy); totalMomentumTransfer += Math.abs(v.vy) * PARTICLE_MASS }
      if (p.z > halfBox) { p.z = halfBox; v.vz = -Math.abs(v.vz); totalMomentumTransfer += Math.abs(v.vz) * PARTICLE_MASS }
      if (p.z < -halfBox) { p.z = -halfBox; v.vz = Math.abs(v.vz); totalMomentumTransfer += Math.abs(v.vz) * PARTICLE_MASS }

      const speed = Math.sqrt(v.vx * v.vx + v.vy * v.vy + v.vz * v.vz)
      totalKE += 0.5 * PARTICLE_MASS * speed * speed
      if (speed > maxSpeed) maxSpeed = speed

      if (meshRefs.current[i]) {
        meshRefs.current[i].position.set(p.x, p.y, p.z)
        const normalizedSpeed = speed / (initialSpeed * 1.5)
        const hue = normalizedSpeed < 0.5 ? 0.6 - normalizedSpeed * 0.4 : 0.2 - (normalizedSpeed - 0.5) * 0.4
        meshRefs.current[i].material.color.setHSL(Math.max(0, hue), 0.8, 0.5)
        meshRefs.current[i].material.emissiveIntensity = 0.2 + normalizedSpeed * 0.4
      }
    })

    maxSpeedRef.current = maxSpeed

    const avgKE = totalKE / numParticles
    const measuredTemp = (2 * avgKE) / (3 * K_BOLTZMANN * numParticles)
    const area = boxSize * boxSize * 6
    const pressure = (totalMomentumTransfer * 60) / (area * numParticles)

    const rmsSpeed = Math.sqrt(2 * avgKE / PARTICLE_MASS)

    onDataUpdate?.({
      P: pressure,
      V: volume,
      T: temperature,
      avgKE,
      rmsSpeed,
    })
  })

  return (
    <group>
      {particlesRef.current.map((p, i) => (
        <mesh
          key={i}
          ref={el => meshRefs.current[i] = el}
          position={[p.x, p.y, p.z]}
        >
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#00f5ff" />
        </mesh>
      ))}
    </group>
  )
}

function Box({ volume }) {
  const boxSize = volume ** (1/3)
  const halfSize = boxSize / 2

  return (
    <group>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(boxSize, boxSize, boxSize)]} />
        <lineBasicMaterial color="#4488cc" linewidth={2} />
      </lineSegments>
      <mesh>
        <boxGeometry args={[boxSize, boxSize, boxSize]} />
        <meshBasicMaterial color="#88ccff" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

function SpeedHistogram({ particles, temperature }) {
  const canvasRef = useRef(null)
  const lastUpdateRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || particles.length === 0) return

    const now = performance.now()
    if (now - lastUpdateRef.current < HISTOGRAM_UPDATE_INTERVAL) return
    lastUpdateRef.current = now

    const ctx = canvas.getContext('2d')
    const width = 280
    const height = 160
    canvas.width = width
    canvas.height = height

    ctx.fillStyle = 'rgba(10, 15, 30, 0.95)'
    ctx.fillRect(0, 0, width, height)

    const speeds = particles.map(p => {
      const v = velocitiesRef?.current?.find((_, i) => i < particles.length)
      return Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz)
    })

    const maxSpeed = Math.max(...speeds, 1)
    const binSize = maxSpeed / HISTOGRAM_BINS
    const bins = new Array(HISTOGRAM_BINS).fill(0)

    speeds.forEach(s => {
      const bin = Math.min(Math.floor(s / binSize), HISTOGRAM_BINS - 1)
      bins[bin]++
    })

    const maxBin = Math.max(...bins, 1)
    const padding = 35
    const chartWidth = width - 2 * padding
    const chartHeight = height - 2 * padding - 20

    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padding + chartHeight * i / 4
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    ctx.fillStyle = '#00f5ff'
    ctx.font = '10px monospace'
    ctx.fillText('Speed Distribution', padding, 18)
    ctx.font = '8px monospace'
    ctx.fillText('— Histogram    · Maxwell-Boltzmann', padding, height - 5)

    ctx.strokeStyle = '#00f5ff'
    ctx.lineWidth = 2
    bins.forEach((count, i) => {
      const x = padding + (i / HISTOGRAM_BINS) * chartWidth
      const barHeight = (count / maxBin) * chartHeight
      ctx.fillRect(x, padding + chartHeight - barHeight, chartWidth / HISTOGRAM_BINS - 2, barHeight)
    })

    ctx.strokeStyle = '#ff8800'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i <= 50; i++) {
      const v = (i / 50) * maxSpeed * 1.2
      const p = MaxwellBoltzmann(v, temperature) * numParticlesToScale(maxSpeed)
      const x = padding + (v / (maxSpeed * 1.2)) * chartWidth
      const y = padding + chartHeight - p * chartHeight
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  })

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg border border-[rgba(0,245,255,0.3)]"
      style={{ width: 280, height: 160 }}
    />
  )
}

function PVDiagram({ dataHistory }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dataHistory.length < 2) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const padding = 40

    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, width, height)

    const pressures = dataHistory.map(d => d.P)
    const volumes = dataHistory.map(d => d.V)
    const minP = Math.min(...pressures, 0.01)
    const maxP = Math.max(...pressures, 1)
    const minV = Math.min(...volumes, 1)
    const maxV = Math.max(...volumes, 10)

    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.lineTo(width - padding, padding)
    ctx.stroke()

    ctx.fillStyle = '#888'
    ctx.font = '10px monospace'
    ctx.fillText('P', width - 15, padding - 5)
    ctx.fillText('V', width - padding, height - 15)
    ctx.fillText('PV Diagram', padding, 15)

    if (dataHistory.length < 10) return

    ctx.strokeStyle = '#ff6b35'
    ctx.lineWidth = 2
    ctx.beginPath()

    dataHistory.forEach((point, i) => {
      const x = padding + ((point.V - minV) / (maxV - minV || 1)) * (width - 2 * padding)
      const y = height - padding - ((point.P - minP) / (maxP - minP || 1)) * (height - 2 * padding)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    if (dataHistory.length > 0) {
      const last = dataHistory[dataHistory.length - 1]
      const lx = padding + ((last.V - minV) / (maxV - minV || 1)) * (width - 2 * padding)
      const ly = height - padding - ((last.P - minP) / (maxP - minP || 1)) * (height - 2 * padding)
      ctx.fillStyle = '#ff6b35'
      ctx.beginPath()
      ctx.arc(lx, ly, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [dataHistory])

  return (
    <div style={{
      backgroundColor: '#0a0a0f',
      border: '1px solid #333',
      borderRadius: '6px',
      overflow: 'hidden'
    }}>
      <canvas ref={canvasRef} width={280} height={180} />
    </div>
  )
}

let velocitiesRef = null
function numParticlesToScale(maxSpeed) {
  return 0.5 / maxSpeed
}

function SimulationScene({ numParticles, temperature, volume, isPlaying, onDataUpdate, processType }) {
  const boxSize = volume ** (1/3)
  const initialSpeed = Math.sqrt(3 * K_BOLTZMANN * temperature / PARTICLE_MASS)

  const particlesData = useMemo(() => {
    const particles = []
    const velocities = []
    velocitiesRef = velocities

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: (Math.random() - 0.5) * boxSize * 0.8,
        y: (Math.random() - 0.5) * boxSize * 0.8,
        z: (Math.random() - 0.5) * boxSize * 0.8,
        vx: 0, vy: 0, vz: 0,
      })

      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = initialSpeed * (0.5 + Math.random() * 0.5)
      velocities.push({
        vx: speed * Math.sin(phi) * Math.cos(theta),
        vy: speed * Math.sin(phi) * Math.sin(theta),
        vz: speed * Math.cos(phi),
      })
    }

    return { particles, velocities }
  }, [numParticles, temperature, boxSize, initialSpeed])

  const particleRefs = useRef([])
  const lastDataTimeRef = useRef(0)

  useFrame((state, delta) => {
    if (!isPlaying) return

    const dt = Math.min(delta, 0.033)
    const halfBox = boxSize / 2 - 0.1
    let totalMomentumTransfer = 0
    let totalKE = 0
    let maxSpeed = 0

    particlesData.particles.forEach((p, i) => {
      const v = particlesData.velocities[i]
      p.x += v.vx * dt
      p.y += v.vy * dt
      p.z += v.vz * dt

      if (p.x > halfBox) { p.x = halfBox; v.vx = -Math.abs(v.vx); totalMomentumTransfer += Math.abs(v.vx) * PARTICLE_MASS }
      if (p.x < -halfBox) { p.x = -halfBox; v.vx = Math.abs(v.vx); totalMomentumTransfer += Math.abs(v.vx) * PARTICLE_MASS }
      if (p.y > halfBox) { p.y = halfBox; v.vy = -Math.abs(v.vy); totalMomentumTransfer += Math.abs(v.vy) * PARTICLE_MASS }
      if (p.y < -halfBox) { p.y = -halfBox; v.vy = Math.abs(v.vy); totalMomentumTransfer += Math.abs(v.vy) * PARTICLE_MASS }
      if (p.z > halfBox) { p.z = halfBox; v.vz = -Math.abs(v.vz); totalMomentumTransfer += Math.abs(v.vz) * PARTICLE_MASS }
      if (p.z < -halfBox) { p.z = -halfBox; v.vz = Math.abs(v.vz); totalMomentumTransfer += Math.abs(v.vz) * PARTICLE_MASS }

      const speed = Math.sqrt(v.vx * v.vx + v.vy * v.vy + v.vz * v.vz)
      totalKE += 0.5 * PARTICLE_MASS * speed * speed
      if (speed > maxSpeed) maxSpeed = speed

      if (particleRefs.current[i]) {
        particleRefs.current[i].position.set(p.x, p.y, p.z)
        const normalizedSpeed = speed / (initialSpeed * 1.5)
        const hue = normalizedSpeed < 0.5 ? 0.6 - normalizedSpeed * 0.4 : 0.2 - (normalizedSpeed - 0.5) * 0.4
        particleRefs.current[i].material.color.setHSL(Math.max(0, hue), 0.8, 0.5)
        particleRefs.current[i].material.emissive.setHSL(Math.max(0, hue), 0.8, 0.3)
        particleRefs.current[i].material.emissiveIntensity = 0.2 + normalizedSpeed * 0.4
      }
    })

    const now = performance.now()
    if (now - lastDataTimeRef.current > 50) {
      const avgKE = totalKE / numParticles
      const area = boxSize * boxSize * 6
      const pressure = (totalMomentumTransfer * 60) / (area * numParticles)
      const rmsSpeed = Math.sqrt(2 * avgKE / PARTICLE_MASS)

      onDataUpdate?.({
        t: state.clock.elapsedTime,
        P: Math.max(pressure, 0.01),
        V: volume,
        T: temperature,
        avgKE,
        rmsSpeed,
      })
      lastDataTimeRef.current = now
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      <Box volume={volume} />

      {particlesData.particles.map((p, i) => (
        <mesh
          key={i}
          ref={el => particleRefs.current[i] = el}
          position={[p.x, p.y, p.z]}
        >
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#00f5ff" emissive="#00f5ff" emissiveIntensity={0.3} />
        </mesh>
      ))}

      <sprite scale={[3, 0.75, 1]} position={[0, boxSize / 2 + 1, 0]}>
        <spriteMaterial map={createLabelTexture(`T=${temperature}K  V=${volume.toFixed(1)}m³  N=${numParticles}`, '#00f5ff')} transparent />
      </sprite>
    </>
  )
}

function SpeedHistogramPanel({ particlesData, temperature }) {
  const canvasRef = useRef(null)
  const lastUpdateRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !particlesData || particlesData.length === 0) return

    const now = performance.now()
    if (now - lastUpdateRef.current < HISTOGRAM_UPDATE_INTERVAL) return
    lastUpdateRef.current = now

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    canvas.width = width
    canvas.height = height

    ctx.fillStyle = 'rgba(10, 15, 30, 0.95)'
    ctx.fillRect(0, 0, width, height)

    const speeds = particlesData.map(p => {
      const vx = p.vx || 0, vy = p.vy || 0, vz = p.vz || 0
      return Math.sqrt(vx * vx + vy * vy + vz * vz)
    })

    const maxSpeed = Math.max(...speeds, 1)
    const binSize = maxSpeed / HISTOGRAM_BINS
    const bins = new Array(HISTOGRAM_BINS).fill(0)

    speeds.forEach(s => {
      const bin = Math.min(Math.floor(s / binSize), HISTOGRAM_BINS - 1)
      bins[bin]++
    })

    const maxBin = Math.max(...bins, 1)
    const padding = 35
    const chartWidth = width - 2 * padding
    const chartHeight = height - 2 * padding - 20

    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padding + chartHeight * i / 4
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    ctx.fillStyle = '#888'
    ctx.font = '10px monospace'
    ctx.fillText('Speed Distribution', padding, 18)
    ctx.font = '8px monospace'
    ctx.fillText('■ Histogram    — Maxwell-Boltzmann', padding, height - 5)

    ctx.strokeStyle = '#00f5ff'
    ctx.fillStyle = '#00f5ff'
    ctx.lineWidth = 2
    bins.forEach((count, i) => {
      const x = padding + (i / HISTOGRAM_BINS) * chartWidth
      const barHeight = (count / maxBin) * chartHeight
      ctx.fillRect(x, padding + chartHeight - barHeight, chartWidth / HISTOGRAM_BINS - 2, barHeight)
    })

    const scale = chartHeight / maxBin * 50
    ctx.strokeStyle = '#ff8800'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i <= 50; i++) {
      const v = (i / 50) * maxSpeed * 1.2
      const p = MaxwellBoltzmann(v, temperature) * scale
      const x = padding + (v / (maxSpeed * 1.2)) * chartWidth
      const y = padding + chartHeight - Math.min(p, chartHeight)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  })

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg border border-[rgba(0,245,255,0.3)]"
      style={{ width: 280, height: 160 }}
    />
  )
}

export default function Thermodynamics({
  numParticles = 50,
  temperature = 300,
  volume = 8,
  isPlaying = false,
  onDataPoint,
}) {
  const [processType, setProcessType] = useState(null)
  const [currentVolume, setCurrentVolume] = useState(volume)
  const [currentTemp, setCurrentTemp] = useState(temperature)
  const [dataHistory, setDataHistory] = useState([])
  const [currentData, setCurrentData] = useState(null)
  const [particlesSnapshot, setParticlesSnapshot] = useState([])

  const processAnimationRef = useRef(null)

  const handleDataUpdate = useCallback((data) => {
    setCurrentData(data)
    setDataHistory(prev => {
      const newHistory = [...prev, data]
      if (newHistory.length > 500) return newHistory.slice(-500)
      return newHistory
    })
    onDataPoint?.(data)
  }, [onDataPoint])

  const runProcess = useCallback((type) => {
    if (processAnimationRef.current) {
      cancelAnimationFrame(processAnimationRef.current)
    }

    setProcessType(type)
    const startVolume = currentVolume
    const startTemp = currentTemp
    const startTime = performance.now()
    const duration = 5000

    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      if (type === 'isothermal') {
        const newVolume = startVolume * (1 - progress * 0.5)
        setCurrentVolume(newVolume)
        setCurrentTemp(startTemp)
      } else if (type === 'isobaric') {
        const newTemp = startTemp * (1 + progress * 0.5)
        setCurrentTemp(newTemp)
        const newVolume = startVolume * (1 + progress * 0.5)
        setCurrentVolume(newVolume)
      } else if (type === 'adiabatic') {
        const newVolume = startVolume * (1 - progress * 0.5)
        setCurrentVolume(newVolume)
        setCurrentTemp(startTemp * Math.pow(newVolume / startVolume, 1.4))
      }

      if (progress < 1) {
        processAnimationRef.current = requestAnimationFrame(animate)
      }
    }

    processAnimationRef.current = requestAnimationFrame(animate)
  }, [currentVolume, currentTemp])

  const resetSimulation = useCallback(() => {
    if (processAnimationRef.current) {
      cancelAnimationFrame(processAnimationRef.current)
    }
    setProcessType(null)
    setCurrentVolume(volume)
    setCurrentTemp(temperature)
    setDataHistory([])
  }, [volume, temperature])

  useEffect(() => {
    if (!isPlaying) {
      setDataHistory([])
    }
  }, [isPlaying])

  const boxSize = currentVolume ** (1/3)
  const currentPressure = currentData?.P || 0.1
  const avgKE = currentData?.avgKE || 0
  const rmsSpeed = currentData?.rmsSpeed || 0

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
      camera={{ position: [boxSize * 0.8, boxSize * 0.8, boxSize * 1.2], fov: 50 }}
        style={{ background: '#0a0f1e' }}
      >
        <SimulationScene
          numParticles={numParticles}
          temperature={currentTemp}
          volume={currentVolume}
          isPlaying={isPlaying}
          onDataUpdate={handleDataUpdate}
          processType={processType}
        />
      </Canvas>

      <div className="absolute right-4 top-4 rounded-lg border border-[rgba(0,245,255,0.3)] bg-[rgba(10,15,30,0.9)] p-3">
        <div className="mb-2 font-mono-display text-xs text-slate-400">THERMODYNAMIC STATE</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono-display text-[10px]">
          <span className="text-[#00f5ff]">P:</span>
          <span className="text-white">{currentPressure.toFixed(3)} Pa</span>
          <span className="text-[#ff8800]">V:</span>
          <span className="text-white">{currentVolume.toFixed(2)} m³</span>
          <span className="text-[#ff4444]">T:</span>
          <span className="text-white">{currentTemp.toFixed(1)} K</span>
          <span className="text-[#88ff88]">⟨KE⟩:</span>
          <span className="text-white">{avgKE.toFixed(2)} J</span>
          <span className="text-[#ffff00]">v_rms:</span>
          <span className="text-white">{rmsSpeed.toFixed(2)} m/s</span>
          <span className="text-[#ff88ff]">N:</span>
          <span className="text-white">{numParticles}</span>
        </div>
      </div>

      <div className="absolute left-4 bottom-32">
        <div className="mb-2 font-mono-display text-xs text-slate-400">PV DIAGRAM</div>
        <PVDiagram dataHistory={dataHistory} />
      </div>

      <div className="absolute right-4 bottom-32">
        <div className="mb-2 font-mono-display text-xs text-slate-400">SPEED DISTRIBUTION</div>
        <SpeedHistogramPanel particlesData={particlesSnapshot} temperature={currentTemp} />
      </div>

      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <div className="font-mono-display text-xs text-slate-400">THERMODYNAMIC PROCESSES</div>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => runProcess('isothermal')}
            disabled={processType !== null}
            className={`rounded px-3 py-1.5 text-left font-mono-display text-[10px] transition disabled:opacity-40 ${
              processType === 'isothermal'
                ? 'border-[rgba(0,245,255,0.5)] bg-[rgba(0,245,255,0.2)] text-[#00f5ff]'
                : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
            }`}
            style={{ borderWidth: '1px', borderStyle: 'solid' }}
          >
            <div>Isothermal (T=const, V↓)</div>
            <div className="text-[8px] text-slate-500">PV=const (hyperbola)</div>
          </button>

          <button
            onClick={() => runProcess('isobaric')}
            disabled={processType !== null}
            className={`rounded px-3 py-1.5 text-left font-mono-display text-[10px] transition disabled:opacity-40 ${
              processType === 'isobaric'
                ? 'border-[rgba(255,136,0,0.5)] bg-[rgba(255,136,0,0.2)] text-[#ff8800]'
                : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
            }`}
            style={{ borderWidth: '1px', borderStyle: 'solid' }}
          >
            <div>Isobaric (P=const, T↑)</div>
            <div className="text-[8px] text-slate-500">V/T=const (horizontal)</div>
          </button>

          <button
            onClick={() => runProcess('adiabatic')}
            disabled={processType !== null}
            className={`rounded px-3 py-1.5 text-left font-mono-display text-[10px] transition disabled:opacity-40 ${
              processType === 'adiabatic'
                ? 'border-[rgba(136,255,136,0.5)] bg-[rgba(136,255,136,0.2)] text-[#88ff88]'
                : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
            }`}
            style={{ borderWidth: '1px', borderStyle: 'solid' }}
          >
            <div>Adiabatic (Q=0, T changes)</div>
            <div className="text-[8px] text-slate-500">PVᵞ=const</div>
          </button>
        </div>

        {processType && (
          <button
            onClick={resetSimulation}
            className="rounded border border-[rgba(255,68,68,0.5)] bg-[rgba(255,68,68,0.15)] px-3 py-1.5 font-mono-display text-[10px] text-[#ff4444] hover:bg-[rgba(255,68,68,0.25)]"
          >
            Reset
          </button>
        )}
      </div>

      <div className="absolute top-4 left-4 rounded-full border border-[rgba(0,245,255,0.3)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#00f5ff]">
        {numParticles} particles | Maxwell-Boltzmann
      </div>

      {processType && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-[rgba(255,136,0,0.5)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#ff8800]">
          {processType === 'isothermal' && 'Isothermal Process: T = const, V decreasing'}
          {processType === 'isobaric' && 'Isobaric Process: P = const, T increasing'}
          {processType === 'adiabatic' && 'Adiabatic Process: Q = 0, T changing'}
        </div>
      )}

      <div className="absolute bottom-4 right-4 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.5)] p-2 font-mono-display text-[9px] text-slate-400">
        <div className="mb-1 text-slate-500">PARTICLE COLORS:</div>
        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-blue-400" /> <span>Slow (cold)</span></div>
        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-white" /> <span>Medium</span></div>
        <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-red-500" /> <span>Fast (hot)</span></div>
      </div>
    </div>
  )
}

Thermodynamics.getSceneConfig = (variables = {}) => {
  const { numParticles = 50, temperature = 300, volume = 8 } = variables

  const N = numParticles
  const kT = K_BOLTZMANN * temperature
  const avgKE = 1.5 * kT
  const v_rms = Math.sqrt(3 * kT / PARTICLE_MASS)

  return {
    name: 'Thermodynamics',
    description: 'Ideal gas simulation with Maxwell-Boltzmann distribution',
    type: 'thermodynamics',
    physics: {
      numParticles: N,
      temperature,
      volume,
      avgKE,
      v_rms,
    },
    calculations: {
      idealGasLaw: `PV = NkT`,
      avgKineticEnergy: `⟨KE⟩ = 3/2 kT = ${avgKE.toFixed(2)} J`,
      rmsSpeed: `v_rms = √(3kT/m) = ${v_rms.toFixed(2)} m/s`,
    },
  }
}
