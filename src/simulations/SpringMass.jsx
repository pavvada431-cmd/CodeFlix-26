import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

const G = 9.81
const CEILING_Y = 2.5
const CEILING_THICKNESS = 0.15
const CEILING_WIDTH = 3
const MASS_SIZE = 0.5
const SPRING_RADIUS = 0.12
const SPRING_TURNS = 20
const SPRING_SEGMENTS = 200
const NATURAL_LENGTH = 1.5

function createSpringGeometry(currentLength, turns, segments) {
  const geometry = new THREE.BufferGeometry()
  const vertices = []
  const radialSegments = 8

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const angle = t * turns * Math.PI * 2
    const y = t * currentLength
    const x = Math.cos(angle) * SPRING_RADIUS
    const z = Math.sin(angle) * SPRING_RADIUS

    vertices.push(x, y, z)

    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2
      const px = x + Math.cos(theta) * 0.025
      const pz = z + Math.sin(theta) * 0.025
      vertices.push(px, y, pz)
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.computeVertexNormals()
  return geometry
}

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

function SpringGeometry({ currentLength }) {
  const meshRef = useRef()

  const geometry = useMemo(() => {
    return createSpringGeometry(currentLength, SPRING_TURNS, SPRING_SEGMENTS)
  }, [currentLength])

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.geometry.dispose()
      meshRef.current.geometry = geometry
    }
  }, [geometry])

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, CEILING_Y - CEILING_THICKNESS / 2, 0]}>
      <meshStandardMaterial color="#aabbcc" metalness={0.8} roughness={0.2} />
    </mesh>
  )
}

function MassBlock({ position }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[MASS_SIZE, MASS_SIZE, MASS_SIZE]} />
      <meshStandardMaterial color="#00f5ff" metalness={0.6} roughness={0.3} />
    </mesh>
  )
}

function Ceiling() {
  return (
    <group>
      <mesh position={[0, CEILING_Y, 0]}>
        <boxGeometry args={[CEILING_WIDTH, CEILING_THICKNESS, 1]} />
        <meshStandardMaterial color="#445566" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-1.2, CEILING_Y, 0]}>
        <boxGeometry args={[0.15, 0.6, 0.3]} />
        <meshStandardMaterial color="#556677" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[1.2, CEILING_Y, 0]}>
        <boxGeometry args={[0.15, 0.6, 0.3]} />
        <meshStandardMaterial color="#556677" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

function ForceArrow({ position, direction, length, color, label }) {
  const meshRef = useRef()
  const [showLabel, setShowLabel] = useState(false)

  const geometry = useMemo(() => createArrowGeometry(Math.max(length, 0.05)), [length])

  const rotation = useMemo(() => {
    const [dx, dy] = direction
    const angle = Math.atan2(dx, dy)
    return [0, 0, -angle]
  }, [direction])

  const texture = useMemo(() => createLabelTexture(label, color), [label, color])

  useEffect(() => {
    setShowLabel(length > 0.05)
  }, [length])

  if (!showLabel || length < 0.02) return null

  return (
    <group position={position}>
      <mesh ref={meshRef} geometry={geometry} rotation={rotation} position={[0, length / 2, 0]}>
        <meshStandardMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <sprite scale={[0.8, 0.2, 1]} position={[0.4, length / 2 + 0.1, 0]}>
        <spriteMaterial map={texture} transparent />
      </sprite>
    </group>
  )
}

