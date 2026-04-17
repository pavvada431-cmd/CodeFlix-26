import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Matter from 'matter-js'

const SCALE = 0.15
const TRACK_Y = 0
const BALL_RADIUS = 0.4

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

function VelocityArrow({ position, direction, length, color, label }) {
  const meshRef = useRef()

  const geometry = useMemo(() => createArrowGeometry(Math.max(length, 0.05)), [length])

  const rotation = useMemo(() => {
    const angle = direction > 0 ? 0 : Math.PI
    return [0, 0, -angle]
  }, [direction])

  const texture = useMemo(() => createLabelTexture(label, color), [label, color])

  if (length < 0.02) return null

  return (
    <group position={position}>
      <mesh ref={meshRef} geometry={geometry} rotation={rotation} position={[length / 2 * direction, 0, 0]}>
        <meshStandardMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <sprite scale={[0.8, 0.2, 1]} position={[direction * (length / 2 + 0.3), 0.3, 0]}>
        <spriteMaterial map={texture} transparent />
      </sprite>
    </group>
  )
}

function CollisionBurst({ position, isActive }) {
  const [particles, setParticles] = useState([])
  const [particleOpacity, setParticleOpacity] = useState(0)
  const [particlePositions, setParticlePositions] = useState([])
  const animationRef = useRef(null)
  const timeRef = useRef(0)

  useEffect(() => {
    if (!isActive) return

    timeRef.current = 0
    const newParticles = []
    for (let i = 0; i < 20; i++) {
      const angle = (Math.random() * Math.PI * 2)
      const speed = 2 + Math.random() * 3
      newParticles.push({
        id: i,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      })
    }

    requestAnimationFrame(() => {
      setParticles(newParticles)
      setParticleOpacity(1)
    })

    const animate = () => {
      timeRef.current += 0.016
      if (timeRef.current > 0.5) {
        setParticleOpacity(0)
        return
      }
      const positions = newParticles.map(p => ({
        id: p.id,
        x: p.vx * timeRef.current,
        y: p.vy * timeRef.current,
      }))
      setParticlePositions(positions)
      animationRef.current = requestAnimationFrame(animate)
    }
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive])

  if (particleOpacity === 0) return null

  return (
    <group position={position}>
      {particles.map((p, idx) => {
        const pos = particlePositions[idx] || { x: 0, y: 0 }
        return (
          <mesh key={p.id} position={[pos.x, pos.y, 0]}>
            <sphereGeometry args={[0.08 * particleOpacity, 8, 8]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={particleOpacity} emissive="#ffffff" emissiveIntensity={2} />
          </mesh>
        )
      })}
    </group>
  )
}

function Track() {
  return (
    <group>
      <mesh position={[0, TRACK_Y - 0.05, 0]}>
        <boxGeometry args={[20, 0.1, 2]} />
        <meshStandardMaterial color="#334455" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, TRACK_Y, 0]} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.98, 1.02, 64]} />
        <meshStandardMaterial color="#00f5ff" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Ball({ position, color, scale = 1 }) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} emissive={color} emissiveIntensity={0.2} />
    </mesh>
  )
}

