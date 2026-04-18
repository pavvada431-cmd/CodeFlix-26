import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, Environment, Grid, Line } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import useSanitizedProps from './shared/useSanitizedProps'

const G = 9.81
const BALL_SIZE = 0.3
const TRACK_INNER_RADIUS = 0.08
const SCALE = 0.8

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

function FrostedLabel({ text, color, position }) {
  return (
    <Html position={position} center style={{ pointerEvents: 'none' }}>
      <div
        style={{
          background: 'rgba(10, 15, 30, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${color}40`,
          borderRadius: '8px',
          padding: '6px 12px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: color,
          whiteSpace: 'nowrap',
          boxShadow: `0 0 20px ${color}20`,
        }}
      >
        {text}
      </div>
    </Html>
  )
}

function CircularTrack({ radius }) {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[radius * SCALE, TRACK_INNER_RADIUS, 16, 100]} />
        <meshPhysicalMaterial
          color="#3a4a5a"
          metalness={0.9}
          roughness={0.2}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
          envMapIntensity={1.5}
        />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[radius * SCALE, 0.015, 16, 100]} />
        <meshBasicMaterial color="#00f5ff" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <ringGeometry args={[radius * SCALE - 0.02, radius * SCALE + 0.02, 64]} />
        <meshBasicMaterial color="#00f5ff" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Ball({ position, color = '#00f5ff' }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[BALL_SIZE, 32, 32]} />
      <meshPhysicalMaterial
        color={color}
        metalness={0.8}
        roughness={0.15}
        clearcoat={1}
        clearcoatRoughness={0.1}
        emissive={color}
        emissiveIntensity={0.4}
        envMapIntensity={2}
      />
    </mesh>
  )
}

function ForceArrow({ position, direction, length, color, label }) {
  const meshRef = useRef()

  const geometry = useMemo(() => createArrowGeometry(Math.max(length, 0.05)), [length])

  const rotation = useMemo(() => {
    const [dx, dy] = direction
    const angle = Math.atan2(dx, dy)
    return [0, 0, -angle]
  }, [direction])

  const labelPosition = useMemo(() => {
    return [position[0] + direction[0] * (length / 2 + 0.3), position[1] + 0.2, position[2] + direction[1] * (length / 2 + 0.3)]
  }, [position, direction, length])

  if (length < 0.02) return null

  return (
    <group position={position}>
      <mesh ref={meshRef} geometry={geometry} rotation={rotation} position={[0, length / 2, 0]}>
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      <FrostedLabel text={label} color={color} position={labelPosition} />
    </group>
  )
}

function BallTrail({ trailPoints }) {
  if (trailPoints.length < 2) return null

  const points = trailPoints.map(p => new THREE.Vector3(p.x, p.y, p.z))

  return (
    <Line
      points={points}
      color="#00ffff"
      lineWidth={2}
      transparent
      opacity={0.6}
    />
  )
}

function Particles({ count = 50, color }) {
  const mesh = useRef()
  const seededRandom = (index, seed = 1) => {
    const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453
    return value - Math.floor(value)
  }
  const particlesRef = useRef(null)
  if (particlesRef.current === null) {
    particlesRef.current = Array.from({ length: count }, (_, i) => ({
      position: new THREE.Vector3(
        (seededRandom(i, 1) - 0.5) * 8,
        seededRandom(i, 2) * 4,
        (seededRandom(i, 3) - 0.5) * 8
      ),
      speed: 0.002 + seededRandom(i, 4) * 0.003,
      offset: seededRandom(i, 5) * Math.PI * 2,
    }))
  }

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const positions = mesh.current.geometry.attributes.position.array
    const time = clock.getElapsedTime()

    particlesRef.current.forEach((particle, i) => {
      const i3 = i * 3
      positions[i3 + 1] = particle.position.y + Math.sin(time * particle.speed * 100 + particle.offset) * 0.5
    })

    mesh.current.geometry.attributes.position.needsUpdate = true
  })

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (seededRandom(i, 1) - 0.5) * 8
      pos[i * 3 + 1] = seededRandom(i, 2) * 4
      pos[i * 3 + 2] = (seededRandom(i, 3) - 0.5) * 8
    }
    return pos
  }, [count])

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color={color}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

