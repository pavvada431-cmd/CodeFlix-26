import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Grid, Text, Html, Line, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

const G = 9.81;
const CEILING_Y = 2.5;
const CEILING_THICKNESS = 0.15;
const CEILING_WIDTH = 3;
const MASS_SIZE = 0.5;
const SPRING_RADIUS = 0.12;
const SPRING_TURNS = 20;
const SPRING_SEGMENTS = 200;
const NATURAL_LENGTH = 1.5;

function FrostedLabel({ children, position, color = '#00f5ff' }) {
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

function createSpringGeometry(currentLength, turns, segments) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const radialSegments = 8;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * turns * Math.PI * 2;
    const y = t * currentLength;
    const x = Math.cos(angle) * SPRING_RADIUS;
    const z = Math.sin(angle) * SPRING_RADIUS;

    vertices.push(x, y, z);

    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const px = x + Math.cos(theta) * 0.025;
      const pz = z + Math.sin(theta) * 0.025;
      vertices.push(px, y, pz);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createArrowGeometry(length, headLength = 0.15, headWidth = 0.08) {
  const shape = new THREE.Shape();
  const hw = headWidth / 2;
  shape.moveTo(0, length);
  shape.lineTo(-hw, length - headLength);
  shape.lineTo(-hw * 0.4, length - headLength);
  shape.lineTo(-hw * 0.4, 0);
  shape.lineTo(hw * 0.4, 0);
  shape.lineTo(hw * 0.4, length - headLength);
  shape.lineTo(hw, length - headLength);
  shape.closePath();

  const extrudeSettings = { depth: 0.04, bevelEnabled: false };
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

function SpringGeometry({ currentLength }) {
  const meshRef = useRef();

  const geometry = useMemo(() => {
    return createSpringGeometry(currentLength, SPRING_TURNS, SPRING_SEGMENTS);
  }, [currentLength]);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = geometry;
    }
  }, [geometry]);

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, CEILING_Y - CEILING_THICKNESS / 2, 0]}>
      <meshPhysicalMaterial
        color="#aabbcc"
        metalness={0.9}
        roughness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.1}
      />
    </mesh>
  );
}

function MassBlock({ position }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[MASS_SIZE, MASS_SIZE, MASS_SIZE]} />
        <meshPhysicalMaterial
          color="#00f5ff"
          metalness={0.7}
          roughness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
          emissive="#00f5ff"
          emissiveIntensity={0.2}
        />
      </mesh>
      <pointLight color="#00f5ff" intensity={0.5} distance={1.5} />
    </group>
  );
}

function Ceiling() {
  return (
    <group>
      <mesh position={[0, CEILING_Y, 0]}>
        <boxGeometry args={[CEILING_WIDTH, CEILING_THICKNESS, 1]} />
        <meshPhysicalMaterial
          color="#556677"
          metalness={0.9}
          roughness={0.1}
          clearcoat={1}
        />
      </mesh>
      <mesh position={[-1.2, CEILING_Y, 0]}>
        <boxGeometry args={[0.15, 0.6, 0.3]} />
        <meshPhysicalMaterial color="#667788" metalness={0.9} roughness={0.1} clearcoat={0.8} />
      </mesh>
      <mesh position={[1.2, CEILING_Y, 0]}>
        <boxGeometry args={[0.15, 0.6, 0.3]} />
        <meshPhysicalMaterial color="#667788" metalness={0.9} roughness={0.1} clearcoat={0.8} />
      </mesh>
    </group>
  );
}

function ForceArrow({ position, direction, length, color, label }) {
  const geometry = useMemo(() => createArrowGeometry(Math.max(length, 0.05)), [length]);

  const rotation = useMemo(() => {
    const [dx, dy] = direction;
    const angle = Math.atan2(dx, dy);
    return [0, 0, -angle];
  }, [direction]);

  if (length < 0.02) return null;

  return (
    <group position={position}>
      <mesh geometry={geometry} rotation={rotation} position={[0, length / 2, 0]}>
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          transparent
          opacity={0.9}
        />
      </mesh>
      {label && (
        <FrostedLabel position={[0.5, length / 2 + 0.1, 0]} color={color}>
          {label}
        </FrostedLabel>
      )}
    </group>
  );
}

