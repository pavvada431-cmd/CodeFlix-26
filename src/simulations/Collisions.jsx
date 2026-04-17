import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Grid, Text, Html, Line, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Matter from 'matter-js';

const SCALE = 0.15;
const TRACK_Y = 0;
const BALL_RADIUS = 0.4;

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

function VelocityArrow({ position, direction, length, color, label }) {
  const geometry = useMemo(() => createArrowGeometry(Math.max(length, 0.05)), [length]);

  const rotation = useMemo(() => {
    const angle = direction > 0 ? 0 : Math.PI;
    return [0, 0, -angle];
  }, [direction]);

  if (length < 0.02) return null;

  return (
    <group position={position}>
      <mesh geometry={geometry} rotation={rotation} position={[length / 2 * direction, 0, 0]}>
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      {label && (
        <FrostedLabel
          position={[direction * (length / 2 + 0.4), 0.4, 0]}
          color={color}
        >
          {label}
        </FrostedLabel>
      )}
    </group>
  );
}

function CollisionBurst({ position, isActive }) {
  const [particles, setParticles] = useState([]);
  const [particleOpacity, setParticleOpacity] = useState(0);
  const [particlePositions, setParticlePositions] = useState([]);
  const animationRef = useRef(null);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    timeRef.current = 0;
    const newParticles = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      newParticles.push({
        id: i,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }

    requestAnimationFrame(() => {
      setParticles(newParticles);
      setParticleOpacity(1);
    });

    const animate = () => {
      timeRef.current += 0.016;
      if (timeRef.current > 0.5) {
        setParticleOpacity(0);
        return;
      }
      const positions = newParticles.map(p => ({
        id: p.id,
        x: p.vx * timeRef.current,
        y: p.vy * timeRef.current,
      }));
      setParticlePositions(positions);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  if (particleOpacity === 0) return null;

  return (
    <group position={[position.x, position.y, 0]}>
      {particles.map((p, idx) => {
        const pos = particlePositions[idx] || { x: 0, y: 0 };
        return (
          <mesh key={p.id} position={[pos.x, pos.y, 0]}>
            <sphereGeometry args={[0.1 * particleOpacity, 8, 8]} />
            <meshPhysicalMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={2}
              transparent
              opacity={particleOpacity}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Track() {
  return (
    <group>
      <mesh position={[0, TRACK_Y - 0.05, 0]}>
        <boxGeometry args={[20, 0.1, 2]} />
        <meshPhysicalMaterial
          color="#3a4a5a"
          metalness={0.8}
          roughness={0.2}
          clearcoat={0.8}
        />
      </mesh>
      <mesh position={[0, TRACK_Y, 0]} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.98, 1.02, 64]} />
        <meshBasicMaterial color="#00f5ff" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, TRACK_Y + 0.5, 0]} color="#00f5ff" intensity={0.5} distance={3} />
    </group>
  );
}

function Ball({ position, color, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          metalness={0.7}
          roughness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
      <pointLight color={color} intensity={0.3} distance={1} />
    </group>
  );
}

function NewtonCradle() {
  const [ballAngles, setBallAngles] = useState([0, 0, 0, 0, 0]);
  const engineRef = useRef(null);
  const bodiesRef = useRef([]);
  const animationRef = useRef(null);
  const isPlayingRef = useRef(true);

  useEffect(() => {
    const Engine = Matter.Engine;
    const engine = Engine.create({ gravity: { x: 0, y: 1 } });
    engineRef.current = engine;

    const constraintY = 3;
    const startX = -2;
    const spacing = 0.5;
    const stringLength = 2;

    const bodies = [];
    for (let i = 0; i < 5; i++) {
      const ball = Matter.Bodies.circle(startX + i * spacing, constraintY + stringLength, 0.25, {
        restitution: 0.9,
        friction: 0,
        frictionAir: 0.001,
      });

      const constraint = Matter.Constraint.create({
        pointA: { x: startX + i * spacing, y: constraintY },
        bodyB: ball,
        length: stringLength,
        stiffness: 1,
      });

      Matter.Composite.add(engine.world, [ball, constraint]);
      bodies.push(ball);
    }

    Matter.Body.setPosition(bodies[0], { x: startX - 1.5, y: constraintY + stringLength + 0.5 });
    Matter.Body.setVelocity(bodies[0], { x: 2, y: 0 });

    bodiesRef.current = bodies;

    return () => {
      Matter.Engine.clear(engine);
    };
  }, []);

  useEffect(() => {
    if (!engineRef.current) return;

    const animate = () => {
      Matter.Engine.update(engineRef.current, 1000 / 60);

      const angles = bodiesRef.current.map(b => {
        const dx = b.position.x - b.position.x;
        const dy = b.position.y - (3 + 2);
        return Math.atan2(dx, -dy);
      });
      setBallAngles(angles);

      if (isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      isPlayingRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const pivotY = 3;
  const startX = -1.2;
  const spacing = 0.5;
  const stringLength = 2;

  return (
    <group>
      <mesh position={[0, pivotY + 0.1, 0]}>
        <boxGeometry args={[3, 0.1, 0.3]} />
        <meshPhysicalMaterial color="#556677" metalness={0.9} roughness={0.1} clearcoat={1} />
      </mesh>

      {ballAngles.map((angle, i) => {
        const bobX = startX + i * spacing + Math.sin(angle) * stringLength;
        const bobY = pivotY + Math.cos(angle) * stringLength;

        return (
          <group key={i}>
            <mesh position={[startX + i * spacing, pivotY, 0]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshPhysicalMaterial color="#778899" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[startX + i * spacing, (pivotY + bobY) / 2, 0]}>
              <cylinderGeometry args={[0.03, 0.03, stringLength, 8]} />
              <meshPhysicalMaterial color="#99aabb" metalness={0.8} roughness={0.2} />
            </mesh>
            <Ball position={[bobX, bobY, 0]} color="#00f5ff" />
          </group>
        );
      })}
    </group>
  );
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
  const [ball1Pos, setBall1Pos] = useState({ x: -3, y: TRACK_Y });
  const [ball2Pos, setBall2Pos] = useState({ x: 3, y: TRACK_Y });
  const [v1After, setV1After] = useState(0);
  const [v2After, setV2After] = useState(0);
  const [collisionHappened, setCollisionHappened] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [mergedScale, setMergedScale] = useState(1);
  const [pTotal, setPTotal] = useState(0);
  const [keTotal, setKeTotal] = useState(0);

  const engineRef = useRef(null);
  const ball1Ref = useRef(null);
  const ball2Ref = useRef(null);
  const animationRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const collisionOccurredRef = useRef(false);
  const startTimeRef = useRef(0);
  const lastDataTimeRef = useRef(0);
  const mergedRef = useRef(false);
  const initializedRef = useRef(false);

  const restitution = collisionType === 'elastic' ? 1.0 : collisionType === 'inelastic' ? 0.5 : 0;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (isNewtonCradle) return;

    const Engine = Matter.Engine;
    const engine = Engine.create({ gravity: { x: 0, y: 0 } });
    engineRef.current = engine;

    const b1 = Matter.Bodies.circle(-3 / SCALE, TRACK_Y / SCALE, BALL_RADIUS / SCALE, {
      restitution,
      friction: 0,
      frictionAir: 0,
      label: 'ball1',
    });

    const b2 = Matter.Bodies.circle(3 / SCALE, TRACK_Y / SCALE, BALL_RADIUS / SCALE, {
      restitution,
      friction: 0,
      frictionAir: 0,
      label: 'ball2',
    });

    Matter.Body.setVelocity(b1, { x: (velocity1 / SCALE), y: 0 });
    Matter.Body.setVelocity(b2, { x: (velocity2 / SCALE), y: 0 });

    ball1Ref.current = b1;
    ball2Ref.current = b2;
    Matter.Composite.add(engine.world, [b1, b2]);

    initializedRef.current = true;
    collisionOccurredRef.current = false;
    mergedRef.current = false;
    startTimeRef.current = 0;
    lastDataTimeRef.current = 0;

    return () => {
      Matter.Engine.clear(engine);
      engineRef.current = null;
      initializedRef.current = false;
    };
  }, [mass1, mass2, velocity1, velocity2, collisionType, isNewtonCradle, restitution]);

  useEffect(() => {
    if (isNewtonCradle || !engineRef.current || !ball1Ref.current || !ball2Ref.current || !initializedRef.current) return;

    if (!isPlayingRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now() / 1000;
    }

    const b1 = ball1Ref.current;
    const b2 = ball2Ref.current;

    const v1Initial = velocity1;
    const v2Initial = velocity2;
    const m1 = mass1;
    const m2 = mass2;
    const res = restitution;
    const callback = onDataPoint;
    const collisionCallback = onCollision;
    const colType = collisionType;

    const animate = () => {
      Matter.Engine.update(engineRef.current, 1000 / 60);

      const pos1 = b1.position;
      const pos2 = b2.position;

      const displayPos1 = { x: pos1.x * SCALE, y: pos1.y * SCALE };
      const displayPos2 = { x: pos2.x * SCALE, y: pos2.y * SCALE };

      const currentTime = (performance.now() / 1000) - startTimeRef.current;

      const v1 = b1.velocity.x * SCALE;
      const v2 = b2.velocity.x * SCALE;
      const pTot = m1 * v1 + m2 * v2;
      const keTot = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;

      setPTotal(pTot);
      setKeTotal(keTot);
      setBall1Pos(displayPos1);
      setBall2Pos(displayPos2);

      if (currentTime - lastDataTimeRef.current > 0.05) {
        callback?.({
          t: currentTime,
          v1,
          v2,
          p_total: pTot,
          KE_total: keTot,
        });
        lastDataTimeRef.current = currentTime;
      }

      if (!collisionOccurredRef.current) {
        const dist = Math.abs(pos1.x - pos2.x);
        if (dist <= (BALL_RADIUS * 2 / SCALE) + 0.01) {
          collisionOccurredRef.current = true;

          setShowBurst(true);
          setCollisionHappened(true);

          setTimeout(() => setShowBurst(false), 500);

          const v1AfterCalc = ((m1 - res * m2) * v1Initial + (1 + res) * m2 * v2Initial) / (m1 + m2);
          const v2AfterCalc = ((m2 - res * m1) * v2Initial + (1 + res) * m1 * v1Initial) / (m1 + m2);

          setV1After(v1AfterCalc);
          setV2After(v2AfterCalc);

          collisionCallback?.({
            v1Before: v1Initial,
            v2Before: v2Initial,
            v1After: v1AfterCalc,
            v2After: v2AfterCalc,
            pBefore: m1 * v1Initial + m2 * v2Initial,
            pAfter: m1 * v1AfterCalc + m2 * v2AfterCalc,
            keBefore: 0.5 * m1 * v1Initial * v1Initial + 0.5 * m2 * v2Initial * v2Initial,
            keAfter: 0.5 * m1 * v1AfterCalc * v1AfterCalc + 0.5 * m2 * v2AfterCalc * v2AfterCalc,
          });

          if (colType === 'perfectly_inelastic' && !mergedRef.current) {
            mergedRef.current = true;
            let scale = 1;
            const mergeInterval = setInterval(() => {
              scale -= 0.1;
              if (scale <= 0) {
                scale = 0;
                clearInterval(mergeInterval);
              }
              setMergedScale(Math.max(0, scale));
            }, 20);
          }
        }
      }

      if (isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, mass1, mass2, velocity1, velocity2, collisionType, onDataPoint, onCollision, isNewtonCradle, restitution]);

  const scale1 = collisionType === 'perfectly_inelastic' && collisionHappened ? mergedScale : 1;
  const scale2 = collisionType === 'perfectly_inelastic' && collisionHappened ? Math.min(2, 1 + (1 - mergedScale)) : 1;

  const v1Display = collisionHappened ? v1After : velocity1;
  const v2Display = collisionHappened ? v2After : velocity2;

  if (isNewtonCradle) {
    return (
      <>
        <fog attach="fog" args={['#0a0a1a', 15, 40]} />

        <ambientLight intensity={0.3} color="#8888aa" />
        <directionalLight position={[10, 20, 5]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-5, 8, 3]} intensity={0.8} color="#4466aa" />
        <pointLight position={[5, 3, -3]} intensity={0.5} color="#aa6644" />
        <Environment preset="city" intensity={0.22} />

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

        <NewtonCradle />

        <EffectComposer>
          <Bloom intensity={0.4} luminanceThreshold={0.6} luminanceSmoothing={0.9} mipmapBlur />
          <Vignette offset={0.3} darkness={0.6} />
        </EffectComposer>
      </>
    );
  }

  return (
    <>
      <fog attach="fog" args={['#0a0a1a', 15, 40]} />

      <ambientLight intensity={0.3} color="#8888aa" />
      <directionalLight position={[10, 20, 5]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-5, 8, 3]} intensity={0.8} color="#4466aa" />
      <pointLight position={[5, 3, -3]} intensity={0.5} color="#aa6644" />
      <Environment preset="city" intensity={0.22} />

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

      <FrostedLabel position={[-4, 2.5, 0]} color="#00f5ff">
        m1 = {mass1} kg
      </FrostedLabel>
      <FrostedLabel position={[-4, 2.1, 0]} color="#00f5ff">
        v1 = {v1Display.toFixed(2)} m/s
      </FrostedLabel>

      <FrostedLabel position={[3, 2.5, 0]} color="#ff8800">
        m2 = {mass2} kg
      </FrostedLabel>
      <FrostedLabel position={[3, 2.1, 0]} color="#ff8800">
        v2 = {v2Display.toFixed(2)} m/s
      </FrostedLabel>

      <FrostedLabel position={[0, 1.5, 0]} color="#44ff44">
        p = {pTotal.toFixed(2)} kg·m/s
      </FrostedLabel>
      <FrostedLabel position={[0, 1.1, 0]} color="#ffff00">
        KE = {keTotal.toFixed(2)} J
      </FrostedLabel>

      <EffectComposer>
        <Bloom intensity={0.4} luminanceThreshold={0.6} luminanceSmoothing={0.9} mipmapBlur />
        <Vignette offset={0.3} darkness={0.6} />
      </EffectComposer>
    </>
  );
}

function ConservationTable({ data }) {
  return (
    <Html position={[0, -1.5, 0]} center distanceFactor={10} zIndexRange={[100, 0]}>
      <div
        style={{
          background: 'rgba(10, 15, 30, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 245, 255, 0.3)',
          borderRadius: '12px',
          padding: '16px 24px',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}
      >
        <div style={{ color: '#00f5ff', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>
          Conservation Check
        </div>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ color: '#888' }}>
              <th style={{ padding: '4px 12px' }}>Quantity</th>
              <th style={{ padding: '4px 12px' }}>Before</th>
              <th style={{ padding: '4px 12px' }}>After</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '4px 12px', color: '#44ff44' }}>Momentum</td>
              <td style={{ padding: '4px 12px', color: '#fff' }}>{data.pBefore.toFixed(2)}</td>
              <td style={{ padding: '4px 12px', color: data.pAfter.toFixed(2) === data.pBefore.toFixed(2) ? '#44ff44' : '#ff4444' }}>
                {data.pAfter.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 12px', color: '#ffff00' }}>Kinetic Energy</td>
              <td style={{ padding: '4px 12px', color: '#fff' }}>{data.keBefore.toFixed(2)} J</td>
              <td style={{ padding: '4px 12px', color: '#fff' }}>{data.keAfter.toFixed(2)} J</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 12px', color: '#ff4444' }}>KE Lost</td>
              <td colSpan={2} style={{ padding: '4px 12px', color: data.keLost > 0 ? '#ff4444' : '#44ff44' }}>
                {data.collisionHappened ? `${data.keLost.toFixed(2)} J` : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Html>
  );
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
  const [isNewtonCradle, setIsNewtonCradle] = useState(false);
  const [showScreenShake, setShowScreenShake] = useState(false);
  const [conservationData, setConservationData] = useState({
    pBefore: mass1 * velocity1 + mass2 * velocity2,
    pAfter: mass1 * velocity1 + mass2 * velocity2,
    keBefore: 0.5 * mass1 * velocity1 * velocity1 + 0.5 * mass2 * velocity2 * velocity2,
    keAfter: 0.5 * mass1 * velocity1 * velocity1 + 0.5 * mass2 * velocity2 * velocity2,
    keLost: 0,
    collisionHappened: false,
  });

  const handleCollision = useCallback((data) => {
    requestAnimationFrame(() => {
      setConservationData({
        pBefore: data.pBefore,
        pAfter: data.pAfter,
        keBefore: data.keBefore,
        keAfter: data.keAfter,
        keLost: data.keBefore - data.keAfter,
        collisionHappened: true,
      });
      setShowScreenShake(true);
    });
  }, []);

  const resetConservationData = useCallback(() => {
    const pBefore = mass1 * velocity1 + mass2 * velocity2;
    const keBefore = 0.5 * mass1 * velocity1 * velocity1 + 0.5 * mass2 * velocity2 * velocity2;
    setConservationData({
      pBefore,
      pAfter: pBefore,
      keBefore,
      keAfter: keBefore,
      keLost: 0,
      collisionHappened: false,
    });
  }, [mass1, mass2, velocity1, velocity2, collisionType]);

  useEffect(() => {
    requestAnimationFrame(resetConservationData);
  }, [mass1, mass2, velocity1, velocity2, collisionType, resetConservationData]);

  useEffect(() => {
    if (showScreenShake) {
      const timeout = setTimeout(() => setShowScreenShake(false), 200);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [showScreenShake]);

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
        camera={{ position: [0, 0.5, 12], fov: 55 }}
        style={{ width: '100%', height: '100%', background: '#0a0a1a' }}
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
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={6}
          maxDistance={20}
          autoRotate={!isPlaying}
          autoRotateSpeed={0.2}
        />
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
  );
}

Collisions.getSceneConfig = (variables = {}) => {
  const { mass1 = 1, mass2 = 1, velocity1 = 5, velocity2 = -5, collisionType = 'elastic' } = variables;

  const pBefore = mass1 * velocity1 + mass2 * velocity2;
  const keBefore = 0.5 * mass1 * velocity1 * velocity1 + 0.5 * mass2 * velocity2 * velocity2;

  const restitution = collisionType === 'elastic' ? 1 : collisionType === 'inelastic' ? 0.5 : 0;
  const v1After = ((mass1 - restitution * mass2) * velocity1 + (1 + restitution) * mass2 * velocity2) / (mass1 + mass2);
  const v2After = ((mass2 - restitution * mass1) * velocity2 + (1 + restitution) * mass1 * velocity1) / (mass1 + mass2);
  const keAfter = 0.5 * mass1 * v1After * v1After + 0.5 * mass2 * v2After * v2After;

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
  };
};
