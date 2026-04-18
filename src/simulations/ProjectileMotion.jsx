import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Stars, Grid, Text, Html, Line, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { FrostedLabel, GlowTrail } from './shared/SimulationPrimitives';

const G_MAGNITUDE = 9.81;
const GRAVITY = -G_MAGNITUDE;
const SCALE = 0.1;
const PROJECTILE_MASS_KG = 1;
const DRAG_COEFFICIENT_SPHERE = 0.47;
const AIR_DENSITY_KG_M3 = 1.225;
const PROJECTILE_AREA_M2 = 0.01;

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function solveProjectileKinematics(initialVelocity, launchAngle, initialHeight) {
  const safeSpeed = Math.max(0, Number(initialVelocity) || 0);
  const safeHeight = Math.max(0, Number(initialHeight) || 0);
  const angleRad = ((Number(launchAngle) || 0) * Math.PI) / 180;
  const vx = safeSpeed * Math.cos(angleRad);
  const vy = safeSpeed * Math.sin(angleRad);
  // Vertical kinematics in SI units:
  // y(t) = h0 + vy0*t - 1/2*g*t^2, with g = +9.81 m/s² downward.
  // Setting y(t)=0 gives: (1/2)g t² - vy0 t - h0 = 0.
  // The physically valid landing time is the non-negative root:
  // t_flight = (vy0 + sqrt(vy0² + 2gh0)) / g.
  const discriminant = Math.max(0, vy * vy + 2 * G_MAGNITUDE * safeHeight);
  const timeOfFlight = Math.max(0, (vy + Math.sqrt(discriminant)) / G_MAGNITUDE);
  const timeToApex = vy > 0 ? vy / G_MAGNITUDE : 0;
  const maxHeight = safeHeight + (vy > 0 ? (vy * vy) / (2 * G_MAGNITUDE) : 0);
  const range = Math.max(0, vx * timeOfFlight);
  return { vx, vy, timeOfFlight, maxHeight, range, angleRad, timeToApex };
}

function calculateTrajectoryPoints(initialVelocity, launchAngle, initialHeight) {
  const points = [];
  const { vx, vy, timeOfFlight } = solveProjectileKinematics(initialVelocity, launchAngle, initialHeight);
  const safeHeight = Math.max(0, Number(initialHeight) || 0);
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * timeOfFlight;
    const x = vx * t;
    const y = Math.max(0, safeHeight + vy * t + 0.5 * GRAVITY * t * t);
    points.push(new THREE.Vector3(x * SCALE, y * SCALE, 0));
  }
  return points;
}

function buildProjectileGraphData(initialVelocity, launchAngle, initialHeight, sampleCount = 60) {
  const { vx, vy, timeOfFlight, maxHeight, range } = solveProjectileKinematics(initialVelocity, launchAngle, initialHeight);
  const safeHeight = Math.max(0, Number(initialHeight) || 0);
  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    const t = timeOfFlight > 0 ? (index / sampleCount) * timeOfFlight : 0;
    const y = Math.max(0, safeHeight + vy * t + 0.5 * GRAVITY * t * t);
    return {
      t,
      x_m: vx * t,
      y_m: y,
      vx_mps: vx,
      vy_mps: vy + GRAVITY * t,
      speed_mps: Math.hypot(vx, vy + GRAVITY * t),
      range_m: range,
      maxHeight_m: maxHeight,
    };
  });
}

