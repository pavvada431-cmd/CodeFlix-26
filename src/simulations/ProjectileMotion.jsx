import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Stars, Grid, Text, Html, Line, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Matter from 'matter-js';

const GRAVITY = -9.81;
const SCALE = 0.1;

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function calculateTrajectoryPoints(initialVelocity, launchAngle, initialHeight) {
  const points = [];
  const angleRad = (launchAngle * Math.PI) / 180;
  const vx = initialVelocity * Math.cos(angleRad);
  const vy = initialVelocity * Math.sin(angleRad);

  const totalTime = (-vy + Math.sqrt(vy * vy + 2 * GRAVITY * initialHeight)) / GRAVITY;
  const steps = 60;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * totalTime;
    const x = vx * t;
    const y = initialHeight + vy * t + 0.5 * GRAVITY * t * t;
    if (y >= 0) {
      points.push(new THREE.Vector3(x * SCALE, y * SCALE, 0));
    }
  }

  if (points.length > 0 && points[points.length - 1].y > 0) {
    const landingTime = totalTime;
    points.push(new THREE.Vector3(vx * landingTime * SCALE, 0, 0));
  }

  return points;
}

function FrostedLabel({ children, position, color = '#00f5ff', scale = [1, 0.3, 1] }) {
  return (
    <Html position={position} center distanceFactor={10} zIndexRange={[100, 0]}>
      <div
        style={{
          background: 'rgba(10, 15, 30, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${color}40`,
          borderRadius: '8px',
          padding: '8px 16px',
          color: color,
          fontFamily: 'monospace',
          fontSize: '14px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          boxShadow: `0 4px 20px ${color}20`,
        }}
      >
        {children}
      </div>
    </Html>
  );
}

function GlowTrail({ points, color = '#00ffff', opacity = 0.8 }) {
  const lineRef = useRef();

  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const positions = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [points]);

  if (!geometry || points.length < 2) return null;

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        linewidth={2}
      />
    </line>
  );
}

function SparkParticles({ position, active, color = '#ffaa00' }) {
  const particlesRef = useRef();
  const [particles, setParticles] = useState([]);
  const [opacity, setOpacity] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const velocitiesRef = useRef([]);

  useEffect(() => {
    if (active && !initialized) {
      const newParticles = [];
      const newVelocities = [];
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 1.2;
        newParticles.push({
          id: i,
          position: [0, 0, 0],
        });
        newVelocities.push({
          x: Math.cos(angle) * speed * SCALE,
          y: Math.random() * 0.6 * SCALE,
          z: Math.sin(angle) * speed * SCALE,
        });
      }
      setParticles(newParticles);
      velocitiesRef.current = newVelocities;
      setOpacity(1);
      setInitialized(true);
    }
    if (!active) {
      setInitialized(false);
      setParticles([]);
      setOpacity(0);
    }
  }, [active, initialized]);

  useFrame((state, delta) => {
    if (opacity > 0 && particles.length > 0) {
      setOpacity(prev => Math.max(0, prev - delta * 0.8));
    }
  });

  if (!active || particles.length === 0 || opacity === 0) return null;

  return (
    <group position={[position.x, position.y, position.z]}>
      {particles.map((p, i) => (
        <mesh key={p.id} position={[0, 0, 0]}>
          <sphereGeometry args={[0.04 * opacity, 8, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
}

function LaunchPlatform({ initialHeight }) {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, initialHeight * SCALE * 0.5, 0]}>
        <boxGeometry args={[0.8 * SCALE, initialHeight * SCALE, 0.8 * SCALE]} />
        <meshPhysicalMaterial
          color="#3a4a5a"
          metalness={0.7}
          roughness={0.3}
          clearcoat={0.5}
          clearcoatRoughness={0.2}
        />
      </mesh>
      <mesh position={[0, initialHeight * SCALE, 0]}>
        <boxGeometry args={[1.2 * SCALE, 0.1 * SCALE, 1.2 * SCALE]} />
        <meshPhysicalMaterial
          color="#4a5a6a"
          metalness={0.8}
          roughness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
          emissive="#00f5ff"
          emissiveIntensity={0.1}
        />
      </mesh>
      <pointLight
        position={[0, initialHeight * SCALE + 0.3, 0]}
        color="#00f5ff"
        intensity={2}
        distance={3}
      />
    </group>
  );
}

function PredictedTrajectory({ initialVelocity, launchAngle, initialHeight }) {
  const points = useMemo(() => {
    return calculateTrajectoryPoints(initialVelocity, launchAngle, initialHeight);
  }, [initialVelocity, launchAngle, initialHeight]);

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color="#ffaa00"
      lineWidth={2}
      dashed
      dashScale={50}
      dashSize={0.3}
      gapSize={0.15}
      transparent
      opacity={0.6}
    />
  );
}

function ProjectileBall({ position, isPlaying }) {
  const meshRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 8) * 0.1);
    }
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.25 * SCALE, 32, 32]} />
        <meshBasicMaterial color="#ff3333" transparent opacity={0.15} />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.2 * SCALE, 32, 32]} />
        <meshPhysicalMaterial
          color="#ff4444"
          metalness={0.4}
          roughness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
          emissive="#ff2222"
          emissiveIntensity={isPlaying ? 0.3 : 0.1}
          transmission={0.1}
        />
      </mesh>
      <pointLight color="#ff4444" intensity={1} distance={2} />
    </group>
  );
}