function SimulationScene({
  springConstant,
  mass,
  initialDisplacement,
  damping,
  isPlaying,
  onDataPoint,
  resonanceMode,
  onResonanceEnd,
}) {
  const [currentDisplacement, setCurrentDisplacement] = useState(initialDisplacement);
  const [currentVelocity, setCurrentVelocity] = useState(0);
  const startTimeRef = useRef(0);
  const pausedTimeRef = useRef(0);
  const lastDataTimeRef = useRef(0);
  const animationRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const resonanceModeRef = useRef(resonanceMode);

  const omega = useMemo(() => Math.sqrt(springConstant / mass), [springConstant, mass]);
  const omegaD = useMemo(() => omega * Math.sqrt(1 - (damping * damping) / (4 * mass * mass)), [omega, damping, mass]);
  const period = 2 * Math.PI / omega;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    resonanceModeRef.current = resonanceMode;
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now() / 1000;
    }

    const A = initialDisplacement;
    const b = damping;
    const m = mass;
    const k = springConstant;
    const omegaVal = omega;
    const omegaDVal = omegaD;

    const update = () => {
      const currentTime = performance.now() / 1000;
      const elapsed = pausedTimeRef.current + (startTimeRef.current > 0 ? currentTime - startTimeRef.current : 0);

      let displacement, velocity;

      if (resonanceModeRef.current) {
        const drivingAmplitude = 0.3;
        const envelope = Math.min(1, elapsed / 5);
        displacement = drivingAmplitude * envelope * Math.sin(omegaVal * elapsed);
        velocity = drivingAmplitude * envelope * omegaVal * Math.cos(omegaVal * elapsed);

        if (elapsed > 8) {
          onResonanceEnd?.();
        }
      } else if (b === 0) {
        displacement = A * Math.cos(omegaVal * elapsed);
        velocity = -A * omegaVal * Math.sin(omegaVal * elapsed);
      } else {
        const expFactor = Math.exp(-b * elapsed / (2 * m));
        displacement = A * expFactor * Math.cos(omegaDVal * elapsed);
        velocity = -A * expFactor * (
          (b / (2 * m)) * Math.cos(omegaDVal * elapsed) +
          omegaDVal * Math.sin(omegaDVal * elapsed)
        );
      }

      setCurrentDisplacement(displacement);
      setCurrentVelocity(velocity);

      if (currentTime - lastDataTimeRef.current > 0.05) {
        const ke = 0.5 * m * velocity * velocity;
        const pe = 0.5 * k * displacement * displacement;
        const te = resonanceModeRef.current ? ke + pe : 0.5 * k * A * A;

        onDataPoint?.({
          t: elapsed,
          displacement,
          velocity,
          kineticEnergy: ke,
          potentialEnergy: pe,
          totalEnergy: te,
        });
        lastDataTimeRef.current = currentTime;
      }

      if (isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(update);
      }
    };

    animationRef.current = requestAnimationFrame(update);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, initialDisplacement, springConstant, mass, damping, resonanceMode, omega, omegaD, onResonanceEnd, onDataPoint]);

  const springLength = NATURAL_LENGTH + currentDisplacement;
  const massY = CEILING_Y - CEILING_THICKNESS / 2 - springLength - MASS_SIZE / 2;
  const massCenter = [0, massY, 0];

  const springForce = springConstant * currentDisplacement;
  const gravityForce = mass * G;
  const netForce = -springForce - gravityForce;

  const springArrowLength = Math.min(Math.abs(springForce) * 0.1, 0.8);
  const gravityArrowLength = Math.min(gravityForce * 0.1, 0.8);

  const springDir = currentDisplacement > 0 ? [0, -1] : [0, 1];
  const gravityDir = [0, -1];
  const netDir = netForce > 0 ? [0, 1] : [0, -1];
  const netArrowLength = Math.min(Math.abs(netForce) * 0.15, 0.6);

  return (
    <>
      <fog attach="fog" args={['#0a0a1a', 15, 40]} />

      <ambientLight intensity={0.3} color="#8888aa" />
      <directionalLight position={[10, 20, 5]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-5, 8, 3]} intensity={0.8} color="#4466aa" />
      <pointLight position={[5, 3, -3]} intensity={0.5} color="#aa6644" />
      <pointLight position={[0, CEILING_Y + 1, 2]} intensity={1} color="#00f5ff" />
      <Environment preset="city" intensity={0.2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[15, 15]} />
        <meshPhysicalMaterial color="#1a1a2e" metalness={0.2} roughness={0.8} />
      </mesh>

      <Grid
        position={[0, 0.001, 0]}
        args={[15, 15]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#2a3a4a"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#3a5a7a"
        fadeDistance={15}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      <Ceiling />
      <SpringGeometry currentLength={springLength} />
      <MassBlock position={massCenter} />

      <ForceArrow
        position={[massCenter[0] + MASS_SIZE / 2 + 0.15, massCenter[1], massCenter[2]]}
        direction={springDir}
        length={springArrowLength}
        color="#00ffff"
        label={`Fs = ${springForce.toFixed(1)}N`}
      />
      <ForceArrow
        position={[massCenter[0] - MASS_SIZE / 2 - 0.15, massCenter[1], massCenter[2]]}
        direction={gravityDir}
        length={gravityArrowLength}
        color="#ff4444"
        label={`Fg = ${gravityForce.toFixed(1)}N`}
      />
      <ForceArrow
        position={[massCenter[0], massCenter[1] + MASS_SIZE / 2 + 0.15, massCenter[2]]}
        direction={netDir}
        length={netArrowLength}
        color="#44ff44"
        label={`Fnet = ${Math.abs(netForce).toFixed(1)}N`}
      />

      <FrostedLabel position={[-2, CEILING_Y + 0.5, 0]} color="#ffff00">
        A = {initialDisplacement.toFixed(2)} m
      </FrostedLabel>
      <FrostedLabel position={[-2, CEILING_Y + 0.15, 0]} color="#00ff88">
        ω₀ = {omega.toFixed(2)} rad/s
      </FrostedLabel>
      <FrostedLabel position={[-2, CEILING_Y - 0.2, 0]} color="#ff88ff">
        T = {period.toFixed(2)} s
      </FrostedLabel>

      <FrostedLabel position={[2, massY + 1.2, 0]} color="#88ffff">
        KE: {(0.5 * mass * currentVelocity * currentVelocity).toFixed(2)}J | PE: {(0.5 * springConstant * currentDisplacement * currentDisplacement).toFixed(2)}J
      </FrostedLabel>

      <mesh position={[0, CEILING_Y - CEILING_THICKNESS / 2 - springLength, 0]} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.08, 0.12, 16]} />
        <meshBasicMaterial color="#00f5ff" transparent opacity={0.6} />
      </mesh>

      <EffectComposer>
        <Bloom intensity={0.4} luminanceThreshold={0.6} luminanceSmoothing={0.9} mipmapBlur />
        <Vignette offset={0.3} darkness={0.6} />
      </EffectComposer>
    </>
  );
}

