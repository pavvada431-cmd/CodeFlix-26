import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Matter from 'matter-js';

const GRAVITY = -9.81;
const SCALE = 0.1;

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
  const traceRef = useRef();
  const engineRef = useRef();
  const constraintRef = useRef();
  const bobBodyRef = useRef();
  const forceArrowTangent = useRef();
  const forceArrowCentripetal = useRef();

  const [tracePoints, setTracePoints] = useState([]);
  const [amplitude, setAmplitude] = useState(Math.abs(initialAngle));
  const showForces = true;

  const timeRef = useRef(0);
  const needsResetRef = useRef(false);
  const prevIsPlayingRef = useRef(false);

  const maxLeftAngle = useMemo(() => -Math.abs(initialAngle), [initialAngle]);
  const maxRightAngle = useMemo(() => Math.abs(initialAngle), [initialAngle]);

  useEffect(() => {
    const Engine = Matter.Engine;
    const engine = Engine.create({
      gravity: { x: 0, y: GRAVITY / SCALE, z: 0 },
    });
    engineRef.current = engine;

    const pivot = { x: 0, y: length * SCALE, z: 0 };
    const bobX = pivot.x + Math.sin(initialAngle * Math.PI / 180) * length * SCALE;
    const bobY = pivot.y - Math.cos(initialAngle * Math.PI / 180) * length * SCALE;

    const bob = Matter.Bodies.circle(bobX, bobY, mass * 0.1 * SCALE, {
      mass: mass,
      friction: 0,
      frictionAir: damping * 0.01,
      label: 'pendulum-bob',
    });
    bobBodyRef.current = bob;

    const constraint = Matter.Constraint.create({
      pointA: pivot,
      bodyB: bob,
      length: 0,
      stiffness: 1,
      damping: damping * 0.01,
    });
    constraintRef.current = constraint;

    Matter.Composite.add(engine.world, [bob, constraint]);

    return () => {
      Matter.Engine.clear(engine);
    };
  }, [length, mass, initialAngle, damping]);

  useEffect(() => {
    if (isPlaying && !prevIsPlayingRef.current) {
      needsResetRef.current = true;
    }
    prevIsPlayingRef.current = isPlaying;
  }, [isPlaying, initialAngle, length, mass, damping]);

  useFrame((state, delta) => {
    if (!engineRef.current || !bobBodyRef.current) return;

    if (needsResetRef.current && isPlaying) {
      needsResetRef.current = false;
      timeRef.current = 0;

      const pivot = { x: 0, y: length * SCALE, z: 0 };
      const bobX = pivot.x + Math.sin(initialAngle * Math.PI / 180) * length * SCALE;
      const bobY = pivot.y - Math.cos(initialAngle * Math.PI / 180) * length * SCALE;

      Matter.Body.setPosition(bobBodyRef.current, { x: bobX, y: bobY, z: 0 });
      Matter.Body.setVelocity(bobBodyRef.current, { x: 0, y: 0, z: 0 });
      Matter.Body.setAngularVelocity(bobBodyRef.current, 0);

      if (engineRef.current.gravity) {
        engineRef.current.gravity.y = GRAVITY / SCALE;
      }

      setTracePoints([]);
      setAmplitude(Math.abs(initialAngle));
    }

    if (!isPlaying) return;

    Matter.Engine.update(engineRef.current, delta * 1000);

    const body = bobBodyRef.current;
    const pos = body.position;
    const vel = body.velocity;

    if (
      Math.abs(pos.x) > 10000 * SCALE ||
      Math.abs(pos.y) > 10000 * SCALE
    ) {
      needsResetRef.current = true;
      return;
    }

    const pivotY = length * SCALE;
    const dx = pos.x - 0;
    const dy = pos.y - pivotY;
    const angle = Math.atan2(dx, -dy);
    const angleDeg = angle * 180 / Math.PI;

    const tangentForce = mass * GRAVITY * Math.sin(angle);
    const centripetalForce = mass * (vel.x * vel.x + vel.y * vel.y) / (length * SCALE);

    const velocity = Math.sqrt(vel.x * vel.x + vel.y * vel.y) / SCALE;

    const currentAmplitude = Math.abs(angleDeg);
    if (currentAmplitude < amplitude * 0.9) {
      setAmplitude(currentAmplitude);
    }

    if (rodRef.current && bobRef.current) {
      const rodLength = length * SCALE;
      rodRef.current.position.set(0, pivotY - rodLength / 2, 0);
      rodRef.current.rotation.z = angle;
      rodRef.current.scale.y = rodLength / 2;

      bobRef.current.position.set(pos.x, pos.y, pos.z);
    }

    if (pivotRef.current) {
      pivotRef.current.position.set(0, pivotY, 0);
    }

    if (traceRef.current && tracePoints.length < 300) {
      setTracePoints(prev => [...prev, new THREE.Vector3(pos.x, pos.y, 0)]);
    }

    timeRef.current += delta;

    if (onDataPoint && timeRef.current % 0.1 < delta) {
      onDataPoint({
        t: timeRef.current,
        angle: angleDeg,
        velocity: velocity,
      });
    }

    if (forceArrowTangent.current) {
      const tangentScale = Math.abs(tangentForce) * 0.01 * SCALE;
      const tangentDir = tangentForce > 0 ? 1 : -1;
      forceArrowTangent.current.position.set(
        pos.x + tangentDir * 0.3 * SCALE,
        pos.y - 0.3 * SCALE,
        0.2
      );
      forceArrowTangent.current.scale.set(tangentScale, 0.1, 0.1);
    }

    if (forceArrowCentripetal.current) {
      const centripetalScale = centripetalForce * 0.01 * SCALE;
      const toPivot = { x: -dx, y: -dy };
      const mag = Math.sqrt(toPivot.x * toPivot.x + toPivot.y * toPivot.y);
      if (mag > 0) {
        forceArrowCentripetal.current.position.set(
          pos.x + (toPivot.x / mag) * 0.3 * SCALE,
          pos.y + (toPivot.y / mag) * 0.3 * SCALE,
          0.2
        );
        const arrowAngle = Math.atan2(toPivot.y, toPivot.x);
        forceArrowCentripetal.current.rotation.z = arrowAngle;
        forceArrowCentripetal.current.scale.set(centripetalScale, 0.1, 0.1);
      }
    }
  });

  const traceGeometry = useMemo(() => {
    if (tracePoints.length < 2) return null;
    const geometry = new THREE.BufferGeometry().setFromPoints(tracePoints);
    return geometry;
  }, [tracePoints]);

  const traceOpacity = useMemo(() => {
    if (damping === 0) return 0.4;
    return Math.max(0.1, 0.6 - (amplitude / Math.abs(initialAngle)) * 0.5);
  }, [damping, amplitude, initialAngle]);

  const ghostLeftAngle = maxLeftAngle * Math.PI / 180;
  const ghostRightAngle = maxRightAngle * Math.PI / 180;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      <mesh ref={pivotRef} position={[0, length * SCALE, 0]}>
        <sphereGeometry args={[0.15 * SCALE, 16, 16]} />
        <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.2} />
      </mesh>

      <mesh ref={rodRef}>
        <cylinderGeometry args={[0.03 * SCALE, 0.03 * SCALE, 2, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.3} />
      </mesh>

      <mesh ref={bobRef} position={[0, 0, 0]}>
        <sphereGeometry args={[mass * 0.15 * SCALE, 32, 32]} />
        <meshStandardMaterial color="#e74c3c" metalness={0.3} roughness={0.4} />
      </mesh>

      {showForces && isPlaying && (
        <>
          <mesh ref={forceArrowTangent} position={[0, 0, 0.2]}>
            <boxGeometry args={[1, 0.1, 0.1]} />
            <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
          </mesh>
          <mesh ref={forceArrowCentripetal} position={[0, 0, 0.2]}>
            <boxGeometry args={[1, 0.1, 0.1]} />
            <meshBasicMaterial color="#00ff88" transparent opacity={0.8} />
          </mesh>
        </>
      )}

      {traceGeometry && (
        <line ref={traceRef} geometry={traceGeometry}>
          <lineBasicMaterial
            color="#00ffff"
            transparent
            opacity={traceOpacity}
          />
        </line>
      )}

      <group position={[0, length * SCALE, 0]}>
        <mesh
          position={[
            Math.sin(ghostLeftAngle) * length * SCALE * 0.8,
            -Math.cos(ghostLeftAngle) * length * SCALE * 0.8,
            -0.5,
          ]}
        >
          <sphereGeometry args={[mass * 0.15 * SCALE, 16, 16]} />
          <meshStandardMaterial
            color="#e74c3c"
            transparent
            opacity={0.2}
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
          <meshStandardMaterial
            color="#e74c3c"
            transparent
            opacity={0.2}
          />
        </mesh>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
    </>
  );
}