function NewtonCradle() {
  const [ballAngles, setBallAngles] = useState([0, 0, 0, 0, 0])
  const engineRef = useRef(null)
  const bodiesRef = useRef([])
  const animationRef = useRef(null)
  const isPlayingRef = useRef(true)

  useEffect(() => {
    const Engine = Matter.Engine
    const engine = Engine.create({ gravity: { x: 0, y: 1 } })
    engineRef.current = engine

    const constraintY = 3
    const startX = -2
    const spacing = 0.5
    const stringLength = 2

    const bodies = []
    for (let i = 0; i < 5; i++) {
      const ball = Matter.Bodies.circle(startX + i * spacing, constraintY + stringLength, 0.25, {
        restitution: 0.9,
        friction: 0,
        frictionAir: 0.001,
      })

      const constraint = Matter.Constraint.create({
        pointA: { x: startX + i * spacing, y: constraintY },
        bodyB: ball,
        length: stringLength,
        stiffness: 1,
      })

      Matter.Composite.add(engine.world, [ball, constraint])
      bodies.push(ball)
    }

    Matter.Body.setPosition(bodies[0], { x: startX - 1.5, y: constraintY + stringLength + 0.5 })
    Matter.Body.setVelocity(bodies[0], { x: 2, y: 0 })

    bodiesRef.current = bodies

    return () => {
      Matter.Engine.clear(engine)
    }
  }, [])

  useEffect(() => {
    if (!engineRef.current) return

    const animate = () => {
      Matter.Engine.update(engineRef.current, 1000 / 60)

      const angles = bodiesRef.current.map(b => {
        const dx = b.position.x - b.position.x
        const dy = b.position.y - (3 + 2)
        return Math.atan2(dx, -dy)
      })
      setBallAngles(angles)

      if (isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      isPlayingRef.current = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const pivotY = 3
  const startX = -1.2
  const spacing = 0.5
  const stringLength = 2

  return (
    <group>
      <mesh position={[0, pivotY + 0.1, 0]}>
        <boxGeometry args={[3, 0.1, 0.3]} />
        <meshStandardMaterial color="#445566" metalness={0.8} />
      </mesh>

      {ballAngles.map((angle, i) => {
        const bobX = startX + i * spacing + Math.sin(angle) * stringLength
        const bobY = pivotY + Math.cos(angle) * stringLength

        return (
          <group key={i}>
            <mesh position={[startX + i * spacing, pivotY, 0]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial color="#666666" metalness={0.9} />
            </mesh>
            <mesh position={[startX + i * spacing, (pivotY + bobY) / 2, 0]}>
              <cylinderGeometry args={[0.02, 0.02, stringLength, 8]} />
              <meshStandardMaterial color="#888888" />
            </mesh>
            <Ball position={[bobX, bobY, 0]} color="#00f5ff" />
          </group>
        )
      })}
    </group>
  )
}

function SimulationScene({
  mass1,
  mass2,
  velocity1,
  velocity2,
  collisionType,
  isPlaying,
  onDataPoint,
  isNewtonCradle,
  onCollision,
}) {
  const [ball1Pos, setBall1Pos] = useState({ x: -3, y: TRACK_Y })
  const [ball2Pos, setBall2Pos] = useState({ x: 3, y: TRACK_Y })
  const [v1After, setV1After] = useState(0)
  const [v2After, setV2After] = useState(0)
  const [collisionHappened, setCollisionHappened] = useState(false)
  const [showBurst, setShowBurst] = useState(false)
  const [mergedScale, setMergedScale] = useState(1)
  const [pTotal, setPTotal] = useState(0)
  const [keTotal, setKeTotal] = useState(0)

  const engineRef = useRef(null)
  const ball1Ref = useRef(null)
  const ball2Ref = useRef(null)
  const animationRef = useRef(null)
  const isPlayingRef = useRef(isPlaying)
  const collisionOccurredRef = useRef(false)
  const startTimeRef = useRef(0)
  const lastDataTimeRef = useRef(0)
  const mergedRef = useRef(false)
  const initializedRef = useRef(false)

  const restitution = collisionType === 'elastic' ? 1.0 : collisionType === 'inelastic' ? 0.5 : 0

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    if (isNewtonCradle) return

    const Engine = Matter.Engine
    const engine = Engine.create({ gravity: { x: 0, y: 0 } })
    engineRef.current = engine

    const b1 = Matter.Bodies.circle(-3 / SCALE, TRACK_Y / SCALE, BALL_RADIUS / SCALE, {
      restitution,
      friction: 0,
      frictionAir: 0,
      label: 'ball1',
    })

    const b2 = Matter.Bodies.circle(3 / SCALE, TRACK_Y / SCALE, BALL_RADIUS / SCALE, {
      restitution,
      friction: 0,
      frictionAir: 0,
      label: 'ball2',
    })

    Matter.Body.setVelocity(b1, { x: (velocity1 / SCALE), y: 0 })
    Matter.Body.setVelocity(b2, { x: (velocity2 / SCALE), y: 0 })

    ball1Ref.current = b1
    ball2Ref.current = b2
    Matter.Composite.add(engine.world, [b1, b2])

    initializedRef.current = true
    collisionOccurredRef.current = false
    mergedRef.current = false
    startTimeRef.current = 0
    lastDataTimeRef.current = 0

    return () => {
      Matter.Engine.clear(engine)
      engineRef.current = null
      initializedRef.current = false
    }
  }, [mass1, mass2, velocity1, velocity2, collisionType, isNewtonCradle, restitution])

  useEffect(() => {
    if (isNewtonCradle || !engineRef.current || !ball1Ref.current || !ball2Ref.current || !initializedRef.current) return

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

    const b1 = ball1Ref.current
    const b2 = ball2Ref.current

    const v1Initial = velocity1
    const v2Initial = velocity2
    const m1 = mass1
    const m2 = mass2
    const res = restitution
    const callback = onDataPoint
    const collisionCallback = onCollision
    const colType = collisionType

    const animate = () => {
      Matter.Engine.update(engineRef.current, 1000 / 60)

      const pos1 = b1.position
      const pos2 = b2.position

      const displayPos1 = { x: pos1.x * SCALE, y: pos1.y * SCALE }
      const displayPos2 = { x: pos2.x * SCALE, y: pos2.y * SCALE }

      const currentTime = (performance.now() / 1000) - startTimeRef.current

      const v1 = b1.velocity.x * SCALE
      const v2 = b2.velocity.x * SCALE
      const pTot = m1 * v1 + m2 * v2
      const keTot = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2

      setPTotal(pTot)
      setKeTotal(keTot)
      setBall1Pos(displayPos1)
      setBall2Pos(displayPos2)

      if (currentTime - lastDataTimeRef.current > 0.05) {
        callback?.({
          t: currentTime,
          v1,
          v2,
          p_total: pTot,
          KE_total: keTot,
        })
        lastDataTimeRef.current = currentTime
      }

      if (!collisionOccurredRef.current) {
        const dist = Math.abs(pos1.x - pos2.x)
        if (dist <= (BALL_RADIUS * 2 / SCALE) + 0.01) {
          collisionOccurredRef.current = true

          setShowBurst(true)
          setCollisionHappened(true)

          setTimeout(() => setShowBurst(false), 500)

          const v1AfterCalc = ((m1 - res * m2) * v1Initial + (1 + res) * m2 * v2Initial) / (m1 + m2)
          const v2AfterCalc = ((m2 - res * m1) * v2Initial + (1 + res) * m1 * v1Initial) / (m1 + m2)

          setV1After(v1AfterCalc)
          setV2After(v2AfterCalc)

          collisionCallback?.({
            v1Before: v1Initial,
            v2Before: v2Initial,
            v1After: v1AfterCalc,
            v2After: v2AfterCalc,
            pBefore: m1 * v1Initial + m2 * v2Initial,
            pAfter: m1 * v1AfterCalc + m2 * v2AfterCalc,
            keBefore: 0.5 * m1 * v1Initial * v1Initial + 0.5 * m2 * v2Initial * v2Initial,
            keAfter: 0.5 * m1 * v1AfterCalc * v1AfterCalc + 0.5 * m2 * v2AfterCalc * v2AfterCalc,
          })

          if (colType === 'perfectly_inelastic' && !mergedRef.current) {
            mergedRef.current = true
            let scale = 1
            const mergeInterval = setInterval(() => {
              scale -= 0.1
              if (scale <= 0) {
                scale = 0
                clearInterval(mergeInterval)
              }
              setMergedScale(Math.max(0, scale))
            }, 20)
          }
        }
      }

      if (isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, mass1, mass2, velocity1, velocity2, collisionType, onDataPoint, onCollision, isNewtonCradle, restitution])

  const scale1 = collisionType === 'perfectly_inelastic' && collisionHappened ? mergedScale : 1
  const scale2 = collisionType === 'perfectly_inelastic' && collisionHappened ? Math.min(2, 1 + (1 - mergedScale)) : 1

  const v1Display = collisionHappened ? v1After : velocity1
  const v2Display = collisionHappened ? v2After : velocity2

  const infoTextures = useMemo(() => ({
    v1: createLabelTexture(`v1 = ${v1Display.toFixed(2)} m/s`, '#00f5ff'),
    v2: createLabelTexture(`v2 = ${v2Display.toFixed(2)} m/s`, '#ff8800'),
    m1: createLabelTexture(`m1 = ${mass1} kg`, '#00f5ff'),
    m2: createLabelTexture(`m2 = ${mass2} kg`, '#ff8800'),
    p: createLabelTexture(`p = ${pTotal.toFixed(2)} kg·m/s`, '#44ff44'),
    ke: createLabelTexture(`KE = ${keTotal.toFixed(2)} J`, '#ffff00'),
  }), [v1Display, v2Display, mass1, mass2, pTotal, keTotal])

  if (isNewtonCradle) {
    return (
      <>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#0a0f1e" />
        </mesh>
        <NewtonCradle />
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

      <Track />

      <Ball position={[ball1Pos.x, ball1Pos.y, 0]} color="#00f5ff" scale={scale1} />
      <Ball position={[ball2Pos.x, ball2Pos.y, 0]} color="#ff8800" scale={scale2} />

      {Math.abs(v1Display) > 0.01 && (
        <VelocityArrow
          position={[ball1Pos.x, ball1Pos.y + BALL_RADIUS + 0.2, 0]}
          direction={v1Display > 0 ? 1 : -1}
          length={Math.min(Math.abs(v1Display) * 0.2, 1.5)}
          color="#00f5ff"
          label={`${v1Display.toFixed(1)} m/s`}
        />
      )}

      {Math.abs(v2Display) > 0.01 && (
        <VelocityArrow
          position={[ball2Pos.x, ball2Pos.y + BALL_RADIUS + 0.2, 0]}
          direction={v2Display > 0 ? 1 : -1}
          length={Math.min(Math.abs(v2Display) * 0.2, 1.5)}
          color="#ff8800"
          label={`${v2Display.toFixed(1)} m/s`}
        />
      )}

      <CollisionBurst
        position={[(ball1Pos.x + ball2Pos.x) / 2, TRACK_Y, 0]}
        isActive={showBurst}
      />

      <sprite scale={[1, 0.25, 1]} position={[-4, 2.5, 0]}>
        <spriteMaterial map={infoTextures.m1} transparent />
      </sprite>
      <sprite scale={[1, 0.25, 1]} position={[-4, 2.2, 0]}>
        <spriteMaterial map={infoTextures.v1} transparent />
      </sprite>

      <sprite scale={[1, 0.25, 1]} position={[3, 2.5, 0]}>
        <spriteMaterial map={infoTextures.m2} transparent />
      </sprite>
      <sprite scale={[1, 0.25, 1]} position={[3, 2.2, 0]}>
        <spriteMaterial map={infoTextures.v2} transparent />
      </sprite>

      <sprite scale={[1.5, 0.25, 1]} position={[0, 1.5, 0]}>
        <spriteMaterial map={infoTextures.p} transparent />
      </sprite>
      <sprite scale={[1.5, 0.25, 1]} position={[0, 1.2, 0]}>
        <spriteMaterial map={infoTextures.ke} transparent />
      </sprite>
    </>
  )
}

function ConservationTable({ data }) {
  const tableTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 200
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.roundRect(0, 0, 400, 200, 12)
    ctx.fill()

    ctx.strokeStyle = 'rgba(0, 245, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, 50)
    ctx.lineTo(400, 50)
    ctx.moveTo(0, 100)
    ctx.lineTo(400, 100)
    ctx.moveTo(0, 150)
    ctx.lineTo(400, 150)
    ctx.moveTo(133, 0)
    ctx.lineTo(133, 200)
    ctx.moveTo(266, 0)
    ctx.lineTo(266, 200)
    ctx.stroke()

    ctx.fillStyle = '#00f5ff'
    ctx.font = 'bold 18px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Quantity', 66, 30)
    ctx.fillText('Before', 200, 30)
    ctx.fillText('After', 333, 30)

    ctx.fillStyle = '#ffffff'
    ctx.font = '16px Arial'
    ctx.textAlign = 'left'
    ctx.fillText('Total Momentum', 20, 80)
    ctx.fillText('Total KE', 20, 130)
    ctx.fillText('KE Lost', 20, 180)

    ctx.textAlign = 'right'
    ctx.fillStyle = '#44ff44'
    ctx.fillText(`${data.pBefore.toFixed(2)} kg·m/s`, 245, 80)
    ctx.fillStyle = '#ffff00'
    ctx.fillText(`${data.keBefore.toFixed(2)} J`, 245, 130)
    ctx.fillStyle = data.keLost > 0 ? '#ff4444' : '#44ff44'
    ctx.fillText(data.collisionHappened ? `${data.keLost.toFixed(2)} J` : '—', 245, 180)

    ctx.textAlign = 'right'
    ctx.fillStyle = '#88ff88'
    ctx.fillText(`${data.pAfter.toFixed(2)} kg·m/s`, 390, 80)
    ctx.fillStyle = '#ffff88'
    ctx.fillText(`${data.keAfter.toFixed(2)} J`, 390, 130)
    ctx.fillText(data.collisionHappened ? `${(Math.max(0, data.keBefore - data.keAfter)).toFixed(2)} J` : '—', 390, 180)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }, [data])

  return (
    <sprite scale={[2.5, 1.25, 1]} position={[0, -1.5, 0]}>
      <spriteMaterial map={tableTexture} transparent />
    </sprite>
  )
}

export default function Collisions({
  mass1 = 1,
  mass2 = 1,
  velocity1 = 5,
  velocity2 = -5,
  collisionType = 'elastic',
  isPlaying = false,
  onDataPoint,
}) {
  const [isNewtonCradle, setIsNewtonCradle] = useState(false)
  const [showScreenShake, setShowScreenShake] = useState(false)
  const [conservationData, setConservationData] = useState({
    pBefore: mass1 * velocity1 + mass2 * velocity2,
    pAfter: mass1 * velocity1 + mass2 * velocity2,
    keBefore: 0.5 * mass1 * velocity1 * velocity1 + 0.5 * mass2 * velocity2 * velocity2,
    keAfter: 0.5 * mass1 * velocity1 * velocity1 + 0.5 * mass2 * velocity2 * velocity2,
    keLost: 0,
    collisionHappened: false,
  })

  const handleCollision = useCallback((data) => {
    requestAnimationFrame(() => {
      setConservationData({
        pBefore: data.pBefore,
        pAfter: data.pAfter,
        keBefore: data.keBefore,
        keAfter: data.keAfter,
        keLost: data.keBefore - data.keAfter,
        collisionHappened: true,
      })
      setShowScreenShake(true)
    })
  }, [])

  const resetConservationData = useCallback(() => {
    const pBefore = mass1 * velocity1 + mass2 * velocity2
    const keBefore = 0.5 * mass1 * velocity1 * velocity1 + 0.5 * mass2 * velocity2 * velocity2
    setConservationData({
      pBefore,
      pAfter: pBefore,
      keBefore,
      keAfter: keBefore,
      keLost: 0,
      collisionHappened: false,
    })
  }, [mass1, mass2, velocity1, velocity2, collisionType])

  useEffect(() => {
    requestAnimationFrame(resetConservationData)
  }, [mass1, mass2, velocity1, velocity2, collisionType, resetConservationData])

  useEffect(() => {
    if (showScreenShake) {
      const timeout = setTimeout(() => setShowScreenShake(false), 200)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [showScreenShake])

  return (
    <div className={`relative h-full w-full ${showScreenShake ? 'animate-pulse' : ''}`}>
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
        camera={{ position: [0, 0.5, 10], fov: 60 }}
        style={{ width: '100%', height: '100%', background: '#0a0f1e' }}
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }}
      >
        <SimulationScene
          mass1={mass1}
          mass2={mass2}
          velocity1={velocity1}
          velocity2={velocity2}
          collisionType={collisionType}
          isPlaying={isPlaying}
          onDataPoint={onDataPoint}
          isNewtonCradle={isNewtonCradle}
          onCollision={handleCollision}
        />

        <ConservationTable data={conservationData} />
      </Canvas>

      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <button
          onClick={() => setIsNewtonCradle(!isNewtonCradle)}
          className={`rounded-full border px-4 py-2 font-mono-display text-xs uppercase tracking-wider transition ${
            isNewtonCradle
              ? 'border-[rgba(255,136,0,0.5)] bg-[rgba(255,136,0,0.2)] text-[#ff8800]'
              : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
          }`}
        >
          {isNewtonCradle ? "Newton's Cradle" : "Newton's Cradle"}
        </button>
      </div>

      <div className="absolute right-4 top-4 rounded-full border border-[rgba(0,245,255,0.3)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#00f5ff]">
        {collisionType.replace('_', ' ').toUpperCase()}
      </div>
    </div>
  )
}

Collisions.getSceneConfig = (variables = {}) => {
  const { mass1 = 1, mass2 = 1, velocity1 = 5, velocity2 = -5, collisionType = 'elastic' } = variables

  const pBefore = mass1 * velocity1 + mass2 * velocity2
  const keBefore = 0.5 * mass1 * velocity1 * velocity1 + 0.5 * mass2 * velocity2 * velocity2

  const restitution = collisionType === 'elastic' ? 1 : collisionType === 'inelastic' ? 0.5 : 0
  const v1After = ((mass1 - restitution * mass2) * velocity1 + (1 + restitution) * mass2 * velocity2) / (mass1 + mass2)
  const v2After = ((mass2 - restitution * mass1) * velocity2 + (1 + restitution) * mass1 * velocity1) / (mass1 + mass2)
  const keAfter = 0.5 * mass1 * v1After * v1After + 0.5 * mass2 * v2After * v2After

  return {
    name: 'Collision Simulation',
    description: `Two-body ${collisionType.replace('_', ' ')} collision`,
    type: 'collisions',
    physics: {
      mass1,
      mass2,
      velocity1,
      velocity2,
      collisionType,
      restitution,
      v1After,
      v2After,
    },
    calculations: {
      momentumBefore: `p = ${mass1}v1 + ${mass2}v2 = ${pBefore.toFixed(2)} kg·m/s`,
      momentumAfter: `p' = ${mass1}v1' + ${mass2}v2' = ${pBefore.toFixed(2)} kg·m/s`,
      keBefore: `KE = ${keBefore.toFixed(2)} J`,
      keAfter: `KE' = ${keAfter.toFixed(2)} J`,
      keLost: `ΔKE = ${(keBefore - keAfter).toFixed(2)} J`,
    },
  }
}
