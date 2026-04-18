import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Grid, Html, Line, OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { createInclinedPlaneWorld } from '../utils/physicsEngine'

const SCENE_SCALE = 0.01
const RAMP_LENGTH = 460
const RAMP_THICKNESS = 24
const RAMP_CENTER_X = 400
const RAMP_CENTER_Y = 320
const BLOCK_ID = 'inclined-plane-block'
const GRAVITY = 9.81

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

function normalizeInputs(variables = {}) {
  return {
    mass: Number.isFinite(variables.mass) && variables.mass > 0 ? variables.mass : 10,
    angle: Number.isFinite(variables.angle) ? variables.angle : 30,
    friction: Number.isFinite(variables.friction) && variables.friction >= 0 ? variables.friction : 0,
  }
}

function InclinedScene({ mass, angle, friction, isPlaying, onComplete, onDataPoint }) {
  const [blockState, setBlockState] = useState({ x: 0, y: 0, angle: 0, velocity: 0 })
  const [trail, setTrail] = useState([])
  const engineRef = useRef(null)
  const cleanupRef = useRef(null)
  const onCompleteRef = useRef(onComplete)
  const onDataPointRef = useRef(onDataPoint)
  const completedRef = useRef(false)
  const initialProjectionRef = useRef(null)
  const startTimeRef = useRef(0)
  const lastEmitRef = useRef(0)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    onDataPointRef.current = onDataPoint
  }, [onDataPoint])

  const rampAngle = (angle * Math.PI) / 180
  const blockSize = Math.max(28, Math.min(64, Math.sqrt(mass) * 14))
  const completionThresholdX = RAMP_CENTER_X + Math.cos(rampAngle) * (RAMP_LENGTH / 2 - blockSize * 0.85)

  useEffect(() => {
    const engine = createInclinedPlaneWorld(mass, angle, friction)
    engine.stopLoop()
    engineRef.current = engine
    const trailResetTimeoutId = setTimeout(() => {
      setTrail([])
    }, 0)
    completedRef.current = false
    initialProjectionRef.current = null
    startTimeRef.current = performance.now() / 1000
    lastEmitRef.current = 0

    cleanupRef.current = engine.onStep((states) => {
      const blockStateRaw = states.find((s) => s.id === BLOCK_ID)
      const blockBody = engine.findBodyById(BLOCK_ID)
      if (!blockStateRaw || !blockBody) return
      const velocity = Math.hypot(blockBody.velocity.x, blockBody.velocity.y)
      setBlockState({
        x: blockStateRaw.x,
        y: blockStateRaw.y,
        angle: blockStateRaw.angle,
        velocity,
      })
      setTrail(prev => {
        const newPoint = [blockStateRaw.x * SCENE_SCALE, -blockStateRaw.y * SCENE_SCALE + 0.2, 0.15]
        return [...prev.slice(-119), newPoint]
      })

      if (!completedRef.current && blockStateRaw.x >= completionThresholdX) {
        completedRef.current = true
        onCompleteRef.current?.(velocity)
      }

      const now = performance.now() / 1000
      if (now - lastEmitRef.current < 0.05) return

      const sinA = Math.sin(rampAngle)
      const cosA = Math.cos(rampAngle)
      const dirX = Math.cos(rampAngle)
      const dirY = Math.sin(rampAngle)
      const gForce = mass * GRAVITY
      // Resolve weight mg into components parallel/perpendicular to the plane.
      const parallelForce = gForce * sinA
      const normalForce = Math.max(0, gForce * cosA)
      const maxStaticFriction = friction * normalForce
      const velocityAlong = (blockBody.velocity.x * dirX + blockBody.velocity.y * dirY) * SCENE_SCALE
      const movingAlongPlane = Math.abs(velocityAlong) > 1e-4

      let frictionForce = 0
      let netForce = 0
      let regime = 'static'
      if (!movingAlongPlane && Math.abs(parallelForce) <= maxStaticFriction + 1e-9) {
        frictionForce = -parallelForce
        netForce = 0
      } else {
        regime = 'kinetic'
        frictionForce = -Math.sign(movingAlongPlane ? velocityAlong : parallelForce || 1) * friction * normalForce
        netForce = parallelForce + frictionForce
      }

      const acceleration = mass > 0 ? netForce / mass : 0
      const projection = blockStateRaw.x * dirX + blockStateRaw.y * dirY
      if (initialProjectionRef.current === null) {
        initialProjectionRef.current = projection
      }
      const displacementAlong = (projection - initialProjectionRef.current) * SCENE_SCALE
      const rampBottomY = RAMP_CENTER_Y + Math.abs(Math.sin(rampAngle)) * (RAMP_LENGTH / 2)
      const heightAboveBase = Math.max(0, (rampBottomY - blockStateRaw.y) * SCENE_SCALE)
      const speedMps = velocity * SCENE_SCALE
      const kineticEnergy = 0.5 * mass * speedMps * speedMps
      const potentialEnergy = mass * GRAVITY * heightAboveBase

      onDataPointRef.current?.({
        t_s: now - startTimeRef.current,
        theta_deg: angle,
        theta_rad: rampAngle,
        mass_kg: mass,
        positionAlongPlane_m: displacementAlong,
        velocity_mps: speedMps,
        acceleration_mps2: acceleration,
        gravityForce_N: gForce,
        normalForce_N: normalForce,
        parallelForce_N: parallelForce,
        frictionForce_N: frictionForce,
        netForce_N: netForce,
        maxStaticFriction_N: maxStaticFriction,
        frictionRegime: regime,
        kineticEnergy_J: kineticEnergy,
        potentialEnergy_J: potentialEnergy,
        totalEnergy_J: kineticEnergy + potentialEnergy,
        fbd: {
          axis: {
            parallel: { x: dirX, y: dirY },
            normal: { x: -dirY, y: dirX },
          },
          weight_N: gForce,
          normal_N: normalForce,
          downhillComponent_N: parallelForce,
          friction_N: frictionForce,
          netAlongPlane_N: netForce,
        },
      })
      lastEmitRef.current = now
    })

    return () => {
      clearTimeout(trailResetTimeoutId)
      cleanupRef.current?.()
      engine.destroy()
      engineRef.current = null
    }
  }, [mass, angle, friction, completionThresholdX, rampAngle])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (isPlaying) {
      engine.startLoop()
      return () => engine.stopLoop()
    }
    engine.stopLoop()
    return undefined
  }, [isPlaying])

  useFrame(() => {
    const engine = engineRef.current
    if (!engine || isPlaying) return
    engine.step()
  })

  const blockPos = [blockState.x * SCENE_SCALE, -blockState.y * SCENE_SCALE, 0.15]
  const rampPos = [RAMP_CENTER_X * SCENE_SCALE, -RAMP_CENTER_Y * SCENE_SCALE, 0]

  const sinA = Math.sin(rampAngle)
  const cosA = Math.cos(rampAngle)
  const gForce = mass * GRAVITY
  const nForce = Math.max(0, gForce * cosA)
  const drivingForce = gForce * sinA
  const maxStaticFriction = friction * nForce
  const isStatic = Math.abs(drivingForce) <= maxStaticFriction + 1e-9
  const frictionForce = isStatic ? -drivingForce : -Math.sign(drivingForce || 1) * friction * nForce
  const netForce = drivingForce + frictionForce
  const acceleration = mass > 0 ? netForce / mass : 0

  return (
    <>
      <fog attach="fog" args={['#08121f', 8, 28]} />
      <Environment preset="city" intensity={0.16} />
      <ambientLight intensity={0.28} color="#9ab8e0" />
      <directionalLight position={[6, 7, 5]} intensity={1.05} />
      <pointLight position={[-4, 2, 3]} intensity={0.55} color="#00f5ff" />
      <pointLight position={[4, 2, -3]} intensity={0.35} color="#ff9a5a" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4, -4.8, 0]}>
        <planeGeometry args={[18, 18]} />
        <meshPhysicalMaterial color="#0c1626" metalness={0.45} roughness={0.3} />
      </mesh>
      <Grid
        position={[4, -4.75, 0]}
        args={[18, 18]}
        cellSize={0.35}
        cellThickness={0.5}
        sectionSize={1.75}
        sectionThickness={1}
        cellColor="#26455f"
        sectionColor="#3b6788"
        fadeDistance={18}
        fadeStrength={1}
      />

      <mesh position={rampPos} rotation={[0, 0, -rampAngle]}>
        <boxGeometry args={[RAMP_LENGTH * SCENE_SCALE, RAMP_THICKNESS * SCENE_SCALE, 0.35]} />
        <meshPhysicalMaterial color="#8f99a8" metalness={0.55} roughness={0.3} clearcoat={0.45} />
      </mesh>

      <mesh position={blockPos} rotation={[0, 0, blockState.angle]}>
        <boxGeometry args={[blockSize * SCENE_SCALE, blockSize * SCENE_SCALE, blockSize * SCENE_SCALE]} />
        <meshPhysicalMaterial
          color="#00f5ff"
          metalness={0.45}
          roughness={0.25}
          clearcoat={0.6}
          transmission={0.08}
          emissive="#00f5ff"
          emissiveIntensity={0.15}
        />
      </mesh>

      {trail.length > 1 && <Line points={trail} color="#00ffff" transparent opacity={0.6} lineWidth={2} />}

      <FrostedLabel position={[blockPos[0], blockPos[1] + 0.7, 0.2]} color="#00f5ff">
        {`v = ${(blockState.velocity * SCENE_SCALE).toFixed(2)} m/s`}
      </FrostedLabel>
      <FrostedLabel position={[2.4, 2.2, 0]} color="#ff8844">{`Fnet = ${netForce.toFixed(2)} N`}</FrostedLabel>
      <FrostedLabel position={[2.4, 1.8, 0]} color="#88ff88">{`μ = ${friction.toFixed(2)} | θ = ${angle.toFixed(1)}°`}</FrostedLabel>
      <FrostedLabel position={[2.4, 1.4, 0]} color="#ffaa66">{`${isStatic ? 'Static' : 'Kinetic'} friction | a = ${acceleration.toFixed(2)} m/s²`}</FrostedLabel>

      <EffectComposer>
        <Bloom intensity={0.4} luminanceThreshold={0.55} luminanceSmoothing={0.9} mipmapBlur />
        <Vignette offset={0.25} darkness={0.45} />
      </EffectComposer>
    </>
  )
}

