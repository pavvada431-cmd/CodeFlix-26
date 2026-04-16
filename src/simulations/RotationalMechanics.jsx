import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

const G = 9.81

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

function calculateMomentOfInertia(objectType, mass, radius) {
  switch (objectType) {
    case 'disk':
      return 0.5 * mass * radius * radius
    case 'rod':
      return (1 / 3) * mass * (2 * radius) * (2 * radius)
    case 'ring':
      return mass * radius * radius
    case 'sphere':
      return (2 / 5) * mass * radius * radius
    default:
      return mass * radius * radius
  }
}

function getInertiaLabel(objectType) {
  switch (objectType) {
    case 'disk': return 'I = ½MR²'
    case 'rod': return 'I = ⅓ML²'
    case 'ring': return 'I = MR²'
    case 'sphere': return 'I = ⅖MR²'
    default: return 'I = MR²'
  }
}

function getInertiaValue(objectType, mass, radius) {
  return calculateMomentOfInertia(objectType, mass, radius).toFixed(3)
}

function createCurvedArrowGeometry(radius, arcAngle) {
  const points = []
  const segments = 32

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * arcAngle
    points.push(new THREE.Vector3(
      radius * Math.cos(angle),
      radius * Math.sin(angle),
      0
    ))
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  return geometry
}

function ForceArrow({ position, direction, length, color, label }) {
  const meshRef = useRef()

  const arrowGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    const hw = 0.05
    shape.moveTo(0, length)
    shape.lineTo(-hw, length - 0.15)
    shape.lineTo(-hw * 0.4, length - 0.15)
    shape.lineTo(-hw * 0.4, 0)
    shape.lineTo(hw * 0.4, 0)
    shape.lineTo(hw * 0.4, length - 0.15)
    shape.lineTo(hw, length - 0.15)
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false })
  }, [length])

  const rotation = useMemo(() => {
    const angle = Math.atan2(direction[1], direction[0])
    return [0, 0, -angle - Math.PI / 2]
  }, [direction])

  const texture = useMemo(() => createLabelTexture(label, color), [label, color])

  if (length < 0.05) return null

  return (
    <group position={position}>
      <mesh ref={meshRef} geometry={arrowGeometry} rotation={rotation} position={[0, 0, 0.05]}>
        <meshStandardMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <sprite scale={[0.8, 0.2, 1]} position={[direction[0] * (length / 2 + 0.3), direction[1] * (length / 2 + 0.3), 0.2]}>
        <spriteMaterial map={texture} transparent />
      </sprite>
    </group>
  )
}

function TorqueArrow({ radius, angle, direction, color }) {
  const arcGeometry = useMemo(() => createCurvedArrowGeometry(radius, Math.PI / 3), [radius])

  const rotation = direction > 0 ? [0, 0, angle] : [0, 0, angle + Math.PI]

  return (
    <group position={[0, 0, 0.2]}>
      <mesh geometry={arcGeometry} rotation={rotation}>
        <meshBasicMaterial color={color} linewidth={3} />
      </mesh>
      <sprite scale={[0.6, 0.15, 1]} position={[radius * 0.7, radius * 0.7, 0.1]}>
        <spriteMaterial map={createLabelTexture('τ', color)} transparent />
      </sprite>
    </group>
  )
}

function AngularMomentumArrow({ magnitude, color }) {
  const length = Math.min(magnitude * 0.5, 2)

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0, length / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, length, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0, length]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.2, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <sprite scale={[1, 0.25, 1]} position={[0.3, 0.3, length]}>
        <spriteMaterial map={createLabelTexture('L', color)} transparent />
      </sprite>
    </group>
  )
}