export default function SpringMass({
  springConstant = 50,
  mass = 2,
  initialDisplacement = 0.5,
  damping = 0,
  isPlaying = false,
  onDataPoint,
}) {
  const [resonanceMode, setResonanceMode] = useState(false);
  const [showResonanceBtn, setShowResonanceBtn] = useState(true);

  const handleResonanceEnd = useCallback(() => {
    setResonanceMode(false);
    setShowResonanceBtn(true);
  }, []);

  const toggleResonance = useCallback(() => {
    setResonanceMode(prev => !prev);
    setShowResonanceBtn(false);
  }, []);

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
        camera={{ position: [0, 0.5, 8], fov: 50 }}
        style={{ background: '#0a0a1a' }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false }}
      >
        <SimulationScene
          springConstant={springConstant}
          mass={mass}
          initialDisplacement={initialDisplacement}
          damping={damping}
          isPlaying={isPlaying}
          onDataPoint={onDataPoint}
          resonanceMode={resonanceMode}
          onResonanceEnd={handleResonanceEnd}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={16}
          autoRotate={!isPlaying}
          autoRotateSpeed={0.22}
        />
      </Canvas>

      {showResonanceBtn && (
        <button
          onClick={toggleResonance}
          className="absolute bottom-4 right-4 rounded-full border border-[rgba(255,136,0,0.5)] bg-[rgba(255,136,0,0.15)] px-4 py-2 font-mono-display text-xs uppercase tracking-wider text-[#ff8800] transition hover:bg-[rgba(255,136,0,0.25)]"
        >
          Resonance Demo
        </button>
      )}

      {resonanceMode && (
        <div className="absolute left-4 top-4 rounded-full border border-[rgba(255,136,0,0.5)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs uppercase tracking-wider text-[#ff8800]">
          Driving at ω₀
        </div>
      )}
    </div>
  );
}

SpringMass.getSceneConfig = (variables = {}) => {
  const { springConstant = 50, mass = 2, initialDisplacement = 0.5 } = variables;
  const omega = Math.sqrt(springConstant / mass);

  return {
    name: 'Spring-Mass System',
    description: 'Simple harmonic motion with damped oscillation',
    type: 'spring_mass',
    physics: {
      springConstant,
      mass,
      initialDisplacement,
      naturalFrequency: omega / (2 * Math.PI),
      angularFrequency: omega,
      period: 2 * Math.PI / omega,
    },
    calculations: {
      potentialEnergy: `PE = ½kA² = ${(0.5 * springConstant * initialDisplacement * initialDisplacement).toFixed(2)} J`,
      kineticEnergy: 'KE = ½mv²',
      period: `T = 2π√(m/k) = ${(2 * Math.PI * Math.sqrt(mass / springConstant)).toFixed(2)} s`,
      frequency: `f = 1/T = ${(1 / (2 * Math.PI * Math.sqrt(mass / springConstant))).toFixed(2)} Hz`,
    },
  };
};