function PendulumLabels({ length, currentAngle, currentVelocity, calculatedPeriod, damping }) {
  const angleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();
    ctx.fillStyle = '#00f5ff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`θ: ${currentAngle.toFixed(1)}°`, 128, 42);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [currentAngle]);

  const velocityTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();
    ctx.fillStyle = '#ff8844';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`ω: ${currentVelocity.toFixed(2)} rad/s`, 128, 42);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [currentVelocity]);

  const periodTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.roundRect(0, 0, 384, 64, 8);
    ctx.fill();
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`T = 2π√(L/g) = ${calculatedPeriod.toFixed(3)}s`, 192, 38);
    ctx.font = '16px Arial';
    ctx.fillStyle = '#888888';
    ctx.fillText(`L = ${length}m`, 80, 58);
    ctx.fillText(`g = 9.81 m/s²`, 300, 58);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [calculatedPeriod, length]);

  const dampingTexture = useMemo(() => {
    if (damping === 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Damping: ${damping.toFixed(1)}`, 128, 40);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [damping]);

  return (
    <>
      <sprite scale={[2, 0.5, 1]} position={[-3, 6, 0]}>
        <spriteMaterial map={angleTexture} transparent />
      </sprite>
      <sprite scale={[2, 0.5, 1]} position={[-3, 5.2, 0]}>
        <spriteMaterial map={velocityTexture} transparent />
      </sprite>
      <sprite scale={[3, 0.5, 1]} position={[0, 7.5, 0]}>
        <spriteMaterial map={periodTexture} transparent />
      </sprite>
      {dampingTexture && (
        <sprite scale={[2, 0.5, 1]} position={[3, 6, 0]}>
          <spriteMaterial map={dampingTexture} transparent />
        </sprite>
      )}
    </>
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
  return (
    <Canvas
      camera={{ position: [0, 3, 12], fov: 50 }}
      shadows
      style={{ width: '100%', height: '100%', background: '#0a0a0f' }}
      onCreated={(state) => {
        try {
          state.gl.getContext('webgl2') || state.gl.getContext('webgl');
        } catch (e) {
          console.warn('WebGL initialization warning:', e);
        }
      }}
    >
      <SimulationSceneWithLabels
        length={length}
        mass={mass}
        initialAngle={initialAngle}
        damping={damping}
        isPlaying={isPlaying}
        onDataPoint={onDataPoint}
      />
    </Canvas>
  );
}

function SimulationSceneWithLabels(props) {
  const [currentAngle, setCurrentAngle] = useState(props.initialAngle);
  const [currentVelocity, setCurrentVelocity] = useState(0);

  const calculatedPeriod = useMemo(() => {
    return 2 * Math.PI * Math.sqrt(Math.abs(props.length) / Math.abs(GRAVITY));
  }, [props.length]);

  const handleDataPoint = (data) => {
    setCurrentAngle(data.angle);
    setCurrentVelocity(data.velocity);

    if (props.onDataPoint) {
      props.onDataPoint(data);
    }
  };

  return (
    <>
      <PendulumScene
        {...props}
        onDataPoint={handleDataPoint}
      />
      <PendulumLabels
        length={props.length}
        currentAngle={currentAngle}
        currentVelocity={currentVelocity}
        calculatedPeriod={calculatedPeriod}
        damping={props.damping}
      />
    </>
  );
}

Pendulum.getSceneConfig = (variables = {}) => {
  const { length = 2, mass = 1, initialAngle = 30, damping = 0 } = variables;

  const period = 2 * Math.PI * Math.sqrt(Math.abs(length) / Math.abs(GRAVITY));

  return {
    name: 'Pendulum Motion',
    description: 'Physics simulation of simple pendulum with Matter.js',
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
    },
  };
};
