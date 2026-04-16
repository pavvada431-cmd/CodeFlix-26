import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Matter from 'matter-js';

const GRAVITY = -9.81;
const SCALE = 0.1;

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

function GroundGrid() {
  const gridRef = useRef();

  const gridGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    for (let i = 0; i <= 200; i++) {
      vertices.push(-10 * SCALE, 0, (i - 100) * SCALE);
      vertices.push(10 * SCALE, 0, (i - 100) * SCALE);
    }
    for (let i = 0; i <= 200; i++) {
      vertices.push((i - 100) * SCALE, 0, -10 * SCALE);
      vertices.push((i - 100) * SCALE, 0, 10 * SCALE);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }, []);

  const markingsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    for (let m = 0; m <= 100; m += 10) {
      const x = m * SCALE;
      vertices.push(x, 0.001, -0.5 * SCALE);
      vertices.push(x, 0.001, 0.5 * SCALE);

      const label = m.toString();
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }, []);

  return (
    <group>
      <lineSegments ref={gridRef} geometry={gridGeometry}>
        <lineBasicMaterial color="#333333" transparent opacity={0.4} />
      </lineSegments>
      <lineSegments geometry={markingsGeometry}>
        <lineBasicMaterial color="#666666" />
      </lineSegments>
    </group>
  );
}

function MeasurementLabels() {
  const labels = useMemo(() => {
    const items = [];
    for (let m = 10; m <= 100; m += 10) {
      items.push(
        <sprite key={m} position={[m * SCALE, 0.1 * SCALE, 0.6 * SCALE]} scale={[0.8, 0.4, 1]}>
          <spriteMaterial map={createTextTexture(m.toString())} transparent />
        </sprite>
      );
    }
    return items;
  }, []);

  return <>{labels}</>;
}

function createTextTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#888888';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(text, 64, 42);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function LaunchPlatform({ initialHeight }) {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, initialHeight * SCALE * 0.5, 0]}>
        <boxGeometry args={[0.8 * SCALE, initialHeight * SCALE, 0.8 * SCALE]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      <mesh position={[0, initialHeight * SCALE, 0]}>
        <boxGeometry args={[1.2 * SCALE, 0.1 * SCALE, 1.2 * SCALE]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
    </group>
  );
}

function PredictedTrajectory({ initialVelocity, launchAngle, initialHeight }) {
  const lineRef = useRef();

  const { curve, geometry } = useMemo(() => {
    const points = calculateTrajectoryPoints(initialVelocity, launchAngle, initialHeight);
    if (points.length < 2) return { curve: null, geometry: null };

    const curve = new THREE.CatmullRomCurve3(points);
    const curvePoints = curve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);

    return { curve, geometry };
  }, [initialVelocity, launchAngle, initialHeight]);

  if (!geometry) return null;

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineDashedMaterial color="#ffaa00" dashSize={0.3 * SCALE} gapSize={0.15 * SCALE} />
    </lineSegments>
  );
}

function BallTrail({ trailPoints }) {
  const lineRef = useRef();

  useEffect(() => {
    if (lineRef.current && trailPoints.length > 1) {
      const positions = [];
      trailPoints.forEach(p => positions.push(p.x, p.y, p.z));

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      lineRef.current.geometry = geometry;
    }
  }, [trailPoints]);

  if (trailPoints.length < 2) return null;

  return (
    <line ref={lineRef}>
      <lineBasicMaterial color="#00ffff" transparent opacity={0.7} />
    </line>
  );
}

function BallSprite({ text, offsetY = 0.5 }) {
  const spriteRef = useRef();

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 42);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [text]);

  return (
    <sprite ref={spriteRef} scale={[1.5, 0.375, 1]} position={[0, offsetY * SCALE, 0]}>
      <spriteMaterial map={texture} transparent />
    </sprite>
  );
}

function MaxHeightLabel({ visible }) {
  const spriteRef = useRef();
  const [opacity, setOpacity] = useState(0);

  useFrame(() => {
    if (visible && opacity < 1) {
      setOpacity(Math.min(1, opacity + 0.1));
    } else if (!visible && opacity > 0) {
      setOpacity(Math.max(0, opacity - 0.05));
    }
  });

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff4444';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MAX HEIGHT', 128, 42);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  if (opacity === 0) return null;

  return (
    <sprite scale={[2, 0.5, 1]} position={[0, 2 * SCALE, 0]}>
      <spriteMaterial map={texture} transparent opacity={opacity} />
    </sprite>
  );
}

function DustParticle({ position, velocity, opacity }) {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.x += velocity.x * 0.016;
      meshRef.current.position.y += velocity.y * 0.016;
      meshRef.current.position.z += velocity.z * 0.016;
      meshRef.current.position.y -= 0.002;
      meshRef.current.material.opacity = opacity;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.05 * SCALE, 8, 8]} />
      <meshStandardMaterial
        color="#8B7355"
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}