function AngularVelocityDial({ omega, maxOmega }) {
  const dialRef = useRef()
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const size = 100
    canvas.width = size
    canvas.height = size

    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(0, 245, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2)
    ctx.stroke()

    const tickCount = 12
    for (let i = 0; i < tickCount; i++) {
      const tickAngle = (i / tickCount) * Math.PI * 2
      ctx.strokeStyle = '#334455'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(
        size / 2 + (size / 2 - 15) * Math.cos(tickAngle),
        size / 2 + (size / 2 - 15) * Math.sin(tickAngle)
      )
      ctx.lineTo(
        size / 2 + (size / 2 - 25) * Math.cos(tickAngle),
        size / 2 + (size / 2 - 25) * Math.sin(tickAngle)
      )
      ctx.stroke()
    }

    const normalizedOmega = Math.min(Math.abs(omega) / maxOmega, 1)
    const indicatorAngle = normalizedOmega * Math.PI * 2 * 0.75 - Math.PI / 4
    const direction = omega >= 0 ? 1 : -1

    ctx.strokeStyle = omega >= 0 ? '#00f5ff' : '#ff4444'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(size / 2, size / 2)
    ctx.lineTo(
      size / 2 + (size / 2 - 20) * Math.cos(indicatorAngle * direction),
      size / 2 + (size / 2 - 20) * Math.sin(indicatorAngle * direction)
    )
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`${omega.toFixed(2)} rad/s`, size / 2, size / 2 + 30)
  }, [omega, maxOmega])

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-4 right-4 rounded-full border border-[rgba(0,245,255,0.3)]"
      style={{ width: 100, height: 100 }}
    />
  )
}

function RigidBody({ objectType, mass, radius, rotation, color }) {
  const meshRef = useRef()

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z = rotation
    }
  }, [rotation])

  switch (objectType) {
    case 'disk':
      return (
        <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius, radius, radius * 0.3, 32]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
        </mesh>
      )
    case 'rod':
      return (
        <mesh ref={meshRef}>
          <boxGeometry args={[radius * 4, radius * 0.4, radius * 0.4]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
        </mesh>
      )
    case 'ring':
      return (
        <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, radius * 0.15, 16, 32]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
        </mesh>
      )
    case 'sphere':
      return (
        <mesh ref={meshRef}>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
        </mesh>
      )
    default:
      return (
        <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius, radius, radius * 0.3, 32]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
        </mesh>
      )
  }
}