function GraphPanel({ mode, mass, angularVelocity, radius, dataHistory }) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const padding = 35

    const draw = () => {
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
      for (let i = 1; i < 5; i++) {
        const x = padding + (width - 2 * padding) * i / 5
        ctx.beginPath()
        ctx.moveTo(x, padding)
        ctx.lineTo(x, height - padding)
        ctx.stroke()
      }

      if (mode === 'angularVelocity') {
        const omegaScale = Math.max(0.1, Math.abs(angularVelocity) * 1.5)
        const avgOmega = dataHistory.length > 0
          ? dataHistory.reduce((sum, d) => sum + (d.omega || angularVelocity), 0) / dataHistory.length
          : angularVelocity

        ctx.fillStyle = '#666'
        ctx.font = '10px monospace'
        ctx.fillText('Angular Velocity vs Time', padding + 5, 18)

        ctx.fillStyle = '#00ff88'
        ctx.font = '9px monospace'
        ctx.fillText(`ω = ${avgOmega.toFixed(2)} rad/s`, width / 2 - 30, height / 2)
        ctx.fillText('(Uniform Circular Motion)', width / 2 - 50, height / 2 + 12)

        ctx.strokeStyle = '#00ff88'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(padding, height - padding - (avgOmega / omegaScale) * (height - 2 * padding))
        ctx.lineTo(width - padding, height - padding - (avgOmega / omegaScale) * (height - 2 * padding))
        ctx.stroke()

        if (dataHistory.length > 1) {
          ctx.strokeStyle = '#00ff88'
          ctx.lineWidth = 1.5
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          dataHistory.slice(-50).forEach((d, i) => {
            const x = padding + (i / 49) * (width - 2 * padding)
            const omega = d.omega || angularVelocity
            const y = height - padding - (omega / omegaScale) * (height - 2 * padding)
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })
          ctx.stroke()
          ctx.setLineDash([])
        }

        ctx.fillStyle = '#888'
        ctx.fillText('t →', width - padding - 20, height - 8)
        ctx.fillText('ω →', padding + 3, padding - 10)
      }

      if (mode === 'centripetalForce') {
        ctx.fillStyle = '#666'
        ctx.font = '10px monospace'
        ctx.fillText('Centripetal Force vs Radius', padding + 5, 18)

        const rValues = []
        const fValues = []

        for (let r = 0.5; r <= 5; r += 0.25) {
          rValues.push(r)
          const Fc = mass * angularVelocity * angularVelocity * r
          fValues.push(Fc)
        }

        const maxF = Math.max(...fValues)
        const minF = 0

        ctx.strokeStyle = '#ff6b35'
        ctx.lineWidth = 2
        ctx.beginPath()
        rValues.forEach((r, i) => {
          const x = padding + (r - 0.5) / 4.5 * (width - 2 * padding)
          const y = height - padding - ((fValues[i] - minF) / (maxF - minF || 1)) * (height - 2 * padding)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()

        ctx.fillStyle = '#ff6b35'
        ctx.font = '9px monospace'
        ctx.fillText(`Fc = mω²r`, width / 2 - 25, 35)
        ctx.fillText(`(varies linearly with r)`, width / 2 - 40, 48)

        const currentFc = mass * angularVelocity * angularVelocity * radius
        const cx = padding + (radius - 0.5) / 4.5 * (width - 2 * padding)
        const cy = height - padding - ((currentFc - minF) / (maxF - minF || 1)) * (height - 2 * padding)

        ctx.fillStyle = '#00ffff'
        ctx.beginPath()
        ctx.arc(cx, cy, 5, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#888'
        ctx.fillText('r →', width - padding - 20, height - 8)
        ctx.fillText('Fc →', padding + 3, padding - 10)
        ctx.fillText('0.5m', padding, height - 5)
        ctx.fillText('5m', width - padding - 15, height - 5)
      }
    }

    draw()

    const id = animationRef.current
    return () => {
      if (id) cancelAnimationFrame(id)
    }
  }, [mode, mass, angularVelocity, radius, dataHistory])

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
  radius,
  mass,
  angularVelocity,
  isPlaying,
  onDataPoint,
  isConicalMode,
  stringCut,
  isBankedCurve,
  bankAngle,
  frictionCoefficient = 0.6,
}) {
  const safeRadius = Math.max(1e-4, Number(radius) || 0)
  const safeMass = Math.max(1e-4, Number(mass) || 0)
  const safeOmega = Number.isFinite(Number(angularVelocity)) ? Number(angularVelocity) : 0
  const safeFrictionCoefficient = Math.max(0, Number(frictionCoefficient) || 0)
  const safeBankAngle = Number.isFinite(Number(bankAngle)) ? Number(bankAngle) : 0

  const [displayPosition, setDisplayPosition] = useState({ x: safeRadius * SCALE, y: 0.15, z: 0 })
  const [displayTrail, setDisplayTrail] = useState([])
  const [displayElapsed, setDisplayElapsed] = useState(0)

  const startTimeRef = useRef(0)
  const pausedTimeRef = useRef(0)
  const lastDataTimeRef = useRef(0)
  const animationRef = useRef(null)
  const isPlayingRef = useRef(isPlaying)
  const stringCutRef = useRef(stringCut)

  const flyingPosRef = useRef({ x: safeRadius * SCALE, y: 0.15, z: 0 })
  const flyingVelRef = useRef({ x: 0, y: 0, z: 0 })
  const trailRef = useRef([])
  const elapsedRef = useRef(0)

  // Circular motion equations in SI units:
  // v = ωr, a_c = v²/r = ω²r, F_c = m a_c, T = 2π/|ω|.
  const tangentialVelocity = safeRadius * safeOmega
  const speed = Math.abs(tangentialVelocity)
  const centripetalAcceleration = safeRadius * safeOmega * safeOmega
  const centripetalForce = safeMass * centripetalAcceleration
  const period = Math.abs(safeOmega) > 1e-9 ? (2 * Math.PI) / Math.abs(safeOmega) : Infinity
  const maxStaticFriction = safeFrictionCoefficient * safeMass * G
  const frictionRequired = centripetalForce
  const frictionIsSufficient = maxStaticFriction + 1e-9 >= frictionRequired
  const normalForce = safeMass * G / Math.max(1e-6, Math.abs(Math.cos(safeBankAngle)))

  const weightlessnessOmega = safeRadius > 1e-9 ? Math.sqrt(G / safeRadius) : Infinity
  const funFact = `Weightlessness at ω = √(g/r) = ${Number.isFinite(weightlessnessOmega) ? weightlessnessOmega.toFixed(2) : '∞'} rad/s`

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    stringCutRef.current = stringCut
  }, [stringCut])

  useEffect(() => {
    flyingPosRef.current = { x: safeRadius * SCALE, y: 0.15, z: 0 }
    flyingVelRef.current = { x: 0, y: 0, z: 0 }
    trailRef.current = []
    pausedTimeRef.current = 0
    startTimeRef.current = 0
    elapsedRef.current = 0
  }, [safeRadius, safeOmega])

  useEffect(() => {
    if (!isPlayingRef.current) {
      if (animationRef.current) {
        const id = animationRef.current
        cancelAnimationFrame(id)
        animationRef.current = null
      }
      return
    }

    if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now() / 1000
    }

    const radiusVal = safeRadius
    const omegaVal = safeOmega
    const massVal = safeMass
    const speedVal = Math.abs(radiusVal * omegaVal)
    const caVal = radiusVal * omegaVal * omegaVal
    const cfVal = massVal * caVal
    const callback = onDataPoint

    const update = () => {
      const currentTime = performance.now() / 1000
      const elapsedVal = pausedTimeRef.current + (startTimeRef.current > 0 ? currentTime - startTimeRef.current : 0)
      elapsedRef.current = elapsedVal
      setDisplayElapsed(elapsedVal)

      if (stringCutRef.current) {
        const dt = 0.016
        const newX = flyingPosRef.current.x + flyingVelRef.current.x * dt
        const newY = Math.max(0.15, flyingPosRef.current.y + flyingVelRef.current.y * dt - 0.5 * G * dt * dt)
        const newZ = flyingPosRef.current.z + flyingVelRef.current.z * dt

        flyingPosRef.current = { x: newX, y: newY, z: newZ }
        flyingVelRef.current = {
          x: flyingVelRef.current.x,
          y: flyingVelRef.current.y - G * dt,
          z: flyingVelRef.current.z,
        }

        trailRef.current = [...trailRef.current.slice(-199), { x: newX, y: newY, z: newZ }]
        setDisplayPosition({ x: newX, y: newY, z: newZ })
        setDisplayTrail([...trailRef.current])
      } else {
        const angle = omegaVal * elapsedVal
        const x = radiusVal * SCALE * Math.cos(angle)
        const z = radiusVal * SCALE * Math.sin(angle)
        const pos = { x, y: 0.15, z }

        flyingPosRef.current = pos
        setDisplayPosition(pos)

        if (currentTime - lastDataTimeRef.current > 0.05) {
          trailRef.current = [...trailRef.current.slice(-199), pos]
          setDisplayTrail([...trailRef.current])

          callback?.({
            t_s: elapsedVal,
            angle,
            speed_mps: speedVal,
            speed: speedVal,
            centripetalAcceleration_mps2: caVal,
            centripetalAcceleration: caVal,
            centripetalForce_N: cfVal,
            centripetalForce: cfVal,
            radius_m: radiusVal,
            radius: radiusVal,
            omega_radps: omegaVal,
            omega: omegaVal,
            period_s: period,
            centripetalAccelerationVector_mps2: { x: caVal * (-Math.cos(angle)), y: 0, z: caVal * (-Math.sin(angle)) },
            centripetalForceVector_N: { x: cfVal * (-Math.cos(angle)), y: 0, z: cfVal * (-Math.sin(angle)) },
            frictionCheck: {
              mu: safeFrictionCoefficient,
              maxStaticFriction_N: maxStaticFriction,
              requiredFriction_N: frictionRequired,
              isSufficient: frictionIsSufficient,
            },
          })
          lastDataTimeRef.current = currentTime
        }
      }

      if (isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(update)
      }
    }

    animationRef.current = requestAnimationFrame(update)
    return () => {
      const id = animationRef.current
      if (id) cancelAnimationFrame(id)
    }
  }, [safeRadius, safeOmega, safeMass, onDataPoint, period, safeFrictionCoefficient, maxStaticFriction, frictionRequired, frictionIsSufficient])

  const tiltAngle = isConicalMode ? Math.atan2(centripetalAcceleration, G) : 0

  const currentPos = displayPosition

  const centripetalDir = useMemo(() => {
    if (stringCut) return [0, 0]
    const angle = safeOmega * displayElapsed
    const cx = -Math.cos(angle)
    const cz = -Math.sin(angle)
    return [cx, cz]
  }, [displayElapsed, safeOmega, stringCut])

  const tangentDir = useMemo(() => {
    const angle = safeOmega * displayElapsed
    const directionSign = safeOmega >= 0 ? 1 : -1
    return [directionSign * -Math.sin(angle), directionSign * Math.cos(angle)]
  }, [displayElapsed, safeOmega])

  const arrowScale = Math.min(centripetalForce * 0.02, 0.6)
  const velocityScale = Math.min(speed * 0.1, 0.5)

  if (isConicalMode) {
    const conicalBallAngle = safeOmega * displayElapsed
    const horizontalR = safeRadius * SCALE * Math.cos(tiltAngle)
    const verticalDrop = safeRadius * SCALE * Math.sin(tiltAngle)
    const ballX = horizontalR * Math.cos(conicalBallAngle)
    const ballZ = horizontalR * Math.sin(conicalBallAngle)
    const ballY = 2.5 - verticalDrop

    return (
      <>
        <ambientLight intensity={0.15} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} color="#ffffff" castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.8} color="#ff8800" />
        <pointLight position={[5, 3, 5]} intensity={0.5} color="#00f5ff" />

        <Environment preset="city" />

        <group>
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.3, 16]} />
            <meshPhysicalMaterial color="#445566" metalness={0.9} roughness={0.2} clearcoat={0.8} />
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 3, 64]} />
            <meshPhysicalMaterial color="#1a2a3a" side={THREE.DoubleSide} transparent opacity={0.7} metalness={0.5} roughness={0.3} />
          </mesh>

          <mesh position={[ballX, 2.5, ballZ]}>
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(0.02, verticalDrop, 0.02)]} />
              <lineBasicMaterial color="#666666" />
            </lineSegments>
          </mesh>

          <mesh position={[ballX, ballY, ballZ]}>
            <sphereGeometry args={[BALL_SIZE, 32, 32]} />
            <meshPhysicalMaterial color="#ff8800" metalness={0.8} roughness={0.15} clearcoat={1} emissive="#ff4400" emissiveIntensity={0.5} />
          </mesh>
        </group>

        <FrostedLabel text={`ω = ${safeOmega.toFixed(2)} rad/s`} color="#ffff00" position={[-2, 3, 0]} />
        <FrostedLabel text={`r = ${safeRadius.toFixed(1)} m`} color="#88ff88" position={[-2, 2.6, 0]} />
        <FrostedLabel text={`v = ${speed.toFixed(2)} m/s`} color="#00ffff" position={[1.5, 3, 0]} />
        <FrostedLabel text={`Fc = ${centripetalForce.toFixed(1)} N`} color="#ff4444" position={[1.5, 2.6, 0]} />
        <FrostedLabel text={funFact} color="#ff88ff" position={[0, 0.5, 0]} />

        <Particles count={30} color="#00f5ff" />

        <fog attach="fog" args={['#0a0f1e', 8, 20]} />
      </>
    )
  }

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} color="#ffffff" castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.8} color="#ff4444" />
      <pointLight position={[5, 3, 5]} intensity={0.5} color="#00f5ff" />
      <spotLight position={[0, 8, 0]} intensity={0.6} color="#ffffff" angle={0.5} penumbra={0.5} />

      <Environment preset="city" />

      <Grid
        position={[0, -0.01, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1a2a3a"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#00f5ff"
        fadeDistance={15}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      {isBankedCurve && (
        <group rotation={[0, 0, 0]}>
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[safeRadius * SCALE - 0.5, safeRadius * SCALE + 0.5, 64]} />
            <meshPhysicalMaterial color="#ffaa00" transparent opacity={0.3} side={THREE.DoubleSide} emissive="#ffaa00" emissiveIntensity={0.2} />
          </mesh>
        </group>
      )}

      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[safeRadius * SCALE - 0.1, safeRadius * SCALE + 0.1, 64]} />
        <meshBasicMaterial color="#00f5ff" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>

      <CircularTrack radius={safeRadius} />
      <Ball position={[currentPos.x, currentPos.y, currentPos.z]} color={stringCut ? '#ff8800' : '#00f5ff'} />
      <BallTrail trailPoints={displayTrail} />

      {!stringCut && (
        <>
          <ForceArrow
            position={[currentPos.x + centripetalDir[0] * 0.3, currentPos.y + 0.1, currentPos.z + centripetalDir[1] * 0.3]}
            direction={centripetalDir}
            length={arrowScale}
            color="#ff4444"
            label={`Fc=${centripetalForce.toFixed(1)}N`}
          />
          <ForceArrow
            position={[currentPos.x + tangentDir[0] * 0.3, currentPos.y + 0.3, currentPos.z + tangentDir[1] * 0.3]}
            direction={tangentDir}
            length={velocityScale}
            color="#00ffff"
            label={`v=${speed.toFixed(1)}m/s`}
          />
          {isBankedCurve && (
            <ForceArrow
              position={[currentPos.x, currentPos.y + 0.5, currentPos.z]}
              direction={[0, 1]}
              length={0.4}
              color="#ffff00"
              label={`N=${normalForce.toFixed(1)}N`}
            />
          )}
        </>
      )}

      <FrostedLabel text={`v = ${speed.toFixed(2)} m/s`} color="#00ffff" position={[-2.5, 0.9, 0]} />
      <FrostedLabel text={`Fc = ${centripetalForce.toFixed(1)} N`} color="#ff4444" position={[-2.5, 0.6, 0]} />
      <FrostedLabel text={`ω = ${safeOmega.toFixed(2)} rad/s`} color="#ffff00" position={[1.5, 0.9, 0]} />
      <FrostedLabel text={`r = ${safeRadius.toFixed(1)} m`} color="#88ff88" position={[1.5, 0.6, 0]} />
      {isBankedCurve && (
        <FrostedLabel text={`N = ${normalForce.toFixed(1)} N`} color="#ffff00" position={[0, 0.9, 0]} />
      )}
      <FrostedLabel text={funFact} color="#ff88ff" position={[0, -0.4, 0]} />

      <Particles count={50} color="#00f5ff" />

      <fog attach="fog" args={['#0a0f1e', 10, 25]} />
    </>
  )
}

