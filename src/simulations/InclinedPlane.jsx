import { useEffect, useMemo, useRef, useState } from 'react'
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

function InclinedScene({ mass, angle, friction, isPlaying, onComplete }) {
  const [blockState, setBlockState] = useState({ x: 0, y: 0, angle: 0, velocity: 0 })
  const [trail, setTrail] = useState([])
  const [completed, setCompleted] = useState(false)
  const engineRef = useRef(null)
  const cleanupRef = useRef(null)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const rampAngle = (angle * Math.PI) / 180
  const blockSize = Math.max(28, Math.min(64, Math.sqrt(mass) * 14))
  const completionThresholdX = RAMP_CENTER_X + Math.cos(rampAngle) * (RAMP_LENGTH / 2 - blockSize * 0.85)

  useEffect(() => {
    const engine = createInclinedPlaneWorld(mass, angle, friction)
    engine.stopLoop()
    engineRef.current = engine
    setCompleted(false)
    setTrail([])

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
      setTrail((prev) => [...prev.slice(-119), [blockStateRaw.x * SCENE_SCALE, -blockStateRaw.y * SCENE_SCALE + 0.2, 0.15]])

      if (!completed && blockStateRaw.x >= completionThresholdX) {
        setCompleted(true)
        onCompleteRef.current?.(velocity)
      }
    })

    return () => {
      cleanupRef.current?.()
      engine.destroy()
      engineRef.current = null
    }
  }, [mass, angle, friction, completionThresholdX, completed])

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
  const nForce = gForce * cosA
  const netForce = Math.max(gForce * sinA - friction * nForce, 0)

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
        {`v = ${blockState.velocity.toFixed(2)} m/s`}
      </FrostedLabel>
      <FrostedLabel position={[2.4, 2.2, 0]} color="#ff8844">{`Fnet = ${netForce.toFixed(2)} N`}</FrostedLabel>
      <FrostedLabel position={[2.4, 1.8, 0]} color="#88ff88">{`μ = ${friction.toFixed(2)} | θ = ${angle.toFixed(1)}°`}</FrostedLabel>

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
  return {
    backgroundColor: '#07111f',
    showGrid: true,
    variables: normalized,
    objects: [
      { id: 'inclined-plane-ramp', type: 'box' },
      { id: BLOCK_ID, type: 'box' },
    ],
  }
}

export default InclinedPlane