function GroundPlane() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshPhysicalMaterial
          color="#1a1a2e"
          metalness={0.2}
          roughness={0.8}
          clearcoat={0.3}
        />
      </mesh>
      <Grid
        position={[0, 0.001, 0]}
        args={[30, 30]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#2a3a4a"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#3a5a7a"
        fadeDistance={25}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial color="#0a0a0f" transparent opacity={0.0} />
      </mesh>
    </group>
  );
}

function MeasurementMarkers() {
  const markers = useMemo(() => {
    const items = [];
    for (let m = 10; m <= 100; m += 10) {
      items.push(
        <group key={m} position={[m * SCALE, 0.02, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.02, 0.3]} />
            <meshBasicMaterial color="#4a6a8a" />
          </mesh>
        </group>
      );
    }
    return items;
  }, []);

  return <>{markers}</>;
}

function SimulationScene({ initialVelocity, launchAngle, initialHeight, isPlaying }) {
  const engineRef = useRef();
  const ballBodyRef = useRef();

  const [trailPoints, setTrailPoints] = useState([]);
  const [hasLanded, setHasLanded] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(initialHeight);
  const [currentVelocity, setCurrentVelocity] = useState(initialVelocity);
  const [horizontalDistance, setHorizontalDistance] = useState(0);
  const [showMaxHeight, setShowMaxHeight] = useState(false);
  const [maxHeightReached, setMaxHeightReached] = useState(false);
  const [dustActive, setDustActive] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 0.5 * SCALE, y: initialHeight * SCALE, z: 0 });

  const prevHeight = useRef(initialHeight);
  const needsResetRef = useRef(false);
  const prevIsPlayingRef = useRef(false);

  useEffect(() => {
    const Engine = Matter.Engine;
    const engine = Engine.create({
      gravity: { x: 0, y: GRAVITY / SCALE, z: 0 },
    });
    engineRef.current = engine;

    const angleRad = (launchAngle * Math.PI) / 180;
    const ball = Matter.Bodies.circle(
      0.5 * SCALE,
      initialHeight * SCALE,
      0.2 * SCALE,
      {
        restitution: 0.3,
        friction: 0.5,
        label: 'ball',
      }
    );
    ballBodyRef.current = ball;
    Matter.Composite.add(engine.world, ball);

    Matter.Body.setVelocity(ball, {
      x: initialVelocity * SCALE * Math.cos(angleRad),
      y: initialVelocity * SCALE * Math.sin(angleRad),
      z: 0,
    });

    return () => {
      Matter.Engine.clear(engine);
    };
  }, [initialVelocity, launchAngle, initialHeight]);

  useEffect(() => {
    if (isPlaying && !prevIsPlayingRef.current) {
      needsResetRef.current = true;
    }
    prevIsPlayingRef.current = isPlaying;
  }, [isPlaying, initialVelocity, launchAngle, initialHeight]);

  useFrame((state, delta) => {
    if (!engineRef.current || !ballBodyRef.current) return;

    if (needsResetRef.current && isPlaying) {
      needsResetRef.current = false;
      const angleRad = (launchAngle * Math.PI) / 180;
      Matter.Body.setVelocity(ballBodyRef.current, {
        x: initialVelocity * SCALE * Math.cos(angleRad),
        y: initialVelocity * SCALE * Math.sin(angleRad),
        z: 0,
      });
      Matter.Body.setPosition(ballBodyRef.current, {
        x: 0.5 * SCALE,
        y: initialHeight * SCALE,
        z: 0,
      });
      setTrailPoints([]);
      setHasLanded(false);
      setMaxHeightReached(false);
      setShowMaxHeight(false);
      setDustActive(false);
      setBallPosition({ x: 0.5 * SCALE, y: initialHeight * SCALE, z: 0 });
    }

    if (!isPlaying) return;

    const clampedDelta = Math.min(delta, 0.05);
    Matter.Engine.update(engineRef.current, clampedDelta * 1000);

    const body = ballBodyRef.current;
    const pos = body.position;
    const vel = body.velocity;

    if (
      Math.abs(pos.x) > 10000 * SCALE ||
      Math.abs(pos.y) > 10000 * SCALE
    ) {
      needsResetRef.current = true;
      return;
    }

    const scaledHeight = pos.y / SCALE;
    const scaledVel = Math.sqrt(vel.x * vel.x + vel.y * vel.y) / SCALE;
    const scaledDist = pos.x / SCALE;

    setBallPosition({ x: pos.x, y: pos.y, z: pos.z });
    setCurrentHeight(Math.max(0, scaledHeight));
    setCurrentVelocity(Math.max(0, scaledVel));
    setHorizontalDistance(Math.max(0, scaledDist));

    if (scaledHeight > prevHeight.current && !maxHeightReached) {
      setShowMaxHeight(true);
    } else if (scaledHeight < prevHeight.current && !maxHeightReached) {
      setMaxHeightReached(true);
      setTimeout(() => setShowMaxHeight(false), 1000);
    }
    prevHeight.current = scaledHeight;

    setTrailPoints(prev => {
      const newPoints = [...prev, new THREE.Vector3(pos.x, pos.y, pos.z)];
      if (newPoints.length > 200) {
        return newPoints.slice(-200);
      }
      return newPoints;
    });

    if (pos.y <= 0.15 * SCALE && !hasLanded) {
      setHasLanded(true);
      setDustActive(true);
      Matter.Body.setVelocity(body, { x: 0, y: 0, z: 0 });
    }

    if (hasLanded && dustActive) {
      setTimeout(() => setDustActive(false), 2000);
    }
  });

  const maxHeight = useMemo(() => {
    const angleRad = (launchAngle * Math.PI) / 180;
    const vy = initialVelocity * Math.sin(angleRad);
    return initialHeight + (vy * vy) / (2 * Math.abs(GRAVITY));
  }, [initialVelocity, launchAngle, initialHeight]);

  return (
    <>
      <fog attach="fog" args={['#0a0a1a', 15, 40]} />

      <ambientLight intensity={0.3} color="#8888aa" />

      <directionalLight
        position={[10, 20, 5]}
        intensity={1.5}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      <pointLight position={[-5, 8, 3]} intensity={0.8} color="#4466aa" />
      <pointLight position={[5, 3, -3]} intensity={0.5} color="#aa6644" />
      <Environment preset="city" intensity={0.22} />

      <rectAreaLight
        position={[0, 5, -5]}
        rotation={[Math.PI / 4, 0, 0]}
        width={10}
        height={10}
        intensity={2}
        color="#00aaff"
      />

      <LaunchPlatform initialHeight={initialHeight} />

      <ProjectileBall position={ballPosition} isPlaying={isPlaying && !hasLanded} />

      <PredictedTrajectory
        initialVelocity={initialVelocity}
        launchAngle={launchAngle}
        initialHeight={initialHeight}
      />

      <GlowTrail
        points={trailPoints}
        color="#00ffff"
        opacity={0.6}
      />

      <SparkParticles position={ballPosition} active={dustActive} color="#ffaa44" />

      {!hasLanded && isPlaying && (
        <group>
          <FrostedLabel position={[ballPosition.x - 1.5, ballPosition.y + 0.8, 0]} color="#00ff88">
            Height: {currentHeight.toFixed(1)} m
          </FrostedLabel>
          <FrostedLabel position={[ballPosition.x - 1.5, ballPosition.y + 0.5, 0]} color="#ff8844">
            Vel: {currentVelocity.toFixed(1)} m/s
          </FrostedLabel>
          <FrostedLabel position={[ballPosition.x - 1.5, ballPosition.y + 0.2, 0]} color="#4488ff">
            Dist: {horizontalDistance.toFixed(1)} m
          </FrostedLabel>
          {showMaxHeight && (
            <FrostedLabel position={[ballPosition.x, maxHeight * SCALE + 0.3, 0]} color="#ff4444">
              MAX HEIGHT: {maxHeight.toFixed(1)} m
            </FrostedLabel>
          )}
        </group>
      )}

      {hasLanded && (
        <FrostedLabel position={[ballPosition.x, 0.5, 0]} color="#00ff88">
          Landed! Distance: {horizontalDistance.toFixed(1)} m
        </FrostedLabel>
      )}

      <GroundPlane />
      <MeasurementMarkers />

      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette offset={0.3} darkness={0.6} />
      </EffectComposer>
    </>
  );
}

