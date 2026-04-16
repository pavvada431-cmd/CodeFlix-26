import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

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

function CircularTrack({ radius }) {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[radius * SCALE, TRACK_INNER_RADIUS, 16, 100]} />
        <meshStandardMaterial color="#334455" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <ringGeometry args={[radius * SCALE - 0.02, radius * SCALE + 0.02, 64]} />
        <meshStandardMaterial color="#00f5ff" transparent opacity={0.15} />
      </mesh>
    </group>
  )
}

function Ball({ position, color = '#00f5ff' }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[BALL_SIZE, 32, 32]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} emissive={color} emissiveIntensity={0.2} />
    </mesh>
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

function BallTrail({ trailPoints }) {
  const lineRef = useRef()

  useEffect(() => {
    if (lineRef.current && trailPoints.length > 1) {
      const positions = []
      trailPoints.forEach(p => positions.push(p.x, p.y, p.z))
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      lineRef.current.geometry = geometry
    }
  }, [trailPoints])

  if (trailPoints.length < 2) return null

  return (
    <line ref={lineRef}>
      <lineBasicMaterial color="#00ffff" transparent opacity={0.7} />
    </line>
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
}) {
  const [displayPosition, setDisplayPosition] = useState({ x: radius * SCALE, y: 0.15, z: 0 })
  const [displayTrail, setDisplayTrail] = useState([])
  const [displayElapsed, setDisplayElapsed] = useState(0)

  const startTimeRef = useRef(0)
  const pausedTimeRef = useRef(0)
  const lastDataTimeRef = useRef(0)
  const animationRef = useRef(null)
  const isPlayingRef = useRef(isPlaying)
  const stringCutRef = useRef(stringCut)

  const flyingPosRef = useRef({ x: radius * SCALE, y: 0.15, z: 0 })
  const flyingVelRef = useRef({ x: 0, y: 0, z: 0 })
  const trailRef = useRef([])
  const elapsedRef = useRef(0)

  const speed = radius * angularVelocity
  const centripetalAcceleration = radius * angularVelocity * angularVelocity
  const centripetalForce = mass * centripetalAcceleration

  const weightlessnessOmega = Math.sqrt(G / radius)
  const funFact = `Weightlessness at ω = √(g/r) = ${weightlessnessOmega.toFixed(2)} rad/s`

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    stringCutRef.current = stringCut
  }, [stringCut])

  useEffect(() => {
    flyingPosRef.current = { x: radius * SCALE, y: 0.15, z: 0 }
    flyingVelRef.current = { x: 0, y: 0, z: 0 }
    trailRef.current = []
    pausedTimeRef.current = 0
    startTimeRef.current = 0
    elapsedRef.current = 0
  }, [radius, angularVelocity])

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

    const radiusVal = radius
    const omegaVal = angularVelocity
    const massVal = mass
    const speedVal = radiusVal * omegaVal
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
            t: elapsedVal,
            angle,
            speed: speedVal,
            centripetalAcceleration: caVal,
            centripetalForce: cfVal,
            radius: radiusVal,
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [radius, angularVelocity, mass, onDataPoint])

  const tiltAngle = isConicalMode ? Math.atan2(centripetalAcceleration, G) : 0

  const currentPos = displayPosition

  const centripetalDir = useMemo(() => {
    if (stringCut) return [0, 0]
    const angle = angularVelocity * displayElapsed
    const cx = -Math.cos(angle)
    const cz = -Math.sin(angle)
    return [cx, cz]
  }, [displayElapsed, angularVelocity, stringCut])

  const tangentDir = useMemo(() => {
    const angle = angularVelocity * displayElapsed + (stringCut ? 0 : Math.PI / 2)
    return [Math.cos(angle), Math.sin(angle)]
  }, [displayElapsed, angularVelocity, stringCut])

  const arrowScale = Math.min(centripetalForce * 0.02, 0.6)
  const velocityScale = Math.min(speed * 0.1, 0.5)

  const infoTextures = useMemo(() => ({
    speed: createLabelTexture(`v = ${speed.toFixed(2)} m/s`, '#00ffff'),
    centripetal: createLabelTexture(`Fc = ${centripetalForce.toFixed(1)} N`, '#ff4444'),
    omega: createLabelTexture(`ω = ${angularVelocity.toFixed(2)} rad/s`, '#ffff00'),
    radius: createLabelTexture(`r = ${radius.toFixed(1)} m`, '#88ff88'),
  }), [speed, centripetalForce, angularVelocity, radius])

  if (isConicalMode) {
    const conicalBallAngle = angularVelocity * displayElapsed
    const horizontalR = radius * SCALE * Math.cos(tiltAngle)
    const verticalDrop = radius * SCALE * Math.sin(tiltAngle)
    const ballX = horizontalR * Math.cos(conicalBallAngle)
    const ballZ = horizontalR * Math.sin(conicalBallAngle)
    const ballY = 2.5 - verticalDrop

    return (
      <>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />

        <group>
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.3, 16]} />
            <meshStandardMaterial color="#445566" metalness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 3, 64]} />
            <meshStandardMaterial color="#1a2a3a" side={THREE.DoubleSide} transparent opacity={0.5} />
          </mesh>

          <mesh position={[ballX, 2.5, ballZ]}>
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(0.02, verticalDrop, 0.02)]} />
              <lineBasicMaterial color="#666666" />
            </lineSegments>
          </mesh>

          <mesh position={[ballX, ballY, ballZ]}>
            <sphereGeometry args={[BALL_SIZE, 32, 32]} />
            <meshStandardMaterial color="#ff8800" metalness={0.6} emissive="#ff4400" emissiveIntensity={0.3} />
          </mesh>
        </group>

        <sprite scale={[1, 0.25, 1]} position={[-2, 3, 0]}>
          <spriteMaterial map={infoTextures.omega} transparent />
        </sprite>
        <sprite scale={[1, 0.25, 1]} position={[-2, 2.7, 0]}>
          <spriteMaterial map={infoTextures.radius} transparent />
        </sprite>
        <sprite scale={[1, 0.25, 1]} position={[1.5, 3, 0]}>
          <spriteMaterial map={infoTextures.speed} transparent />
        </sprite>
        <sprite scale={[1, 0.25, 1]} position={[1.5, 2.7, 0]}>
          <spriteMaterial map={infoTextures.centripetal} transparent />
        </sprite>

        <sprite scale={[2, 0.3, 1]} position={[0, 0.5, 0]}>
          <spriteMaterial map={createLabelTexture(funFact, '#ff88ff')} transparent />
        </sprite>
      </>
    )
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#0a0f1e" />
      </mesh>

      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * SCALE - 0.1, radius * SCALE + 0.1, 64]} />
        <meshStandardMaterial color="#00f5ff" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>

      <CircularTrack radius={radius} />
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
        </>
      )}

      <sprite scale={[1, 0.25, 1]} position={[-2.5, 0.8, 0]}>
        <spriteMaterial map={infoTextures.speed} transparent />
      </sprite>
      <sprite scale={[1, 0.25, 1]} position={[-2.5, 0.55, 0]}>
        <spriteMaterial map={infoTextures.centripetal} transparent />
      </sprite>
      <sprite scale={[1, 0.25, 1]} position={[1.5, 0.8, 0]}>
        <spriteMaterial map={infoTextures.omega} transparent />
      </sprite>
      <sprite scale={[1, 0.25, 1]} position={[1.5, 0.55, 0]}>
        <spriteMaterial map={infoTextures.radius} transparent />
      </sprite>

      <sprite scale={[2, 0.3, 1]} position={[0, -0.5, 0]}>
        <spriteMaterial map={createLabelTexture(funFact, '#ff88ff')} transparent />
      </sprite>
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
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