function SimulationScene({
  springConstant,
  mass,
  initialDisplacement,
  damping,
  isPlaying,
  onDataPoint,
  resonanceMode,
  onResonanceEnd,
}) {
  const [currentDisplacement, setCurrentDisplacement] = useState(initialDisplacement)
  const [currentVelocity, setCurrentVelocity] = useState(0)
  const startTimeRef = useRef(0)
  const pausedTimeRef = useRef(0)
  const lastDataTimeRef = useRef(0)
  const animationRef = useRef(null)
  const isPlayingRef = useRef(isPlaying)
  const resonanceModeRef = useRef(resonanceMode)

  const omega = useMemo(() => Math.sqrt(springConstant / mass), [springConstant, mass])
  const omegaD = useMemo(() => omega * Math.sqrt(1 - (damping * damping) / (4 * mass * mass)), [omega, damping, mass])
  const period = 2 * Math.PI / omega

  useEffect(() => {
    isPlayingRef.current = isPlaying
    resonanceModeRef.current = resonanceMode
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now() / 1000
    }

    const A = initialDisplacement
    const b = damping
    const m = mass
    const k = springConstant
    const omegaVal = omega
    const omegaDVal = omegaD

    const update = () => {
      const currentTime = performance.now() / 1000
      const elapsed = pausedTimeRef.current + (startTimeRef.current > 0 ? currentTime - startTimeRef.current : 0)

      let displacement, velocity

      if (resonanceModeRef.current) {
        const drivingAmplitude = 0.3
        const envelope = Math.min(1, elapsed / 5)
        displacement = drivingAmplitude * envelope * Math.sin(omegaVal * elapsed)
        velocity = drivingAmplitude * envelope * omegaVal * Math.cos(omegaVal * elapsed)

        if (elapsed > 8) {
          onResonanceEnd?.()
        }
      } else if (b === 0) {
        displacement = A * Math.cos(omegaVal * elapsed)
        velocity = -A * omegaVal * Math.sin(omegaVal * elapsed)
      } else {
        const expFactor = Math.exp(-b * elapsed / (2 * m))
        displacement = A * expFactor * Math.cos(omegaDVal * elapsed)
        velocity = -A * expFactor * (
          (b / (2 * m)) * Math.cos(omegaDVal * elapsed) +
          omegaDVal * Math.sin(omegaDVal * elapsed)
        )
      }

      setCurrentDisplacement(displacement)
      setCurrentVelocity(velocity)

      if (currentTime - lastDataTimeRef.current > 0.05) {
        const ke = 0.5 * m * velocity * velocity
        const pe = 0.5 * k * displacement * displacement
        const te = resonanceModeRef.current ? ke + pe : 0.5 * k * A * A

        onDataPoint?.({
          t: elapsed,
          displacement,
          velocity,
          kineticEnergy: ke,
          potentialEnergy: pe,
          totalEnergy: te,
        })
        lastDataTimeRef.current = currentTime
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
  }, [isPlaying, initialDisplacement, springConstant, mass, damping, resonanceMode, omega, omegaD, onResonanceEnd, onDataPoint])

  const springLength = NATURAL_LENGTH + currentDisplacement
  const massY = CEILING_Y - CEILING_THICKNESS / 2 - springLength - MASS_SIZE / 2
  const massCenter = [0, massY, 0]

  const springForce = springConstant * currentDisplacement
  const gravityForce = mass * G
  const netForce = -springForce - gravityForce

  const springArrowLength = Math.min(Math.abs(springForce) * 0.1, 0.8)
  const gravityArrowLength = Math.min(gravityForce * 0.1, 0.8)

  const springDir = currentDisplacement > 0 ? [0, -1] : [0, 1]
  const gravityDir = [0, -1]
  const netDir = netForce > 0 ? [0, 1] : [0, -1]
  const netArrowLength = Math.min(Math.abs(netForce) * 0.15, 0.6)

  const amplitudeTexture = useMemo(() => createLabelTexture(`A = ${initialDisplacement.toFixed(2)} m`, '#ffff00'), [initialDisplacement])
  const freqTexture = useMemo(() => createLabelTexture(`ω₀ = ${omega.toFixed(2)} rad/s`, '#00ff88'), [omega])
  const periodTexture = useMemo(() => createLabelTexture(`T = ${period.toFixed(2)} s`, '#ff88ff'), [period])
  const energyTexture = useMemo(() => {
    const ke = 0.5 * mass * currentVelocity * currentVelocity
    const pe = 0.5 * springConstant * currentDisplacement * currentDisplacement
    return createLabelTexture(`KE: ${ke.toFixed(2)}J  PE: ${pe.toFixed(2)}J`, '#88ffff')
  }, [currentVelocity, currentDisplacement, mass, springConstant])

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <pointLight position={[0, CEILING_Y + 1, 2]} intensity={0.5} color="#00f5ff" />

      <Ceiling />
      <SpringGeometry currentLength={springLength} />
      <MassBlock position={massCenter} />

      <ForceArrow
        position={[massCenter[0] + MASS_SIZE / 2 + 0.1, massCenter[1], massCenter[2]]}
        direction={springDir}
        length={springArrowLength}
        color="#00ffff"
        label={`Fs = ${springForce.toFixed(1)}N`}
      />
      <ForceArrow
        position={[massCenter[0] - MASS_SIZE / 2 - 0.1, massCenter[1], massCenter[2]]}
        direction={gravityDir}
        length={gravityArrowLength}
        color="#ff4444"
        label={`Fg = ${gravityForce.toFixed(1)}N`}
      />
      <ForceArrow
        position={[massCenter[0], massCenter[1] + MASS_SIZE / 2 + 0.1, massCenter[2]]}
        direction={netDir}
        length={netArrowLength}
        color="#44ff44"
        label={`Fnet = ${Math.abs(netForce).toFixed(1)}N`}
      />

      <sprite scale={[1, 0.25, 1]} position={[-1.5, CEILING_Y + 0.5, 0]}>
        <spriteMaterial map={amplitudeTexture} transparent />
      </sprite>
      <sprite scale={[1, 0.25, 1]} position={[-1.5, CEILING_Y + 0.2, 0]}>
        <spriteMaterial map={freqTexture} transparent />
      </sprite>
      <sprite scale={[1, 0.25, 1]} position={[-1.5, CEILING_Y - 0.1, 0]}>
        <spriteMaterial map={periodTexture} transparent />
      </sprite>
      <sprite scale={[1.2, 0.25, 1]} position={[1.5, massY + 1, 0]}>
        <spriteMaterial map={energyTexture} transparent />
      </sprite>

      <mesh position={[0, CEILING_Y - CEILING_THICKNESS / 2 - springLength, 0]} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.08, 0.12, 16]} />
        <meshStandardMaterial color="#00f5ff" transparent opacity={0.6} />
      </mesh>
    </>
  )
}