export default function ProjectileMotion({
  initialVelocity = 30,
  launchAngle = 45,
  height = 2,
  isPlaying = false,
}) {
  return (
    <Canvas
      camera={{ position: [5, 4, 12], fov: 50 }}
      shadows
      style={{ width: '100%', height: '100%', background: '#0a0a1a' }}
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
      gl={{ 
        antialias: true, 
        alpha: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
      }}
    >
      <SimulationScene
        initialVelocity={initialVelocity}
        launchAngle={launchAngle}
        initialHeight={height}
        isPlaying={isPlaying}
      />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={22}
        autoRotate={!isPlaying}
        autoRotateSpeed={0.25}
      />
    </Canvas>
  );
}

ProjectileMotion.getSceneConfig = (variables = {}) => {
  const { initialVelocity = 30, launchAngle = 45, height = 2 } = variables;

  const angleRad = (launchAngle * Math.PI) / 180;
  const vx = initialVelocity * Math.cos(angleRad);
  const vy = initialVelocity * Math.sin(angleRad);
  const maxHeight = height + (vy * vy) / (2 * Math.abs(GRAVITY));
  const range = (2 * vx * vy) / Math.abs(GRAVITY);

  return {
    name: 'Projectile Motion',
    description: 'Physics simulation of projectile motion with Matter.js',
    camera: { position: [5, 5, 10], fov: 50 },
    lighting: [
      { type: 'ambient', intensity: 0.5 },
      { type: 'directional', position: [10, 20, 5], intensity: 1 },
    ],
    objects: [
      { type: 'launch-platform', position: [0, 0, 0], height },
      { type: 'ball', position: [0.5, height, 0] },
      { type: 'trajectory-line', dashed: true, color: '#ffaa00' },
      { type: 'ground-grid', size: 20, markingsInterval: 10 },
    ],
    predictedTrajectory: calculateTrajectoryPoints(initialVelocity, launchAngle, height).map(
      p => ({ x: p.x / SCALE, y: p.y / SCALE, z: p.z / SCALE })
    ),
    physics: {
      gravity: GRAVITY,
      initialVelocity,
      launchAngle,
      initialHeight: height,
    },
    calculations: {
      maxHeight: maxHeight.toFixed(2),
      range: range.toFixed(2),
      timeOfFlight: (2 * vy / Math.abs(GRAVITY)).toFixed(2),
    },
  };
};
