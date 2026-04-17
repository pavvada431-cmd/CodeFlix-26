import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Grid, Text, Html, Line, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

const GRAVITY = -9.81;
const SCALE = 0.1;

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

function ForceArrow({ position, direction, length, color, label }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const hw = 0.05;
    shape.moveTo(0, length);
    shape.lineTo(-hw, length - 0.15);
    shape.lineTo(-hw * 0.4, length - 0.15);
    shape.lineTo(-hw * 0.4, 0);
    shape.lineTo(hw * 0.4, 0);
    shape.lineTo(hw * 0.4, length - 0.15);
    shape.lineTo(hw, length - 0.15);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false });
  }, [length]);

  const rotation = useMemo(() => {
    const angle = Math.atan2(direction[0], -direction[1]);
    return [0, 0, -angle];
  }, [direction]);

  if (length < 0.1) return null;

  return (
    <group position={position}>
      <mesh geometry={geometry} rotation={rotation} position={[0, 0, 0.1]}>
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.9}
        />
      </mesh>
      {label && (
        <FrostedLabel position={[direction[0] * 0.8, direction[1] * 0.8, 0.3]} color={color}>
          {label}
        </FrostedLabel>
      )}
    </group>
  );
}

function PendulumScene({
  length,
  mass,
  initialAngle,
  damping,
  isPlaying,
  onDataPoint,
}) {
  const pivotRef = useRef();
  const rodRef = useRef();
  const bobRef = useRef();
  const thetaRef = useRef((initialAngle * Math.PI) / 180);
  const omegaRef = useRef(0);
  const forceArrowTangentRef = useRef();
  const forceArrowCentripetalRef = useRef();

  const [tracePoints, setTracePoints] = useState([]);
  const [amplitude, setAmplitude] = useState(Math.abs(initialAngle));
  const showForces = true;

  const timeRef = useRef(0);
  const lastDataRef = useRef(0);
  const initialEnergyRef = useRef(0);
  const needsResetRef = useRef(false);
  const prevIsPlayingRef = useRef(false);

  const maxLeftAngle = useMemo(() => -Math.abs(initialAngle), [initialAngle]);
  const maxRightAngle = useMemo(() => Math.abs(initialAngle), [initialAngle]);

  useEffect(() => {
    if (isPlaying && !prevIsPlayingRef.current) {
      needsResetRef.current = true;
    }
    prevIsPlayingRef.current = isPlaying;
  }, [isPlaying, initialAngle, length, mass, damping]);

  useFrame((_, delta) => {
    const safeLength = Math.max(0.05, Number(length) || 0.05);
    const safeMass = Math.max(0.01, Number(mass) || 0.01);
    const dampingCoeff = Math.max(0, Number(damping) || 0);

    if (needsResetRef.current && isPlaying) {
      needsResetRef.current = false;
      timeRef.current = 0;
      lastDataRef.current = 0;
      thetaRef.current = (initialAngle * Math.PI) / 180;
      omegaRef.current = 0;
      // Reference energy at t=0 for drift checks.
      initialEnergyRef.current = safeMass * Math.abs(GRAVITY) * safeLength * (1 - Math.cos(thetaRef.current));

      setTracePoints([]);
      setAmplitude(Math.abs(initialAngle));
    }

    if (!isPlaying) return;

    const clampedDelta = Math.min(delta, 0.05);
    const subSteps = Math.max(1, Math.ceil(clampedDelta / 0.01));
    const dt = clampedDelta / subSteps;
    // Nonlinear damped pendulum equation (undergraduate level):
    // θ'' = -(g/L)sin(θ) - bθ'
    // where b has units s^-1 (effective angular damping coefficient).
    for (let i = 0; i < subSteps; i++) {
      const theta = thetaRef.current;
      const omega = omegaRef.current;
      const alpha = -(Math.abs(GRAVITY) / safeLength) * Math.sin(theta) - dampingCoeff * omega;
      omegaRef.current += alpha * dt;
      thetaRef.current += omegaRef.current * dt;
    }

    const angle = thetaRef.current;
    const angleDeg = (angle * 180) / Math.PI;
    const pivotY = safeLength * SCALE;
    const bobX = Math.sin(angle) * safeLength * SCALE;
    const bobY = pivotY - Math.cos(angle) * safeLength * SCALE;
    const tangentialVelocity = omegaRef.current * safeLength;
    const alpha = -(Math.abs(GRAVITY) / safeLength) * Math.sin(angle) - dampingCoeff * omegaRef.current;
    const tangentialAcceleration = alpha * safeLength;
    const radialAcceleration = omegaRef.current * omegaRef.current * safeLength;
    const tangentForce = safeMass * tangentialAcceleration;
    const centripetalForce = safeMass * radialAcceleration;
    const tensionForce = Math.max(0, safeMass * (Math.abs(GRAVITY) * Math.cos(angle) + radialAcceleration));
    const smallAnglePeriod = 2 * Math.PI * Math.sqrt(safeLength / Math.abs(GRAVITY));
    const dampingDiscriminant = Math.max(0, Math.abs(GRAVITY) / safeLength - (dampingCoeff * dampingCoeff) / 4);
    const dampedAngularFrequency = dampingDiscriminant > 0 ? Math.sqrt(dampingDiscriminant) : 0;
    const dampedPeriod = dampedAngularFrequency > 1e-9 ? (2 * Math.PI) / dampedAngularFrequency : Infinity;

    const currentAmplitude = Math.abs(angleDeg);
    if (currentAmplitude < amplitude * 0.9) {
      setAmplitude(currentAmplitude);
    }

    if (rodRef.current && bobRef.current) {
      const rodLength = safeLength * SCALE;
      rodRef.current.position.set(0, pivotY - rodLength / 2, 0);
      rodRef.current.rotation.z = angle;
      rodRef.current.scale.y = rodLength / 2;

      bobRef.current.position.set(bobX, bobY, 0);
    }

    if (pivotRef.current) {
      pivotRef.current.position.set(0, pivotY, 0);
    }

    setTracePoints(prev => [...prev.slice(-299), new THREE.Vector3(bobX, bobY, 0)]);

    timeRef.current += clampedDelta;

    if (onDataPoint && timeRef.current - lastDataRef.current >= 0.05) {
      const potentialEnergy = safeMass * Math.abs(GRAVITY) * safeLength * (1 - Math.cos(angle));
      const kineticEnergy = 0.5 * safeMass * tangentialVelocity * tangentialVelocity;
      const totalEnergy = kineticEnergy + potentialEnergy;
      const referenceEnergy = Math.max(1e-9, initialEnergyRef.current || totalEnergy);
      const energyDriftPercent = ((totalEnergy - referenceEnergy) / referenceEnergy) * 100;
      onDataPoint({
        t_s: timeRef.current,
        theta_rad: angle,
        angle_deg: angleDeg,
        angle: angleDeg,
        angularVelocity_radps: omegaRef.current,
        angularAcceleration_radps2: alpha,
        tangentialVelocity_mps: tangentialVelocity,
        tangentialAcceleration_mps2: tangentialAcceleration,
        radialAcceleration_mps2: radialAcceleration,
        velocity_mps: tangentialVelocity,
        velocity: tangentialVelocity,
        tangentialForce_N: tangentForce,
        centripetalForce_N: centripetalForce,
        tension_N: tensionForce,
        kineticEnergy_J: kineticEnergy,
        potentialEnergy_J: potentialEnergy,
        totalEnergy_J: totalEnergy,
        energyDrift_percent: energyDriftPercent,
        smallAnglePeriod_s: smallAnglePeriod,
        dampedPeriod_s: Number.isFinite(dampedPeriod) ? dampedPeriod : null,
        dampingCoefficient_per_s: dampingCoeff,
      });
      lastDataRef.current = timeRef.current;
    }

    if (forceArrowTangentRef.current) {
      const tangentScale = Math.abs(tangentForce) * 0.01 * SCALE;
      const tangentDir = tangentForce > 0 ? 1 : -1;
      forceArrowTangentRef.current.position.set(
        bobX + tangentDir * 0.3 * SCALE,
        bobY - 0.3 * SCALE,
        0.2
      );
      forceArrowTangentRef.current.scale.set(tangentScale, 0.1, 0.1);
    }

    if (forceArrowCentripetalRef.current) {
      const centripetalScale = centripetalForce * 0.01 * SCALE;
      const toPivot = { x: -bobX, y: pivotY - bobY };
      const mag = Math.sqrt(toPivot.x * toPivot.x + toPivot.y * toPivot.y);
      if (mag > 0) {
        forceArrowCentripetalRef.current.position.set(
          bobX + (toPivot.x / mag) * 0.3 * SCALE,
          bobY + (toPivot.y / mag) * 0.3 * SCALE,
          0.2
        );
        const arrowAngle = Math.atan2(toPivot.y, toPivot.x);
        forceArrowCentripetalRef.current.rotation.z = arrowAngle;
        forceArrowCentripetalRef.current.scale.set(centripetalScale, 0.1, 0.1);
      }
    }
  });

  const traceOpacity = useMemo(() => {
    if (damping === 0) return 0.4;
    const initialAmplitude = Math.max(1e-6, Math.abs(initialAngle));
    return Math.max(0.1, 0.6 - (amplitude / initialAmplitude) * 0.5);
  }, [damping, amplitude, initialAngle]);

  const ghostLeftAngle = maxLeftAngle * Math.PI / 180;
  const ghostRightAngle = maxRightAngle * Math.PI / 180;

  return (
    <>
      <fog attach="fog" args={['#0a0a1a', 15, 40]} />

      <ambientLight intensity={0.3} color="#8888aa" />

      <directionalLight
        position={[10, 20, 5]}
        intensity={1.5}
        color="#ffffff"
        castShadow
      />

      <pointLight position={[-5, 8, 3]} intensity={0.8} color="#4466aa" />
      <pointLight position={[5, 3, -3]} intensity={0.5} color="#aa6644" />
      <Environment preset="warehouse" intensity={0.2} />

      <mesh ref={pivotRef} position={[0, length * SCALE, 0]}>
        <sphereGeometry args={[0.15 * SCALE, 32, 32]} />
        <meshPhysicalMaterial
          color="#667788"
          metalness={0.9}
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>

      <mesh ref={rodRef}>
        <cylinderGeometry args={[0.04 * SCALE, 0.04 * SCALE, 2, 16]} />
        <meshPhysicalMaterial
          color="#99aabb"
          metalness={0.8}
          roughness={0.2}
          clearcoat={0.8}
        />
      </mesh>

      <group>
        <mesh ref={bobRef} position={[0, 0, 0]}>
          <sphereGeometry args={[mass * 0.15 * SCALE, 32, 32]} />
          <meshPhysicalMaterial
            color="#ff5555"
            metalness={0.4}
            roughness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.1}
            emissive="#ff3333"
            emissiveIntensity={isPlaying ? 0.2 : 0.05}
          />
        </mesh>
        <pointLight
          position={[0, 0, 0]}
          color="#ff4444"
          intensity={0.5}
          distance={1}
        />
      </group>

      {showForces && isPlaying && (
        <>
          <mesh ref={forceArrowTangentRef} position={[0, 0, 0.2]}>
            <boxGeometry args={[1, 0.1, 0.1]} />
            <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
          </mesh>
          <mesh ref={forceArrowCentripetalRef} position={[0, 0, 0.2]}>
            <boxGeometry args={[1, 0.1, 0.1]} />
            <meshBasicMaterial color="#00ff88" transparent opacity={0.8} />
          </mesh>
        </>
      )}

      <GlowTrail points={tracePoints} color="#00ffff" opacity={traceOpacity} />

      <group position={[0, length * SCALE, 0]}>
        <mesh
          position={[
            Math.sin(ghostLeftAngle) * length * SCALE * 0.8,
            -Math.cos(ghostLeftAngle) * length * SCALE * 0.8,
            -0.5,
          ]}
        >
          <sphereGeometry args={[mass * 0.15 * SCALE, 16, 16]} />
          <meshPhysicalMaterial
            color="#ff5555"
            transparent
            opacity={0.15}
            metalness={0.4}
            roughness={0.3}
          />
        </mesh>
        <mesh
          position={[
            Math.sin(ghostRightAngle) * length * SCALE * 0.8,
            -Math.cos(ghostRightAngle) * length * SCALE * 0.8,
            -0.5,
          ]}
        >
          <sphereGeometry args={[mass * 0.15 * SCALE, 16, 16]} />
          <meshPhysicalMaterial
            color="#ff5555"
            transparent
            opacity={0.15}
            metalness={0.4}
            roughness={0.3}
          />
        </mesh>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshPhysicalMaterial
          color="#1a1a2e"
          metalness={0.2}
          roughness={0.8}
          clearcoat={0.3}
        />
      </mesh>

      <Grid
        position={[0, 0.001, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#2a3a4a"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#3a5a7a"
        fadeDistance={20}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

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

function PendulumLabels({ length, currentAngle, currentVelocity, calculatedPeriod, damping }) {
  const safeLength = Math.max(0.05, Number(length) || 0.05);
  const safeDamping = Math.max(0, Number(damping) || 0);
  return (
    <>
      <FrostedLabel position={[-3, 6, 0]} color="#00f5ff">
        θ: {currentAngle.toFixed(1)}°
      </FrostedLabel>
      <FrostedLabel position={[-3, 5.2, 0]} color="#ff8844">
        ω: {currentVelocity.toFixed(2)} rad/s
      </FrostedLabel>
      <FrostedLabel position={[0, 7.5, 0]} color="#00ff88">
        T₀ = 2π√(L/g) = {calculatedPeriod.toFixed(3)} s
      </FrostedLabel>
      <FrostedLabel position={[0, 7.1, 0]} color="#88ccff">
        L = {safeLength.toFixed(2)} m
      </FrostedLabel>
      {dampingTexture(safeDamping)}
    </>
  );
}

function dampingTexture(damping) {
  if (damping === 0) return null;
  return (
    <FrostedLabel position={[3, 6, 0]} color="#ff6666">
      Damping: {damping.toFixed(1)}
    </FrostedLabel>
  );
}

export default function Pendulum({
  length = 2,
  mass = 1,
  initialAngle = 30,
  damping = 0,
  isPlaying = false,
  onDataPoint,
}) {
  const calculatedPeriod = useMemo(() => {
    return 2 * Math.PI * Math.sqrt(Math.abs(length) / Math.abs(GRAVITY));
  }, [length]);

  const [currentAngle, setCurrentAngle] = useState(initialAngle);
  const [currentVelocity, setCurrentVelocity] = useState(0);

  const handleDataPoint = (data) => {
    setCurrentAngle(data.angle);
    setCurrentVelocity(data.angularVelocity_radps ?? 0);

    if (onDataPoint) {
      onDataPoint(data);
    }
  };

  return (
    <Canvas
      camera={{ position: [2, 3, 10], fov: 50 }}
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
      <PendulumScene
        length={length}
        mass={mass}
        initialAngle={initialAngle}
        damping={damping}
        isPlaying={isPlaying}
        onDataPoint={handleDataPoint}
      />
      <PendulumLabels
        length={length}
        currentAngle={currentAngle}
        currentVelocity={currentVelocity}
        calculatedPeriod={calculatedPeriod}
        damping={damping}
      />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={20}
        autoRotate={!isPlaying}
        autoRotateSpeed={0.22}
      />
    </Canvas>
  );
}

Pendulum.getSceneConfig = (variables = {}) => {
  const { length = 2, mass = 1, initialAngle = 30, damping = 0 } = variables;

  const period = 2 * Math.PI * Math.sqrt(Math.abs(length) / Math.abs(GRAVITY));

  return {
    name: 'Pendulum Motion',
    description: 'Nonlinear pendulum dynamics with damping and energy tracking',
    camera: { position: [0, 3, 12], fov: 50 },
    lighting: [
      { type: 'ambient', intensity: 0.6 },
      { type: 'directional', position: [5, 10, 5], intensity: 0.8 },
    ],
    objects: [
      { type: 'pivot', position: [0, length, 0] },
      { type: 'rod', length },
      { type: 'bob', mass, position: [
        Math.sin(initialAngle * Math.PI / 180) * length,
        length - Math.cos(initialAngle * Math.PI / 180) * length,
        0,
      ]},
      { type: 'trace-arc', color: '#00ffff', opacity: 0.4 },
      { type: 'ghost-extremes', opacity: 0.2 },
    ],
    physics: {
      gravity: GRAVITY,
      length,
      mass,
      initialAngle,
      damping,
    },
    calculations: {
      period: period.toFixed(3),
      angularFrequency: (2 * Math.PI / period).toFixed(3),
      nonlinearEquation: `θ'' = -(g/L)sin(θ) - bθ'`,
    },
  };
};
