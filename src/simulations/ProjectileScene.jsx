import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, OrbitControls, Sparkles, Stars } from '@react-three/drei'

function MovingProjectile({ points }) {
  const orbRef = useRef(null)

  useFrame(({ clock }) => {
    if (!orbRef.current || points.length === 0) {
      return
    }

    const loopProgress = (clock.getElapsedTime() % 5) / 5
    const progress = loopProgress * (points.length - 1)
    const lowerIndex = Math.floor(progress)
    const upperIndex = Math.min(lowerIndex + 1, points.length - 1)
    const blend = progress - lowerIndex
    const lowerPoint = points[lowerIndex]
    const upperPoint = points[upperIndex]

    orbRef.current.position.set(
      lowerPoint[0] + (upperPoint[0] - lowerPoint[0]) * blend,
      lowerPoint[1] + (upperPoint[1] - lowerPoint[1]) * blend,
      lowerPoint[2] + (upperPoint[2] - lowerPoint[2]) * blend,
    )
  })

  return (
    <>
      <Line
        points={points}
        color="#00f5ff"
        lineWidth={2.4}
        transparent
        opacity={0.95}
      />

      <mesh
        ref={orbRef}
        castShadow
        position={points[0] ?? [0, 0, 0]}
      >
        <sphereGeometry args={[0.17, 32, 32]} />
        <meshStandardMaterial
          color="#00f5ff"
          emissive="#00f5ff"
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>
    </>
  )
}

function ProjectileScene({ solution }) {
  const groundWidth = Math.max(solution.sceneBounds.range + 4.5, 10)
  const targetX = Math.max(solution.sceneBounds.range * 0.35, 1.4)
  const landingPoint = solution.scenePoints[solution.scenePoints.length - 1] ?? [
    0,
    0,
    0,
  ]

  return (
    <>
      <color attach="background" args={['#09101f']} />
      <fog attach="fog" args={['#09101f', 11, 24]} />

      <ambientLight intensity={0.9} />
      <directionalLight
        castShadow
        position={[7, 10, 6]}
        intensity={1.6}
        color="#ffffff"
      />
      <spotLight
        castShadow
        position={[4, 12, 4]}
        angle={0.35}
        penumbra={1}
        intensity={70}
        color="#00f5ff"
      />

      <Stars radius={42} depth={18} count={1400} factor={4} fade speed={0.8} />
      <Sparkles
        count={45}
        scale={[groundWidth, 5, 8]}
        size={2.2}
        speed={0.35}
        color="#00f5ff"
        position={[targetX, 1.8, 0]}
      />

      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[groundWidth, 12]} />
          <meshStandardMaterial color="#07101d" roughness={0.86} metalness={0.28} />
        </mesh>

        <gridHelper
          args={[groundWidth, 28, '#00f5ff', '#132742']}
          position={[groundWidth / 2 - 1, 0.015, 0]}
        />

        <Line
          points={[
            [0, 0, 0],
            [0, Math.max(solution.sceneBounds.height, 2.2), 0],
          ]}
          color="#3b82f6"
          lineWidth={1.4}
          transparent
          opacity={0.4}
        />

        <MovingProjectile points={solution.scenePoints} />

        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={landingPoint}
        >
          <ringGeometry args={[0.26, 0.38, 32]} />
          <meshBasicMaterial color="#00f5ff" transparent opacity={0.8} />
        </mesh>
      </group>

      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={18}
        maxPolarAngle={Math.PI / 2.04}
        target={[targetX, 1.4, 0]}
      />
    </>
  )
}

export default ProjectileScene