function InclinedPlane(props) {
  const variables = normalizeInputs({
    mass: props.mass,
    angle: props.angle,
    friction: props.friction,
  })

  return (
    <div className="relative h-full w-full rounded-[24px] border border-[rgba(0,245,255,0.14)] bg-[#07111f]/85">
      <Canvas
        camera={{ position: [4.5, -0.8, 10], fov: 50 }}
        style={{ width: '100%', height: '100%', background: '#07111f' }}
        onCreated={(state) => {
          try {
            state.gl.getContext('webgl2') || state.gl.getContext('webgl')
          } catch (error) {
            console.warn('WebGL initialization warning:', error)
          }
        }}
      >
        <InclinedScene
          mass={variables.mass}
          angle={variables.angle}
          friction={variables.friction}
          isPlaying={Boolean(props.isPlaying)}
          onComplete={props.onComplete}
          onDataPoint={props.onDataPoint}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={6}
          maxDistance={20}
          autoRotate={!props.isPlaying}
          autoRotateSpeed={0.14}
        />
      </Canvas>
    </div>
  )
}

InclinedPlane.getSceneConfig = function getSceneConfig(variables) {
  const normalized = normalizeInputs(variables)
  const theta = (normalized.angle * Math.PI) / 180
  const weight = normalized.mass * GRAVITY
  const normal = Math.max(0, weight * Math.cos(theta))
  const parallel = weight * Math.sin(theta)
  const staticLimit = normalized.friction * normal
  const isStatic = Math.abs(parallel) <= staticLimit + 1e-6
  // With a single μ control in this UI, we use μs = μk = μ for consistency
  // so that a = g(sinθ - μcosθ) matches the displayed formula.
  const frictionForce = isStatic ? -parallel : -Math.sign(parallel || 1) * normalized.friction * normal
  const net = parallel + frictionForce
  return {
    backgroundColor: '#07111f',
    showGrid: true,
    variables: normalized,
    objects: [
      { id: 'inclined-plane-ramp', type: 'box' },
      { id: BLOCK_ID, type: 'box' },
    ],
    physics: {
      gravity: GRAVITY,
      normalForce_N: normal,
      parallelComponent_N: parallel,
      frictionLimit_N: staticLimit,
      frictionForce_N: frictionForce,
      frictionRegime: isStatic ? 'static' : 'kinetic',
      netForce_N: net,
      acceleration_mps2: normalized.mass > 0 ? net / normalized.mass : 0,
    },
  }
}

export default InclinedPlane