export default function CircularMotion({
  radius = 2,
  mass = 1,
  angularVelocity = 2,
  isPlaying = false,
  onDataPoint,
}) {
  const [isConicalMode, setIsConicalMode] = useState(false)
  const [stringCut, setStringCut] = useState(false)
  const [ballPosition, setBallPosition] = useState({ x: radius * SCALE, y: 0.15, z: 0 })

  const handleCutString = useCallback(() => {
    setBallPosition({ x: radius * SCALE, y: 0.15, z: 0 })
    setStringCut(true)
  }, [radius])

  const handleReset = useCallback(() => {
    setStringCut(false)
    setBallPosition({ x: radius * SCALE, y: 0.15, z: 0 })
  }, [radius])

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 4, 4], fov: 50 }}
        style={{ background: '#0a0f1e' }}
      >
        <SimulationScene
          radius={radius}
          mass={mass}
          angularVelocity={angularVelocity}
          isPlaying={isPlaying}
          onDataPoint={onDataPoint}
          isConicalMode={isConicalMode}
          stringCut={stringCut}
        />
      </Canvas>

      <MiniMap
        radius={radius}
        ballPosition={ballPosition}
        isPlaying={isPlaying}
        angularVelocity={angularVelocity}
        stringCut={stringCut}
      />

      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        {!isConicalMode && (
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
          onClick={() => {
            setIsConicalMode(!isConicalMode)
            setStringCut(false)
          }}
          className={`rounded-full border px-4 py-2 font-mono-display text-xs uppercase tracking-wider transition ${
            isConicalMode
              ? 'border-[rgba(255,136,0,0.5)] bg-[rgba(255,136,0,0.2)] text-[#ff8800]'
              : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
          }`}
        >
          {isConicalMode ? 'Conical Pendulum' : 'Conical Mode'}
        </button>
      </div>

      {isConicalMode && (
        <div className="absolute left-4 top-20 rounded-full border border-[rgba(255,136,0,0.5)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#ff8800]">
          θ = tan⁻¹(v²/rg) mode
        </div>
      )}

      {stringCut && (
        <div className="absolute right-4 top-4 rounded-full border border-[rgba(255,136,0,0.5)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#ff8800]">
          Ball flying off!
        </div>
      )}
    </div>
  )
}

CircularMotion.getSceneConfig = (variables = {}) => {
  const { radius = 2, mass = 1, angularVelocity = 2 } = variables
  const speed = radius * angularVelocity
  const centripetalAcceleration = radius * angularVelocity * angularVelocity
  const centripetalForce = mass * centripetalAcceleration
  const weightlessnessOmega = Math.sqrt(G / radius)

  return {
    name: 'Circular Motion',
    description: 'Uniform circular motion with centripetal force analysis',
    type: 'circular_motion',
    physics: {
      radius,
      mass,
      angularVelocity,
      speed,
      centripetalAcceleration,
      centripetalForce,
      weightlessnessOmega,
    },
    calculations: {
      centripetalForce: `Fc = mv²/r = ${centripetalForce.toFixed(2)} N`,
      centripetalAccel: `ac = v²/r = ${centripetalAcceleration.toFixed(2)} m/s²`,
      period: `T = 2π/ω = ${(2 * Math.PI / angularVelocity).toFixed(2)} s`,
      weightlessnessCondition: `ω = √(g/r) = ${weightlessnessOmega.toFixed(2)} rad/s`,
    },
  }
}
