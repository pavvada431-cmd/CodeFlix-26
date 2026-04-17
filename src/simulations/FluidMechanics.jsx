import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Grid, Html, OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

const G = 9.81
const TANK_WIDTH = 6
const TANK_HEIGHT = 8
const TANK_DEPTH = 3
const WATER_LEVEL = TANK_HEIGHT * 0.6

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

function GlassTank() {
  return (
    <group>
      <mesh position={[0, TANK_HEIGHT / 2, 0]}>
        <boxGeometry args={[TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH]} />
        <meshPhysicalMaterial
          color="#88ccff"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH)]} />
        <lineBasicMaterial color="#4488cc" linewidth={2} />
      </lineSegments>
    </group>
  )
}

function WaterVolume() {
  const waterRef = useRef()

  return (
    <mesh position={[0, WATER_LEVEL / 2, 0]}>
      <boxGeometry args={[TANK_WIDTH - 0.1, WATER_LEVEL, TANK_DEPTH - 0.1]} />
      <meshPhysicalMaterial
        color="#0066cc"
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function PressureBands() {
  const bandCount = 8
  const bandHeight = WATER_LEVEL / bandCount

  return (
    <group>
      {Array.from({ length: bandCount }, (_, i) => {
        const depth = (i + 0.5) * bandHeight
        const pressure = 1000 * G * depth
        const intensity = (i + 1) / bandCount
        const opacity = 0.05 + intensity * 0.15

        return (
          <mesh key={i} position={[0, depth, 0]}>
            <boxGeometry args={[TANK_WIDTH - 0.2, bandHeight * 0.95, TANK_DEPTH - 0.2]} />
            <meshPhysicalMaterial
              color="#0044aa"
              transparent
              opacity={opacity}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}
    </group>
  )
}

function ForceArrow({ position, direction, length, color, label }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    const hw = 0.08
    const headLen = 0.2
    shape.moveTo(0, length)
    shape.lineTo(-hw, length - headLen)
    shape.lineTo(-hw * 0.4, length - headLen)
    shape.lineTo(-hw * 0.4, 0)
    shape.lineTo(hw * 0.4, 0)
    shape.lineTo(hw * 0.4, length - headLen)
    shape.lineTo(hw, length - headLen)
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false })
  }, [length])

  const rotation = useMemo(() => {
    const angle = Math.atan2(direction[1], direction[0])
    return [0, 0, -angle - Math.PI / 2]
  }, [direction])

  if (length < 0.1) return null

  return (
    <group position={position}>
      <mesh geometry={geometry} rotation={rotation}>
        <meshPhysicalMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <FrostedLabel position={[direction[0] * 0.6, direction[1] * 0.6, 0.2]} color={color}>{label}</FrostedLabel>
    </group>
  )
}

function Waterline({ objectPosition, objectRadius, objectShape }) {
  const waterY = WATER_LEVEL
  const objectTop = objectPosition.y + objectRadius
  const objectBottom = objectPosition.y - objectRadius

  if (objectBottom > waterY || objectTop < waterY) return null

  const ringRadius = objectRadius * 1.1

  return (
    <mesh position={[objectPosition.x, waterY, objectPosition.z]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[ringRadius, 0.03, 8, 32]} />
      <meshPhysicalMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
    </mesh>
  )
}

function FloatingObject({
  objectShape,
  objectDensity,
  objectVolume,
  fluidDensity,
  isPlaying,
  onPositionUpdate,
}) {
  const meshRef = useRef()
  const positionRef = useRef({ x: 0, y: TANK_HEIGHT * 0.8, z: 0 })
  const velocityRef = useRef(0)
  const startTimeRef = useRef(0)

  const mass = objectDensity * objectVolume
  const weight = mass * G
  const maxBuoyancy = fluidDensity * objectVolume * G
  const submergedAtFull = fluidDensity * objectVolume * G

  const equilibriumDepth = useMemo(() => {
    if (objectDensity >= fluidDensity) return -1
    const frac = objectDensity / fluidDensity
    const objectHeight = objectVolume ** (1/3) * 2
    return WATER_LEVEL - objectHeight * (1 - frac) - TANK_HEIGHT * 0.4
  }, [objectDensity, fluidDensity, objectVolume])

  useEffect(() => {
    if (!isPlaying) {
      positionRef.current = { x: 0, y: WATER_LEVEL + 1, z: 0 }
      velocityRef.current = 0
      startTimeRef.current = 0
    }
  }, [isPlaying, objectDensity, fluidDensity])

  useEffect(() => {
    if (!isPlaying) return

    if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now() / 1000
    }

    let animationId
    let lastTime = performance.now()

    const animate = () => {
      const currentTime = performance.now()
      const dt = Math.min((currentTime - lastTime) / 1000, 0.016)
      lastTime = currentTime

      const pos = positionRef.current
      const objectHeight = objectVolume ** (1/3) * 2
      const radius = objectHeight / 2

      let submergedFraction = 0
      if (pos.y + radius > WATER_LEVEL && pos.y - radius < WATER_LEVEL) {
        submergedFraction = (WATER_LEVEL - (pos.y - radius)) / (2 * radius)
        submergedFraction = Math.max(0, Math.min(1, submergedFraction))
      } else if (pos.y + radius <= WATER_LEVEL) {
        submergedFraction = 1
      }

      const buoyancyForce = submergedFraction * maxBuoyancy
      const netForce = buoyancyForce - weight
      const acceleration = netForce / mass

      const damping = submergedFraction > 0.9 ? 0.95 : 0.99
      velocityRef.current = (velocityRef.current + acceleration * dt) * damping

      positionRef.current.y += velocityRef.current * dt

      if (positionRef.current.y - radius < 0) {
        positionRef.current.y = radius
        velocityRef.current = -velocityRef.current * 0.3
      }

      if (meshRef.current) {
        meshRef.current.position.y = positionRef.current.y
      }

      onPositionUpdate?.({
        y: positionRef.current.y,
        velocity: velocityRef.current,
        acceleration,
        submergedFraction,
        displacedVolume_m3: submergedFraction * objectVolume,
        buoyancyForce_N: buoyancyForce,
        netForce_N: netForce,
        weight_N: weight,
        buoyancyForce,
        netForce,
      })

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [isPlaying, objectDensity, fluidDensity, mass, maxBuoyancy, objectVolume, onPositionUpdate])

  const getGeometry = () => {
    const size = objectVolume ** (1/3) * 2
    switch (objectShape) {
      case 'cube':
        return <boxGeometry args={[size, size, size]} />
      case 'cylinder':
        return <cylinderGeometry args={[size / 2, size / 2, size, 16]} />
      case 'sphere':
      default:
        return <sphereGeometry args={[size / 2, 32, 32]} />
    }
  }

  const getRotation = () => {
    switch (objectShape) {
      case 'cylinder':
        return [0, 0, Math.PI / 2]
      default:
        return [0, 0, 0]
    }
  }

  const objectColor = objectDensity > fluidDensity ? '#ff6644' : '#44ff88'

  return (
    <mesh ref={meshRef} position={[0, WATER_LEVEL + 1, 0]} rotation={getRotation()}>
      {getGeometry()}
      <meshPhysicalMaterial
        color={objectColor}
        metalness={0.4}
        roughness={0.5}
        emissive={objectColor}
        emissiveIntensity={0.2}
      />
    </mesh>
  )
}

function FluidParticles() {
  const particlesRef = useRef()
  const particleCount = 100
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * TANK_WIDTH * 0.8
      pos[i * 3 + 1] = Math.random() * WATER_LEVEL
      pos[i * 3 + 2] = (Math.random() - 0.5) * TANK_DEPTH * 0.8
    }
    return pos
  }, [])

  const velocities = useRef(
    Array.from({ length: particleCount }, () => ({
      vx: (Math.random() - 0.5) * 0.02,
      vy: -Math.random() * 0.05 - 0.02,
      vz: (Math.random() - 0.5) * 0.02,
    }))
  )

  useFrame((state, delta) => {
    if (!particlesRef.current?.geometry?.attributes?.position?.array) return

    const posArray = particlesRef.current?.geometry?.attributes?.position?.array
    if (!posArray) return

    for (let i = 0; i < particleCount; i++) {
      const vel = velocities.current[i]
      posArray[i * 3] += vel.vx
      posArray[i * 3 + 1] += vel.vy
      posArray[i * 3 + 2] += vel.vz

      if (posArray[i * 3 + 1] < 0) {
        posArray[i * 3 + 1] = WATER_LEVEL
        vel.vy = -Math.random() * 0.05 - 0.02
      }
      if (posArray[i * 3] > TANK_WIDTH / 2) posArray[i * 3] = -TANK_WIDTH / 2
      if (posArray[i * 3] < -TANK_WIDTH / 2) posArray[i * 3] = TANK_WIDTH / 2
    }

    if (particlesRef.current?.geometry?.attributes?.position) {
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#88ccff" size={0.08} transparent opacity={0.6} />
    </points>
  )
}

function BernoulliPipe() {
  const particlesRef = useRef()
  const particleCount = 80

  const pipePositions = useMemo(() => {
    const positions = []
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount
      const x = (t - 0.5) * 12
      const narrowFactor = 1 - 0.6 * Math.exp(-(((t - 0.5) * 12) ** 2) / 2)
      const y = (Math.random() - 0.5) * narrowFactor * 1.5
      const z = (Math.random() - 0.5) * 0.5
      positions.push({ x, y, z, baseX: x, narrowFactor })
    }
    return positions
  }, [])

  const velocities = useRef(
    pipePositions.map(p => {
      const speed = 2 / (p.narrowFactor ** 0.5 || 0.5)
      return { vx: speed, vy: 0, vz: 0, speed }
    })
  )

  useFrame((state, delta) => {
    if (!particlesRef.current?.geometry?.attributes?.position?.array) return

    const posArray = particlesRef.current?.geometry?.attributes?.position?.array
    if (!posArray) return

    for (let i = 0; i < particleCount; i++) {
      const p = pipePositions[i]
      const vel = velocities.current[i]

      posArray[i * 3] += vel.vx * delta * 3
      posArray[i * 3 + 1] = p.y + Math.sin(state.clock.elapsedTime * 3 + i) * 0.05
      posArray[i * 3 + 2] = p.z

      if (posArray[i * 3] > 6) {
        posArray[i * 3] = -6
      }
    }

    if (particlesRef.current?.geometry?.attributes?.position) {
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <group position={[0, -2, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <tubeGeometry
          args={[
            new THREE.CatmullRomCurve3(
              Array.from({ length: 50 }, (_, i) => {
                const t = i / 49
                const x = (t - 0.5) * 12
                return new THREE.Vector3(x, 0, 0)
              }),
              50,
              undefined,
              true
            ),
            32,
            (i) => {
              const t = (i / 32)
              const narrowFactor = 1 - 0.6 * Math.exp(-(((t - 0.5) * 6) ** 2))
              return narrowFactor * 1.5
            },
            true
          ]}
        />
        <meshPhysicalMaterial color="#88ccff" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      <mesh>
        <boxGeometry args={[12, 3, 1]} />
        <meshPhysicalMaterial color="#4488cc" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={new Float32Array(particleCount * 3)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color="#00ffff" size={0.15} />
      </points>

      <FrostedLabel position={[0, 2, 0]} color="#00ffff">Bernoulli Pipe</FrostedLabel>
      <FrostedLabel position={[-3, 1, 0]} color="#4488ff">Wide = Slow = High P</FrostedLabel>
      <FrostedLabel position={[3, 1, 0]} color="#ff8844">Narrow = Fast = Low P</FrostedLabel>
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

    if (mode === 'forceDepth') {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('Net Force vs Submersion Depth', padding + 5, 18)

      const maxDepth = Math.max(...dataHistory.map(d => d.submergedFraction || 0), 1)
      const maxForce = Math.max(...dataHistory.map(d => Math.abs(d.netForce || 0)), 1)

      ctx.strokeStyle = '#00ff88'
      ctx.lineWidth = 2
      ctx.beginPath()

      dataHistory.forEach((point, i) => {
        const x = padding + ((point.submergedFraction || 0) / maxDepth) * (width - 2 * padding)
        const y = height / 2 - ((point.netForce || 0) / maxForce) * (height / 2 - padding)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      ctx.strokeStyle = '#ff4444'
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(padding, height / 2)
      ctx.lineTo(width - padding, height / 2)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = '#888'
      ctx.fillText('Depth →', width - padding - 40, height - 5)
      ctx.fillText('F →', padding, padding - 10)
      ctx.fillText('Equilibrium (F=0)', width / 2 - 40, height / 2 - 5)
    }

    if (mode === 'oscillation') {
      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText('Position vs Time (Damped Oscillation)', padding + 5, 18)

      const positions = dataHistory.map(d => d.y || 0)
      const minY = Math.min(...positions)
      const maxY = Math.max(...positions)
      const range = maxY - minY || 1

      ctx.strokeStyle = '#00f5ff'
      ctx.lineWidth = 2
      ctx.beginPath()

      dataHistory.forEach((point, i) => {
        const x = padding + (i / (dataHistory.length - 1)) * (width - 2 * padding)
        const y = height - padding - ((point.y - minY) / range) * (height - 2 * padding)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      ctx.fillStyle = '#888'
      ctx.fillText('t →', width - padding - 20, height - 5)
      ctx.fillText('y →', padding, padding - 10)
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

export default function FluidMechanics({
  fluidDensity = 1000,
  objectDensity = 800,
  objectVolume = 0.125,
  objectShape = 'sphere',
  isPlaying = false,
  onDataPoint,
}) {
  const [currentData, setCurrentData] = useState(null)
  const [dataHistory, setDataHistory] = useState([])
  const [graphMode, setGraphMode] = useState('forceDepth')
  const [bernoulliMode, setBernoulliMode] = useState(false)

  const handlePositionUpdate = useCallback((data) => {
    const rho = fluidDensity
    const v1 = 1.2
    const v2 = 2.4
    const p1 = 101325
    const y1 = WATER_LEVEL
    const y2 = WATER_LEVEL - 1.2
    const p2 = p1 + 0.5 * rho * (v1 * v1 - v2 * v2) + rho * G * (y1 - y2)
    const enriched = {
      ...data,
      bernoulli: {
        P1_Pa: p1,
        P2_Pa: p2,
        v1_mps: v1,
        v2_mps: v2,
        y1_m: y1,
        y2_m: y2,
      },
    }
    setCurrentData(enriched)
    setDataHistory(prev => {
      const newHistory = [...prev, enriched]
      if (newHistory.length > 300) return newHistory.slice(-300)
      return newHistory
    })
    onDataPoint?.(enriched)
  }, [onDataPoint, fluidDensity])

  useEffect(() => {
    if (!isPlaying) {
      setDataHistory([])
      setCurrentData(null)
    }
  }, [isPlaying])

  const mass = objectDensity * objectVolume
  const weight = mass * G
  const maxBuoyancy = fluidDensity * objectVolume * G
  const willFloat = objectDensity <= fluidDensity

  const submergedVol = currentData?.submergedFraction
    ? currentData.submergedFraction * objectVolume
    : 0
  const buoyancyForce = currentData?.buoyancyForce || 0
  const netForce = currentData?.netForce || 0
  const acceleration = currentData?.acceleration || 0
  const velocity = currentData?.velocity || 0
  const posY = currentData?.y || WATER_LEVEL + 1

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
      camera={{ position: [0, 4, 10], fov: 50 }}
        style={{ width: '100%', height: '100%', background: '#0a0f1e' }}
      >
        <fog attach="fog" args={['#071120', 10, 30]} />
        <Environment preset="city" intensity={0.18} />
        <ambientLight intensity={0.35} color="#9ab8d6" />
        <directionalLight position={[5, 10, 5]} intensity={1.1} />
        <pointLight position={[0, 5, 3]} intensity={0.6} color="#00d4ff" />
        <pointLight position={[0, 2, -5]} intensity={0.35} color="#35ffb6" />
        <Grid
          position={[0, -0.01, 0]}
          args={[16, 16]}
          cellSize={0.4}
          cellThickness={0.5}
          sectionSize={2}
          sectionThickness={1}
          cellColor="#1f3f52"
          sectionColor="#3d647c"
          fadeDistance={20}
          fadeStrength={1}
        />

        {bernoulliMode ? (
          <BernoulliPipe />
        ) : (
          <>
            <GlassTank />
            <WaterVolume />
            <PressureBands />
            <FluidParticles />
            <FloatingObject
              objectShape={objectShape}
              objectDensity={objectDensity}
              objectVolume={objectVolume}
              fluidDensity={fluidDensity}
              isPlaying={isPlaying}
              onPositionUpdate={handlePositionUpdate}
            />
            <Waterline
              objectPosition={{ x: 0, y: posY, z: 0 }}
              objectRadius={objectVolume ** (1/3)}
              objectShape={objectShape}
            />
          </>
        )}
        <EffectComposer>
          <Bloom intensity={0.4} luminanceThreshold={0.55} luminanceSmoothing={0.9} mipmapBlur />
          <Vignette offset={0.28} darkness={0.5} />
        </EffectComposer>
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={6}
          maxDistance={22}
          autoRotate={!isPlaying}
          autoRotateSpeed={0.18}
        />
      </Canvas>

      <div className="absolute right-4 top-4 rounded-lg border border-[rgba(0,245,255,0.3)] bg-[rgba(10,15,30,0.9)] p-3">
        <div className="mb-2 font-mono-display text-xs text-slate-400">FLUID DYNAMICS</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono-display text-[10px]">
          <span className="text-[#88ccff]">ρ_fluid:</span>
          <span className="text-white">{fluidDensity} kg/m³</span>
          <span className="text-[#ff6644]">ρ_object:</span>
          <span className="text-white">{objectDensity} kg/m³</span>
          <span className="text-[#00ff88]">Weight:</span>
          <span className="text-white">{weight.toFixed(2)} N</span>
          <span className="text-[#4488ff]">F_buoy:</span>
          <span className="text-white">{buoyancyForce.toFixed(2)} N</span>
          <span className="text-[#44ff88]">F_net:</span>
          <span className="text-white">{netForce.toFixed(2)} N</span>
          <span className="text-[#ffff00]">Submerged:</span>
          <span className="text-white">{((currentData?.submergedFraction || 0) * 100).toFixed(0)}%</span>
        </div>
      </div>

      {currentData && !bernoulliMode && (
        <group position={[1.5, posY, 0]}>
          <ForceArrow
            position={[0, 0, 0]}
            direction={[0, 1]}
            length={Math.min(buoyancyForce * 0.05, 1.5)}
            color="#4488ff"
            label={`F_b=${buoyancyForce.toFixed(1)}N`}
          />
          <ForceArrow
            position={[0, 0, 0]}
            direction={[0, -1]}
            length={Math.min(weight * 0.05, 1.5)}
            color="#ff4444"
            label={`W=${weight.toFixed(1)}N`}
          />
          {Math.abs(netForce) > 0.1 && (
            <ForceArrow
              position={[0.5, 0, 0]}
              direction={[0, netForce > 0 ? 1 : -1]}
              length={Math.min(Math.abs(netForce) * 0.05, 1)}
              color="#44ff44"
              label={`F_n=${netForce.toFixed(1)}N`}
            />
          )}
        </group>
      )}

      <div className="absolute bottom-20 right-4">
        <div className="mb-2 font-mono-display text-xs text-slate-400">
          GRAPH: {graphMode === 'forceDepth' ? 'Force vs Depth' : 'Position vs Time'}
        </div>
        <div className="mb-2 flex gap-2">
          <button
            onClick={() => setGraphMode('forceDepth')}
            className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
              graphMode === 'forceDepth'
                ? 'bg-[rgba(0,255,136,0.2)] text-[#00ff88]'
                : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
            }`}
          >
            F vs depth
          </button>
          <button
            onClick={() => setGraphMode('oscillation')}
            className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
              graphMode === 'oscillation'
                ? 'bg-[rgba(0,245,255,0.2)] text-[#00f5ff]'
                : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
            }`}
          >
            y vs t
          </button>
        </div>
        <GraphPanel mode={graphMode} dataHistory={dataHistory} />
      </div>

      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <button
          onClick={() => setBernoulliMode(!bernoulliMode)}
          className={`rounded px-4 py-2 font-mono-display text-xs transition ${
            bernoulliMode
              ? 'border-[rgba(0,245,255,0.5)] bg-[rgba(0,245,255,0.2)] text-[#00f5ff]'
              : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400'
          }`}
          style={{ borderWidth: '1px', borderStyle: 'solid' }}
        >
          {bernoulliMode ? 'Buoyancy Mode' : 'Bernoulli Mode'}
        </button>
      </div>

      <div className="absolute bottom-4 right-4 rounded-full border border-[rgba(68,136,255,0.3)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#4488ff]">
        {willFloat ? '✓ Object will float' : '✗ Object will sink'}
      </div>

      {!bernoulliMode && (
        <div className="absolute left-4 bottom-32 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.5)] p-2 font-mono-display text-[9px] text-slate-400">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#4488ff]" />
            <span>Buoyancy (up)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#ff4444]" />
            <span>Gravity (down)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#44ff44]" />
            <span>Net Force</span>
          </div>
        </div>
      )}

      {bernoulliMode && (
        <div className="absolute left-4 top-4 rounded-lg border border-[rgba(0,255,255,0.3)] bg-[rgba(0,0,0,0.7)] p-3 font-mono-display text-xs text-[#00ffff]">
          <div className="mb-1">Bernoulli's Principle:</div>
          <div className="text-[10px] text-slate-400">P + ½ρv² = constant</div>
          <div className="mt-2 text-[10px]">
            Narrow pipe → faster flow → lower pressure
          </div>
        </div>
      )}
    </div>
  )
}

FluidMechanics.getSceneConfig = (variables = {}) => {
  const { fluidDensity = 1000, objectDensity = 800, objectVolume = 0.125 } = variables

  const mass = objectDensity * objectVolume
  const weight = mass * G
  const maxBuoyancy = fluidDensity * objectVolume * G
  const willFloat = objectDensity <= fluidDensity
  const equilibriumDepth = willFloat
    ? (1 - objectDensity / fluidDensity) * objectVolume ** (1/3) * 2
    : 0

  return {
    name: 'Fluid Mechanics',
    description: `Archimedes principle: ${willFloat ? 'object floats' : 'object sinks'}`,
    type: 'fluid_mechanics',
    physics: {
      fluidDensity,
      objectDensity,
      objectVolume,
      mass,
      weight,
      maxBuoyancy,
      willFloat,
    },
    calculations: {
      buoyancyForce: `F_b = ρ_fluid × V × g = ${maxBuoyancy.toFixed(2)} N`,
      weight: `W = mg = ${weight.toFixed(2)} N`,
      netForce: `F_net = F_b - W = ${(maxBuoyancy - weight).toFixed(2)} N`,
      bernoulli: `P + ½ρv² + ρgy = constant`,
      equilibriumDepth: willFloat
        ? `Equilibrium at ${equilibriumDepth.toFixed(2)}m depth`
        : 'No equilibrium (sinks)',
    },
  }
}