function ComparatorShape({ objectType, mass, radius, angularAccel, time, color }) {
  const rotation = useRef(0)

  useEffect(() => {
    let animationId
    const animate = () => {
      rotation.current += angularAccel * 0.016
      animationId = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(animationId)
  }, [angularAccel])

  const displayRotation = time * angularAccel

  switch (objectType) {
    case 'disk':
      return (
        <group position={[0, 0, 0]} rotation={[Math.PI / 2, 0, displayRotation]}>
          <mesh>
            <cylinderGeometry args={[radius, radius, radius * 0.3, 32]} />
            <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      )
    case 'rod':
      return (
        <mesh rotation={[0, 0, displayRotation]}>
          <boxGeometry args={[radius * 4, radius * 0.4, radius * 0.4]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
        </mesh>
      )
    case 'ring':
      return (
        <group rotation={[Math.PI / 2, 0, displayRotation]}>
          <mesh>
            <torusGeometry args={[radius, radius * 0.15, 16, 32]} />
            <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      )
    case 'sphere':
      return (
        <mesh rotation={[displayRotation, displayRotation, 0]}>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
        </mesh>
      )
    default:
      return null
  }
}

function SimulationScene({
  objectType,
  mass,
  radius,
  appliedForce,
  forcePosition,
  isPlaying,
  onDataPoint,
}) {
  const [theta, setTheta] = useState(0)
  const [omega, setOmega] = useState(0)
  const [alpha, setAlpha] = useState(0)
  const [torque, setTorque] = useState(0)
  const [angularMomentum, setAngularMomentum] = useState(0)

  const animationRef = useRef(null)
  const isPlayingRef = useRef(isPlaying)
  const stateRef = useRef({ theta: 0, omega: 0, alpha: 0, torque: 0, t: 0 })

  const momentOfInertia = useMemo(
    () => calculateMomentOfInertia(objectType, mass, radius),
    [objectType, mass, radius]
  )

  const torqueCalc = useMemo(
    () => radius * appliedForce * Math.sin(forcePosition * Math.PI / 180),
    [radius, appliedForce, forcePosition]
  )

  const angularAccel = torqueCalc / momentOfInertia
  const maxOmega = 20

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    stateRef.current = { theta: 0, omega: 0, alpha: 0, torque: 0, t: 0 }
    setTheta(0)
    setOmega(0)
    setAlpha(angularAccel)
    setTorque(torqueCalc)
  }, [angularAccel, torqueCalc])

  useEffect(() => {
    if (!isPlayingRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const dt = 0.016
    let lastTime = performance.now()

    const animate = () => {
      const currentTime = performance.now()
      const delta = (currentTime - lastTime) / 1000
      lastTime = currentTime

      const state = stateRef.current
      state.alpha = angularAccel
      state.omega += state.alpha * delta
      state.theta += state.omega * delta
      state.t += delta

      setTheta(state.theta)
      setOmega(state.omega)
      setAlpha(state.alpha)

      const I = momentOfInertia
      const L = I * state.omega
      setAngularMomentum(L)

      onDataPoint?.({
        t: state.t,
        theta: state.theta,
        omega: state.omega,
        alpha: state.alpha,
        torque: torqueCalc,
        L,
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [angularAccel, momentOfInertia, torqueCalc, onDataPoint])

  const bodyColor = '#00f5ff'
  const forceDir = [Math.cos(forcePosition * Math.PI / 180), Math.sin(forcePosition * Math.PI / 180)]
  const forceLength = Math.min(appliedForce * 0.05, 1.5)
  const forcePos = [radius * forceDir[0], radius * forceDir[1]]

  const torqueDir = torqueCalc >= 0 ? 1 : -1

  const infoTextures = useMemo(() => ({
    type: createLabelTexture(`${objectType.toUpperCase()}  ${getInertiaLabel(objectType)}`, '#00f5ff'),
    I: createLabelTexture(`I = ${momentOfInertia.toFixed(3)} kg·m²`, '#ffff00'),
    tau: createLabelTexture(`τ = ${torqueCalc.toFixed(2)} N·m`, '#ff8800'),
    alpha: createLabelTexture(`α = ${angularAccel.toFixed(2)} rad/s²`, '#88ff88'),
  }), [objectType, momentOfInertia, torqueCalc, angularAccel])

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[15, 15]} />
        <meshStandardMaterial color="#0a0f1e" />
      </mesh>

      <mesh position={[0, 0, -radius - 0.5]}>
        <boxGeometry args={[3, 0.1, 0.5]} />
        <meshStandardMaterial color="#334455" metalness={0.7} />
      </mesh>

      <RigidBody
        objectType={objectType}
        mass={mass}
        radius={radius}
        rotation={theta}
        color={bodyColor}
      />

      <ForceArrow
        position={forcePos}
        direction={forceDir}
        length={forceLength}
        color="#ff4444"
        label={`F = ${appliedForce}N`}
      />

      <TorqueArrow
        radius={radius + 0.3}
        angle={theta}
        direction={torqueDir}
        color="#ff8800"
      />

      <AngularMomentumArrow
        magnitude={Math.abs(angularMomentum)}
        color="#44ff44"
      />

      <sprite scale={[3, 0.75, 1]} position={[0, 3, 0]}>
        <spriteMaterial map={infoTextures.type} transparent />
      </sprite>
      <sprite scale={[2, 0.5, 1]} position={[-3, 2.5, 0]}>
        <spriteMaterial map={infoTextures.I} transparent />
      </sprite>
      <sprite scale={[2, 0.5, 1]} position={[3, 2.5, 0]}>
        <spriteMaterial map={infoTextures.tau} transparent />
      </sprite>
      <sprite scale={[2, 0.5, 1]} position={[3, 2, 0]}>
        <spriteMaterial map={infoTextures.alpha} transparent />
      </sprite>

      <AngularVelocityDial omega={omega} maxOmega={maxOmega} />
    </>
  )
}

function ComparatorPanel({ mass, radius, appliedForce }) {
  const [time, setTime] = useState(0)
  const animationRef = useRef(null)

  useEffect(() => {
    let lastTime = performance.now()
    const animate = () => {
      const currentTime = performance.now()
      setTime(t => t + (currentTime - lastTime) / 1000)
      lastTime = currentTime
      animationRef.current = requestAnimationFrame(animate)
    }
    animationRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationRef.current)
  }, [])

  const shapes = ['disk', 'rod', 'ring', 'sphere']
  const colors = ['#00f5ff', '#ff8800', '#ff4444', '#88ff88']
  const positions = [[-4.5, 0], [-1.5, 0], [1.5, 0], [4.5, 0]]

  const angularAccels = useMemo(() =>
    shapes.map(type => {
      const I = calculateMomentOfInertia(type, mass, radius)
      const tau = radius * appliedForce
      return tau / I
    }),
    [mass, radius, appliedForce]
  )

  const momentOfInertias = useMemo(() =>
    shapes.map(type => calculateMomentOfInertia(type, mass, radius)),
    [mass, radius]
  )

  const sortedOrder = useMemo(() => {
    const indexed = angularAccels.map((a, i) => ({ accel: a, index: i }))
    return indexed.sort((a, b) => b.accel - a.accel)
  }, [angularAccels])

  return (
    <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-[rgba(0,245,255,0.3)] bg-[rgba(0,0,0,0.8)] p-4">
      <h4 className="mb-2 font-mono-display text-xs uppercase tracking-wider text-[#00f5ff]">
        Moment of Inertia Comparator
      </h4>
      <div className="flex justify-around">
        {shapes.map((shape, i) => (
          <div key={shape} className="flex flex-col items-center">
            <div className="relative h-24 w-24">
              <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <group position={positions[i]}>
                  <ComparatorShape
                    objectType={shape}
                    mass={mass}
                    radius={0.5}
                    angularAccel={angularAccels[i]}
                    time={time}
                    color={colors[i]}
                  />
                </group>
              </Canvas>
            </div>
            <p className="mt-1 font-mono-display text-xs text-white">{shape}</p>
            <p className="font-mono text-[10px] text-slate-400">I={momentOfInertias[i].toFixed(2)}</p>
            <p className="font-mono text-[10px]" style={{ color: sortedOrder[0].index === i ? '#44ff44' : sortedOrder[3].index === i ? '#ff4444' : '#ffff00' }}>
              α={angularAccels[i].toFixed(2)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span className="text-[#44ff44]">Fastest (sphere)</span>
        <span className="text-[#ff4444]">Slowest (ring)</span>
      </div>
    </div>
  )
}

function PositionGraph({ dataStream }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dataStream.length < 2) return

    const ctx = canvas.getContext('2d')
    const width = 280
    const height = 120
    canvas.width = width
    canvas.height = height

    ctx.fillStyle = 'rgba(10, 15, 30, 0.9)'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(0, 245, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()

    ctx.strokeStyle = '#00f5ff'
    ctx.lineWidth = 2
    ctx.beginPath()

    const tMin = dataStream[0].t
    const tMax = dataStream[dataStream.length - 1].t
    const tRange = Math.max(tMax - tMin, 0.001)
    const maxOmega = Math.max(...dataStream.map(d => Math.abs(d.omega)), 1)

    dataStream.forEach((point, i) => {
      const px = ((point.t - tMin) / tRange) * width
      const py = height / 2 - (point.omega / maxOmega) * (height / 2 - 10)
      if (i === 0) {
        ctx.moveTo(px, py)
      } else {
        ctx.lineTo(px, py)
      }
    })
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '10px Arial'
    ctx.fillText('ω vs Time', width / 2, 15)
    ctx.fillText('Linear ramp for constant τ', width / 2, height - 5)
  }, [dataStream])

  return (
    <canvas
      ref={canvasRef}
      className="absolute left-4 top-20 rounded-lg border border-[rgba(0,245,255,0.3)]"
      style={{ width: 280, height: 120 }}
    />
  )
}

function DisplacementGraph({ dataStream }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dataStream.length < 2) return

    const ctx = canvas.getContext('2d')
    const width = 280
    const height = 120
    canvas.width = width
    canvas.height = height

    ctx.fillStyle = 'rgba(10, 15, 30, 0.9)'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(0, 245, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()

    ctx.strokeStyle = '#ff8800'
    ctx.lineWidth = 2
    ctx.beginPath()

    const tMin = dataStream[0].t
    const tMax = dataStream[dataStream.length - 1].t
    const tRange = Math.max(tMax - tMin, 0.001)
    const maxTheta = Math.max(...dataStream.map(d => Math.abs(d.theta)), 1)

    dataStream.forEach((point, i) => {
      const px = ((point.t - tMin) / tRange) * width
      const py = height / 2 - (point.theta / maxTheta) * (height / 2 - 10)
      if (i === 0) {
        ctx.moveTo(px, py)
      } else {
        ctx.lineTo(px, py)
      }
    })
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '10px Arial'
    ctx.fillText('θ vs Time', width / 2, 15)
    ctx.fillText('Parabolic for constant α', width / 2, height - 5)
  }, [dataStream])

  return (
    <canvas
      ref={canvasRef}
      className="absolute right-4 top-20 rounded-lg border border-[rgba(255,136,0,0.3)]"
      style={{ width: 280, height: 120 }}
    />
  )
}

export default function RotationalMechanics({
  objectType = 'disk',
  mass = 2,
  radius = 1,
  appliedForce = 10,
  forcePosition = 90,
  isPlaying = false,
  onDataPoint,
}) {
  const [dataStream, setDataStream] = useState([])

  const handleDataPoint = (data) => {
    setDataStream(prev => {
      const newStream = [...prev, data]
      return newStream.slice(-500)
    })
    onDataPoint?.(data)
  }

  useEffect(() => {
    if (!isPlaying) {
      setDataStream([])
    }
  }, [isPlaying])

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 2, 6], fov: 50 }}
        style={{ background: '#0a0f1e' }}
      >
        <SimulationScene
          objectType={objectType}
          mass={mass}
          radius={radius}
          appliedForce={appliedForce}
          forcePosition={forcePosition}
          isPlaying={isPlaying}
          onDataPoint={handleDataPoint}
        />
      </Canvas>

      <PositionGraph dataStream={dataStream} />
      <DisplacementGraph dataStream={dataStream} />
      <ComparatorPanel mass={mass} radius={radius} appliedForce={appliedForce} />

      <div className="absolute top-4 left-4 rounded-full border border-[rgba(0,245,255,0.3)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#00f5ff]">
        {objectType.toUpperCase()}
      </div>
    </div>
  )
}

RotationalMechanics.getSceneConfig = (variables = {}) => {
  const {
    objectType = 'disk',
    mass = 2,
    radius = 1,
    appliedForce = 10,
  } = variables

  const I = calculateMomentOfInertia(objectType, mass, radius)
  const torque = radius * appliedForce
  const alpha = torque / I

  return {
    name: 'Rotational Mechanics',
    description: `${objectType} rotating under applied torque`,
    type: 'rotational_mechanics',
    physics: {
      objectType,
      mass,
      radius,
      momentOfInertia: I,
      appliedForce,
      torque,
      angularAcceleration: alpha,
    },
    calculations: {
      momentOfInertia: `I = ${getInertiaLabel(objectType)} = ${I.toFixed(3)} kg·m²`,
      torque: `τ = rF = ${torque.toFixed(2)} N·m`,
      angularAcceleration: `α = τ/I = ${alpha.toFixed(2)} rad/s²`,
    },
  }
}