function SparkParticles({ position, active, color = '#ffaa00' }) {
  const particlesRef = useRef();
  const [particles, setParticles] = useState([]);
  const [opacity, setOpacity] = useState(0);
  const initializedRef = useRef(false);
  const velocitiesRef = useRef([]);

  useEffect(() => {
    if (active && !initializedRef.current) {
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
      initializedRef.current = true;
    }
    if (!active) {
      initializedRef.current = false;
      setParticles([]);
      setOpacity(0);
    }
  }, [active]);

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

function SimulationScene({ initialVelocity, launchAngle, initialHeight, isPlaying, onDataPoint }) {
  const launchOffsetX = 0.5;
  const [trailPoints, setTrailPoints] = useState([]);
  const [hasLanded, setHasLanded] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(Math.max(0, initialHeight));
  const [currentVelocity, setCurrentVelocity] = useState(Math.max(0, initialVelocity));
  const [horizontalDistance, setHorizontalDistance] = useState(0);
  const [showMaxHeight, setShowMaxHeight] = useState(false);
  const [maxHeightReached, setMaxHeightReached] = useState(false);
  const [dustActive, setDustActive] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: launchOffsetX * SCALE, y: Math.max(0, initialHeight) * SCALE, z: 0 });

  const needsResetRef = useRef(false);
  const prevIsPlayingRef = useRef(false);
  const elapsedRef = useRef(0);
  const dustTimeoutRef = useRef(null);
  const maxHeightTimeoutRef = useRef(null);
  const landingTriggeredRef = useRef(false);

  const kinematics = useMemo(
    () => solveProjectileKinematics(initialVelocity, launchAngle, initialHeight),
    [initialVelocity, launchAngle, initialHeight]
  );

  useEffect(() => {
    return () => {
      if (dustTimeoutRef.current) clearTimeout(dustTimeoutRef.current);
      if (maxHeightTimeoutRef.current) clearTimeout(maxHeightTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isPlaying && !prevIsPlayingRef.current) {
      needsResetRef.current = true;
    }
    prevIsPlayingRef.current = isPlaying;
  }, [isPlaying, initialVelocity, launchAngle, initialHeight]);

  useFrame((_, delta) => {
    if (needsResetRef.current && isPlaying) {
      needsResetRef.current = false;
      setTrailPoints([]);
      setHasLanded(false);
      setMaxHeightReached(false);
      setShowMaxHeight(false);
      setDustActive(false);
      setBallPosition({ x: launchOffsetX * SCALE, y: Math.max(0, initialHeight) * SCALE, z: 0 });
      setCurrentHeight(Math.max(0, initialHeight));
      setCurrentVelocity(Math.max(0, initialVelocity));
      setHorizontalDistance(0);
      elapsedRef.current = 0;
      landingTriggeredRef.current = false;
      if (dustTimeoutRef.current) clearTimeout(dustTimeoutRef.current);
      if (maxHeightTimeoutRef.current) clearTimeout(maxHeightTimeoutRef.current);
    }

    if (!isPlaying) return;
    if (landingTriggeredRef.current) return;

    const clampedDelta = Math.min(delta, 0.05);
    const t = Math.min(kinematics.timeOfFlight, elapsedRef.current + clampedDelta);
    elapsedRef.current = t;

    // Vacuum projectile equations (SI):
    // x(t)=vx0*t, y(t)=h0+vy0*t-(1/2)gt², vx(t)=constant, vy(t)=vy0-gt.
    const safeHeight = Math.max(0, Number(initialHeight) || 0);
    const xFromLaunch = kinematics.vx * t;
    const y = Math.max(0, safeHeight + kinematics.vy * t + 0.5 * GRAVITY * t * t);
    const vx = kinematics.vx;
    const vy = kinematics.vy + GRAVITY * t;
    const speed = Math.hypot(vx, vy);

    setBallPosition({ x: (launchOffsetX + xFromLaunch) * SCALE, y: y * SCALE, z: 0 });
    setCurrentHeight(y);
    setCurrentVelocity(speed);
    setHorizontalDistance(Math.max(0, xFromLaunch));

    const kineticEnergy = 0.5 * PROJECTILE_MASS_KG * speed * speed;
    const potentialEnergy = PROJECTILE_MASS_KG * G_MAGNITUDE * y;
    const theoreticalRange = (Math.max(0, Number(initialVelocity) || 0) ** 2 * Math.sin(2 * kinematics.angleRad)) / G_MAGNITUDE;
    const theoreticalMaxHeight = (Math.max(0, kinematics.vy) ** 2) / (2 * G_MAGNITUDE) + Math.max(0, Number(initialHeight) || 0);
    const theoreticalTimeOfFlight = kinematics.timeOfFlight;
    onDataPoint?.({
      t_s: t,
      x_m: Math.max(0, xFromLaunch),
      y_m: y,
      range_vs_time_m: Math.max(0, xFromLaunch),
      height_vs_time_m: y,
      vx_mps: vx,
      vy_mps: vy,
      speed_mps: speed,
      ax_mps2: 0,
      ay_mps2: GRAVITY,
      g_mps2: G_MAGNITUDE,
      kineticEnergy_J: kineticEnergy,
      potentialEnergy_J: potentialEnergy,
      mechanicalEnergy_J: kineticEnergy + potentialEnergy,
      range_m: kinematics.range,
      maxHeight_m: kinematics.maxHeight,
      timeOfFlight_s: kinematics.timeOfFlight,
      timeToApex_s: kinematics.timeToApex,
      rangeFormula_m: theoreticalRange,
      maxHeightFormula_m: theoreticalMaxHeight,
      timeOfFlightFormula_s: theoreticalTimeOfFlight,
      dragCoefficient: DRAG_COEFFICIENT_SPHERE,
      dragEnabled: false,
    });

    if (!maxHeightReached && t <= kinematics.timeToApex + 1e-6) {
      setShowMaxHeight(true);
    } else if (!maxHeightReached && t > kinematics.timeToApex) {
      setMaxHeightReached(true);
      if (maxHeightTimeoutRef.current) clearTimeout(maxHeightTimeoutRef.current);
      maxHeightTimeoutRef.current = setTimeout(() => setShowMaxHeight(false), 1000);
    }

    setTrailPoints(prev => {
      const newPoints = [...prev, new THREE.Vector3((launchOffsetX + xFromLaunch) * SCALE, y * SCALE, 0)];
      if (newPoints.length > 200) {
        return newPoints.slice(-200);
      }
      return newPoints;
    });

    if (t >= kinematics.timeOfFlight - 1e-4 && !landingTriggeredRef.current) {
      landingTriggeredRef.current = true;
      setHasLanded(true);
      setDustActive(true);
      if (dustTimeoutRef.current) clearTimeout(dustTimeoutRef.current);
      dustTimeoutRef.current = setTimeout(() => setDustActive(false), 2000);
    }
  });

  const maxHeight = kinematics.maxHeight;

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
  onDataPoint,
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
        onDataPoint={onDataPoint}
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
  const { vx, vy, maxHeight, range, timeOfFlight } = solveProjectileKinematics(initialVelocity, launchAngle, height);
  const graphData = buildProjectileGraphData(initialVelocity, launchAngle, height);

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
    graphData,
    physics: {
      gravity: -G_MAGNITUDE,
      initialVelocity,
      launchAngle,
      initialHeight: height,
      initialVelocityComponents: { vx_mps: vx, vy_mps: vy },
    },
    calculations: {
      gravity: `g = 9.81 m/s²`,
      horizontalRangeFormula: `R = v²sin(2θ)/g = ${range.toFixed(2)} m`,
      maximumHeightFormula: `H = h₀ + v²sin²(θ)/(2g) = ${maxHeight.toFixed(2)} m`,
      timeOfFlightFormula: `T = (v·sinθ + √((v·sinθ)² + 2gh₀))/g = ${timeOfFlight.toFixed(2)} s`,
      maxHeight: maxHeight.toFixed(2),
      range: range.toFixed(2),
      timeOfFlight: timeOfFlight.toFixed(2),
    },
  };
};
