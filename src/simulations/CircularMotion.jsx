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
        ctx.moveTo(padding, height - padding - (avgOmega / (angularVelocity * 1.5)) * (height - 2 * padding))
        ctx.lineTo(width - padding, height - padding - (avgOmega / (angularVelocity * 1.5)) * (height - 2 * padding))
        ctx.stroke()

        if (dataHistory.length > 1) {
          ctx.strokeStyle = '#00ff88'
          ctx.lineWidth = 1.5
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          dataHistory.slice(-50).forEach((d, i) => {
            const x = padding + (i / 49) * (width - 2 * padding)
            const omega = d.omega || angularVelocity
            const y = height - padding - (omega / (angularVelocity * 1.5)) * (height - 2 * padding)
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
        
        const g = 9.81
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

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
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
  const normalForce = mass * G / Math.cos(bankAngle || 0)

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
            omega: omegaVal,
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
    normal: createLabelTexture(`N = ${normalForce.toFixed(1)} N`, '#ffff00'),
  }), [speed, centripetalForce, angularVelocity, radius, normalForce])

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

      {isBankedCurve && (
        <group rotation={[0, 0, 0]}>
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius * SCALE - 0.5, radius * SCALE + 0.5, 64]} />
            <meshStandardMaterial color="#ffaa00" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

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
      {isBankedCurve && (
        <sprite scale={[1, 0.25, 1]} position={[0, 0.8, 0]}>
          <spriteMaterial map={infoTextures.normal} transparent />
        </sprite>
      )}

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
  const [isBankedCurve, setIsBankedCurve] = useState(false)
  const [stringCut, setStringCut] = useState(false)
  const [ballPosition, setBallPosition] = useState({ x: radius * SCALE, y: 0.15, z: 0 })
  const [dataHistory, setDataHistory] = useState([])
  const [graphMode, setGraphMode] = useState('angularVelocity')

  const bankAngle = isBankedCurve ? Math.atan2(angularVelocity * angularVelocity * radius, G) : 0

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
    setBallPosition({ x: radius * SCALE, y: 0.15, z: 0 })
    setStringCut(true)
  }, [radius])

  const handleReset = useCallback(() => {
    setStringCut(false)
    setDataHistory([])
    setBallPosition({ x: radius * SCALE, y: 0.15, z: 0 })
  }, [radius])

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

  const speed = radius * angularVelocity
  const centripetalAcceleration = radius * angularVelocity * angularVelocity
  const centripetalForce = mass * centripetalAcceleration
  const weightlessnessOmega = Math.sqrt(G / radius)

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
      camera={{ position: [0, 4, 4], fov: 50 }}
        style={{ width: '100%', height: '100%', background: '#0a0f1e' }}
      >
        <SimulationScene
          radius={radius}
          mass={mass}
          angularVelocity={angularVelocity}
          isPlaying={isPlaying}
          onDataPoint={handleDataUpdate}
          isConicalMode={isConicalMode}
          stringCut={stringCut}
          isBankedCurve={isBankedCurve}
          bankAngle={bankAngle}
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
          θ = tan⁻¹(ω²r/g) = {(Math.atan2(angularVelocity * angularVelocity * radius, G) * 180 / Math.PI).toFixed(1)}°
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
            <span className="text-white">{(radius * angularVelocity).toFixed(2)} m/s</span>
            <span className="text-[#ff4444]">Fc:</span>
            <span className="text-white">{(mass * radius * angularVelocity * angularVelocity).toFixed(2)} N</span>
            <span className="text-[#88ff88]">aᶜ:</span>
            <span className="text-white">{(radius * angularVelocity * angularVelocity).toFixed(2)} m/s²</span>
            <span className="text-[#ffff00]">ω:</span>
            <span className="text-white">{angularVelocity.toFixed(2)} rad/s</span>
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
            mass={mass}
            angularVelocity={angularVelocity}
            radius={radius}
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