function DustBurst({ position, active }) {
  const [particles, setParticles] = useState([]);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (active && particles.length === 0) {
      const newParticles = [];
      for (let i = 0; i < 20; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const speed = 0.5 + Math.random() * 1.5;
        newParticles.push({
          id: i,
          position: [position.x, position.y, position.z],
          velocity: {
            x: Math.cos(angle) * speed * SCALE,
            y: Math.random() * 0.8 * SCALE,
            z: Math.sin(angle) * speed * SCALE,
          },
        });
      }
      setParticles(newParticles);
      setOpacity(1);
    }
  }, [active, position, particles.length]);

  useFrame(() => {
    if (opacity > 0 && particles.length > 0) {
      setOpacity(Math.max(0, opacity - 0.02));
    }
  });

  if (!active || particles.length === 0) return null;

  return (
    <>
      {particles.map(p => (
        <DustParticle
          key={p.id}
          position={p.position}
          velocity={p.velocity}
          opacity={opacity}
        />
      ))}
    </>  );
}

function SimulationScene({ initialVelocity, launchAngle, initialHeight, isPlaying }) {
  const ballRef = useRef();
  const engineRef = useRef();
  const ballBodyRef = useRef();
  const { scene } = useThree();

  const [trailPoints, setTrailPoints] = useState([]);
  const [hasLanded, setHasLanded] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(initialHeight);
  const [currentVelocity, setCurrentVelocity] = useState(initialVelocity);
  const [horizontalDistance, setHorizontalDistance] = useState(0);
  const [showMaxHeight, setShowMaxHeight] = useState(false);
  const [maxHeightReached, setMaxHeightReached] = useState(false);
  const [dustActive, setDustActive] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 0, y: initialHeight * SCALE, z: 0 });

  const prevHeight = useRef(initialHeight);

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
    if (isPlaying && ballBodyRef.current) {
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
  }, [isPlaying, initialVelocity, launchAngle, initialHeight]);

  useFrame((state, delta) => {
    if (!isPlaying || !engineRef.current || !ballBodyRef.current) return;

    Matter.Engine.update(engineRef.current, delta * 1000);

    const body = ballBodyRef.current;
    const pos = body.position;
    const vel = body.velocity;

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

    if (ballRef.current) {
      ballRef.current.position.set(pos.x, pos.y, pos.z);
    }

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

  const heightSpriteTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Height: ${currentHeight.toFixed(1)} m`, 128, 42);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, [currentHeight]);

  const velocitySpriteTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();
    ctx.fillStyle = '#ff8844';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Vel: ${currentVelocity.toFixed(1)} m/s`, 128, 42);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, [currentVelocity]);

  const distanceSpriteTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();
    ctx.fillStyle = '#4488ff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Dist: ${horizontalDistance.toFixed(1)} m`, 128, 42);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, [horizontalDistance]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 5]} intensity={1} castShadow />

      <LaunchPlatform initialHeight={initialHeight} />

      <mesh ref={ballRef} position={[0.5 * SCALE, initialHeight * SCALE, 0]}>
        <sphereGeometry args={[0.2 * SCALE, 32, 32]} />
        <meshStandardMaterial color="#ff3333" metalness={0.3} roughness={0.4} />
      </mesh>

      <PredictedTrajectory
        initialVelocity={initialVelocity}
        launchAngle={launchAngle}
        initialHeight={initialHeight}
      />

      <BallTrail trailPoints={trailPoints} />

      {!hasLanded && isPlaying && (
        <group position={ballPosition}>
          <sprite scale={[1.5, 0.375, 1]} position={[0, 0.6 * SCALE, 0]}>
            <spriteMaterial map={heightSpriteTexture} transparent />
          </sprite>
          <sprite scale={[1.5, 0.375, 1]} position={[0, 1.1 * SCALE, 0]}>
            <spriteMaterial map={velocitySpriteTexture} transparent />
          </sprite>
          <sprite scale={[1.5, 0.375, 1]} position={[0, 1.6 * SCALE, 0]}>
            <spriteMaterial map={distanceSpriteTexture} transparent />
          </sprite>
          <MaxHeightLabel visible={showMaxHeight} />
        </group>
      )}

      <DustBurst position={ballPosition} active={dustActive} />

      <GroundGrid />
      <MeasurementLabels />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
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
      camera={{ position: [5, 5, 10], fov: 50 }}
      shadows
      style={{ width: '100%', height: '100%', background: '#0a0a0f' }}
    >
      <SimulationScene
        initialVelocity={initialVelocity}
        launchAngle={launchAngle}
        initialHeight={height}
        isPlaying={isPlaying}
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