export default function SpringMass({
  springConstant = 50,
  mass = 2,
  initialDisplacement = 0.5,
  damping = 0,
  isPlaying = false,
  onDataPoint,
}) {
  const [resonanceMode, setResonanceMode] = useState(false)
  const [showResonanceBtn, setShowResonanceBtn] = useState(true)

  const handleResonanceEnd = useCallback(() => {
    setResonanceMode(false)
    setShowResonanceBtn(true)
  }, [])

  const toggleResonance = useCallback(() => {
    setResonanceMode(prev => !prev)
    setShowResonanceBtn(false)
  }, [])

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 50 }}
        style={{ background: '#0a0f1e' }}
      >
        <SimulationScene
          springConstant={springConstant}
          mass={mass}
          initialDisplacement={initialDisplacement}
          damping={damping}
          isPlaying={isPlaying}
          onDataPoint={onDataPoint}
          resonanceMode={resonanceMode}
          onResonanceEnd={handleResonanceEnd}
        />
      </Canvas>

      {showResonanceBtn && (
        <button
          onClick={toggleResonance}
          className="absolute bottom-4 right-4 rounded-full border border-[rgba(255,136,0,0.5)] bg-[rgba(255,136,0,0.15)] px-4 py-2 font-mono-display text-xs uppercase tracking-wider text-[#ff8800] transition hover:bg-[rgba(255,136,0,0.25)]"
        >
          Resonance Demo
        </button>
      )}

      {resonanceMode && (
        <div className="absolute left-4 top-4 rounded-full border border-[rgba(255,136,0,0.5)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs uppercase tracking-wider text-[#ff8800]">
          Driving at ω₀
        </div>
      )}
    </div>
  )
}

SpringMass.getSceneConfig = (variables = {}) => {
  const { springConstant = 50, mass = 2, initialDisplacement = 0.5 } = variables
  const omega = Math.sqrt(springConstant / mass)

  return {
    name: 'Spring-Mass System',
    description: 'Simple harmonic motion with damped oscillation',
    type: 'spring_mass',
    physics: {
      springConstant,
      mass,
      initialDisplacement,
      naturalFrequency: omega / (2 * Math.PI),
      angularFrequency: omega,
      period: 2 * Math.PI / omega,
    },
    calculations: {
      potentialEnergy: `PE = ½kA² = ${(0.5 * springConstant * initialDisplacement * initialDisplacement).toFixed(2)} J`,
      kineticEnergy: 'KE = ½mv²',
      period: `T = 2π√(m/k) = ${(2 * Math.PI * Math.sqrt(mass / springConstant)).toFixed(2)} s`,
      frequency: `f = 1/T = ${(1 / (2 * Math.PI * Math.sqrt(mass / springConstant))).toFixed(2)} Hz`,
    },
  }
}