function MiniMap({ radius, ballPosition, isPlaying, angularVelocity, stringCut }) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const timeRef = useRef(0)

  useEffect(() => {
    if (isPlaying && !stringCut) {
      timeRef.current += 0.016
    }
  }, [isPlaying, stringCut])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const size = 120
    canvas.width = size
    canvas.height = size

    const draw = () => {
      ctx.clearRect(0, 0, size, size)

      ctx.fillStyle = 'rgba(10, 15, 30, 0.9)'
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#334455'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, (radius * SCALE * (size / 2 - 10)) / (radius * SCALE + 1), 0, Math.PI * 2)
      ctx.stroke()

      let px, pz
      if (stringCut) {
        px = ballPosition.x
        pz = ballPosition.z
      } else {
        const angle = angularVelocity * timeRef.current
        px = radius * SCALE * Math.cos(angle)
        pz = radius * SCALE * Math.sin(angle)
      }

      const mapScale = (size / 2 - 15) / (radius * SCALE + 0.5)
      const dotX = size / 2 + px * mapScale
      const dotY = size / 2 - pz * mapScale

      ctx.fillStyle = stringCut ? '#ff8800' : '#00f5ff'
      ctx.beginPath()
      ctx.arc(dotX, dotY, 6, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = '10px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('TOP VIEW', size / 2, 12)

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(draw)
      }
    }

    draw()
    return () => {
      const id = animationRef.current
      if (id) cancelAnimationFrame(id)
    }
  }, [radius, ballPosition, isPlaying, angularVelocity, stringCut])

  return (
    <canvas
      ref={canvasRef}
      className="absolute bottom-4 right-4 rounded-lg border border-[rgba(0,245,255,0.3)] bg-[#0a0f1e]/90"
      style={{ width: 120, height: 120 }}
    />
  )
}

export default function CircularMotion(rawProps) {
  const {
    radius = 2,
    mass = 1,
    angularVelocity = 2,
    frictionCoefficient = 0.6,
    isPlaying = false,
    onDataPoint,
  } = useSanitizedProps(rawProps)
  const [isConicalMode, setIsConicalMode] = useState(false)
  const [isBankedCurve, setIsBankedCurve] = useState(false)
  const [stringCut, setStringCut] = useState(false)
  const safeRadius = Math.max(1e-4, Number(radius) || 0)
  const safeMass = Math.max(1e-4, Number(mass) || 0)
  const safeOmega = Number.isFinite(Number(angularVelocity)) ? Number(angularVelocity) : 0
  const safeFrictionCoefficient = Math.max(0, Number(frictionCoefficient) || 0)
  const [ballPosition, setBallPosition] = useState({ x: safeRadius * SCALE, y: 0.15, z: 0 })
  const [dataHistory, setDataHistory] = useState([])
  const [graphMode, setGraphMode] = useState('angularVelocity')

  const bankAngle = isBankedCurve ? Math.atan2(safeOmega * safeOmega * safeRadius, G) : 0

  const handleDataUpdate = useCallback((data) => {
    setDataHistory(prev => {
      const newHistory = [...prev, data]
      if (newHistory.length > 200) return newHistory.slice(-200)
      return newHistory
    })
  }, [])

  useEffect(() => {
    if (onDataPoint) {
      const latest = dataHistory[dataHistory.length - 1]
      if (latest) {
        onDataPoint(latest)
      }
    }
  }, [dataHistory, onDataPoint])

  const handleCutString = useCallback(() => {
    setBallPosition({ x: safeRadius * SCALE, y: 0.15, z: 0 })
    setStringCut(true)
  }, [safeRadius])

  const handleReset = useCallback(() => {
    setStringCut(false)
    setDataHistory([])
    setBallPosition({ x: safeRadius * SCALE, y: 0.15, z: 0 })
  }, [safeRadius])

  const handleToggleMode = useCallback(() => {
    setIsConicalMode(prev => !prev)
    setIsBankedCurve(false)
    setStringCut(false)
    setDataHistory([])
  }, [])

  const handleToggleBanked = useCallback(() => {
    setIsBankedCurve(prev => !prev)
    setIsConicalMode(false)
    setStringCut(false)
    setDataHistory([])
  }, [])

  const speed = Math.abs(safeRadius * safeOmega)
  const centripetalAcceleration = safeRadius * safeOmega * safeOmega
  const centripetalForce = safeMass * centripetalAcceleration

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
        camera={{ position: [0, 5, 8], fov: 50 }}
        style={{ width: '100%', height: '100%', background: '#0a0f1e' }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }}
      >
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={3}
          maxDistance={15}
          maxPolarAngle={Math.PI / 2}
          autoRotate={!isPlaying}
          autoRotateSpeed={0.18}
        />

        <SimulationScene
          radius={safeRadius}
          mass={safeMass}
          angularVelocity={safeOmega}
          isPlaying={isPlaying}
          onDataPoint={handleDataUpdate}
          isConicalMode={isConicalMode}
          stringCut={stringCut}
          isBankedCurve={isBankedCurve}
          bankAngle={bankAngle}
          frictionCoefficient={safeFrictionCoefficient}
        />

        <EffectComposer>
          <Bloom
            intensity={0.4}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette
            offset={0.3}
            darkness={0.6}
          />
        </EffectComposer>
      </Canvas>

      <MiniMap
        radius={safeRadius}
        ballPosition={ballPosition}
        isPlaying={isPlaying}
        angularVelocity={safeOmega}
        stringCut={stringCut}
      />

      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        {!isConicalMode && !isBankedCurve && (
          <button
            onClick={handleCutString}
            disabled={stringCut}
            className="rounded-full border border-[rgba(255,68,68,0.5)] bg-[rgba(255,68,68,0.15)] px-4 py-2 font-mono-display text-xs uppercase tracking-wider text-[#ff4444] transition hover:bg-[rgba(255,68,68,0.25)] disabled:opacity-40"
          >
            Cut the String
          </button>
        )}

        {(stringCut || !isPlaying) && (
          <button
            onClick={handleReset}
            className="rounded-full border border-[rgba(0,245,255,0.5)] bg-[rgba(0,245,255,0.15)] px-4 py-2 font-mono-display text-xs uppercase tracking-wider text-[#00f5ff] transition hover:bg-[rgba(0,245,255,0.25)]"
          >
            Reset
          </button>
        )}
      </div>

      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <button
          onClick={handleToggleMode}
          className={`rounded-full border px-4 py-2 font-mono-display text-xs uppercase tracking-wider transition ${
            isConicalMode
              ? 'border-[rgba(255,136,0,0.5)] bg-[rgba(255,136,0,0.2)] text-[#ff8800]'
              : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
          }`}
        >
          {isConicalMode ? '↩️ Circular Motion' : '🔄 Conical Pendulum'}
        </button>

        {!isConicalMode && (
          <button
            onClick={handleToggleBanked}
            className={`rounded-full border px-4 py-2 font-mono-display text-xs uppercase tracking-wider transition ${
              isBankedCurve
                ? 'border-[rgba(255,170,0,0.5)] bg-[rgba(255,170,0,0.2)] text-[#ffaa00]'
                : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
            }`}
          >
            {isBankedCurve ? '↩️ Normal Track' : '📐 Banked Curve'}
          </button>
        )}
      </div>

      {isConicalMode && (
        <div className="absolute left-4 top-20 rounded-full border border-[rgba(255,136,0,0.5)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#ff8800]">
          θ = tan⁻¹(ω²r/g) = {(Math.atan2(safeOmega * safeOmega * safeRadius, G) * 180 / Math.PI).toFixed(1)}°
        </div>
      )}

      {isBankedCurve && (
        <div className="absolute left-4 top-20 rounded-full border border-[rgba(255,170,0,0.5)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#ffaa00]">
          Bank Angle: {(bankAngle * 180 / Math.PI).toFixed(1)}°
        </div>
      )}

      {stringCut && (
        <div className="absolute right-4 top-4 rounded-full border border-[rgba(255,136,0,0.5)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#ff8800]">
          Ball flying off tangentially!
        </div>
      )}

      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <div className="rounded-lg border border-[rgba(0,245,255,0.3)] bg-[rgba(10,15,30,0.9)] p-3">
          <div className="mb-2 font-mono-display text-xs text-slate-400">LIVE DATA</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono-display text-[10px]">
            <span className="text-[#00ffff]">v:</span>
            <span className="text-white">{speed.toFixed(2)} m/s</span>
            <span className="text-[#ff4444]">Fc:</span>
            <span className="text-white">{centripetalForce.toFixed(2)} N</span>
            <span className="text-[#88ff88]">aᶜ:</span>
            <span className="text-white">{centripetalAcceleration.toFixed(2)} m/s²</span>
            <span className="text-[#ffff00]">ω:</span>
            <span className="text-white">{safeOmega.toFixed(2)} rad/s</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-20 left-4">
        <div className="mb-2 font-mono-display text-xs text-slate-400">
          GRAPH: {graphMode === 'angularVelocity' ? 'ω vs Time' : 'Fc vs Radius'}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setGraphMode('angularVelocity')}
              className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
                graphMode === 'angularVelocity'
                  ? 'bg-[rgba(0,255,136,0.2)] text-[#00ff88]'
                  : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
              }`}
            >
              ω vs t
            </button>
            <button
              onClick={() => setGraphMode('centripetalForce')}
              className={`rounded px-3 py-1 font-mono-display text-[10px] transition ${
                graphMode === 'centripetalForce'
                  ? 'bg-[rgba(255,107,53,0.2)] text-[#ff6b35]'
                  : 'bg-[rgba(50,50,50,0.3)] text-slate-500'
              }`}
            >
              Fc vs r
            </button>
          </div>
          <GraphPanel
            mode={graphMode}
            mass={safeMass}
            angularVelocity={safeOmega}
            radius={safeRadius}
            dataHistory={dataHistory}
          />
        </div>
      </div>

      <div className="absolute right-4 bottom-4 rounded-lg border border-[rgba(255,136,0,0.3)] bg-[rgba(10,15,30,0.9)] p-3">
        <div className="mb-2 font-mono-display text-xs text-[#ffaa00]">FORCE LEGEND</div>
        <div className="space-y-1 font-mono-display text-[10px]">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#ff4444]" />
            <span className="text-[#ff4444]">Centripetal Force</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#00ffff]" />
            <span className="text-[#00ffff]">Velocity (tangent)</span>
          </div>
          {isBankedCurve && (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#ffff00]" />
              <span className="text-[#ffff00]">Normal Force</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

CircularMotion.getSceneConfig = (variables = {}) => {
  const { radius = 2, mass = 1, angularVelocity = 2, frictionCoefficient = 0.6 } = variables
  const safeRadius = Math.max(1e-4, Number(radius) || 0)
  const safeMass = Math.max(1e-4, Number(mass) || 0)
  const safeOmega = Number.isFinite(Number(angularVelocity)) ? Number(angularVelocity) : 0
  const safeFrictionCoefficient = Math.max(0, Number(frictionCoefficient) || 0)
  const speed = Math.abs(safeRadius * safeOmega)
  const centripetalAcceleration = safeRadius * safeOmega * safeOmega
  const centripetalForce = safeMass * centripetalAcceleration
  const period = Math.abs(safeOmega) > 1e-9 ? (2 * Math.PI) / Math.abs(safeOmega) : Infinity
  const weightlessnessOmega = safeRadius > 1e-9 ? Math.sqrt(G / safeRadius) : Infinity
  const maxStaticFriction = safeFrictionCoefficient * safeMass * G

  return {
    name: 'Circular Motion',
    description: 'Uniform circular motion with centripetal force analysis',
    type: 'circular_motion',
    physics: {
      radius: safeRadius,
      mass: safeMass,
      angularVelocity: safeOmega,
      speed,
      centripetalAcceleration,
      centripetalForce,
      weightlessnessOmega,
      period,
      frictionCoefficient: safeFrictionCoefficient,
    },
    calculations: {
      centripetalForce: `Fc = mv²/r = ${centripetalForce.toFixed(2)} N`,
      centripetalAccel: `ac = v²/r = ${centripetalAcceleration.toFixed(2)} m/s²`,
      period: `T = 2π/|ω| = ${Number.isFinite(period) ? period.toFixed(2) : '∞'} s`,
      frictionCheck: `μmg ${maxStaticFriction >= centripetalForce ? '≥' : '<'} mv²/r (${maxStaticFriction.toFixed(2)} ${maxStaticFriction >= centripetalForce ? '≥' : '<'} ${centripetalForce.toFixed(2)} N)`,
      weightlessnessCondition: `ω = √(g/r) = ${Number.isFinite(weightlessnessOmega) ? weightlessnessOmega.toFixed(2) : '∞'} rad/s`,
    },
  }
}
