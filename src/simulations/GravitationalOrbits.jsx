import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Text, Html, Line, Environment, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

const G = 6.674e-3;

function gravitationalAcceleration(position, centralMass) {
  const r2 = position.x * position.x + position.z * position.z;
  const r = Math.sqrt(r2) + 1e-9;
  const factor = (-G * centralMass) / (r * r * r);
  return { ax: factor * position.x, az: factor * position.z, r };
}
const SCALE = 1;

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

function GlowTrail({ points, color = '#00ffff', opacity = 0.8 }) {
  const lineRef = useRef();

  useEffect(() => {
    if (lineRef.current && points.length > 1) {
      const positions = [];
      points.forEach(p => {
        positions.push(p.x, 0, p.z);
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      lineRef.current.geometry = geometry;
    }
  }, [points]);

  if (points.length < 2) return null;

  return (
    <line ref={lineRef}>
      <lineBasicMaterial vertexColors transparent opacity={opacity} />
    </line>
  );
}

function CentralBody({ radius, color }) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
          metalness={0.3}
          roughness={0.4}
          clearcoat={0.5}
        />
      </mesh>
      <pointLight color={color} intensity={3} distance={15} />
    </group>
  );
}

function OrbitingBody({ position, radius, color, trail }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.x = position.x;
      meshRef.current.position.z = position.z;
      meshRef.current.material.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });

  return (
    <group>
      <GlowTrail points={trail} color={color} opacity={0.6} />
      <mesh ref={meshRef} position={[position.x, 0, position.z]}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          metalness={0.4}
          roughness={0.3}
          clearcoat={0.5}
        />
      </mesh>
      <pointLight color={color} intensity={0.5} distance={3} />
    </group>
  );
}

function ForceArrow({ position, direction, length, color }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const hw = 0.03;
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
    const angle = Math.atan2(direction[1], direction[0]);
    return [0, 0, -angle - Math.PI / 2];
  }, [direction]);

  if (length < 0.05) return null;

  return (
    <group position={[position.x, 0, position.z]}>
      <mesh geometry={geometry} rotation={rotation} position={[0, 0, 0.05]}>
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

function SimulationScene({
  centralMass,
  orbitingMass,
  initialDistance,
  initialVelocity,
  isPlaying,
  orbitType,
  onDataUpdate,
  enableMultiBody,
}) {
  const [position, setPosition] = useState({ x: initialDistance, y: 0, z: 0 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0, z: initialVelocity });
  const [trail, setTrail] = useState([]);
  const [trail2, setTrail2] = useState([]);
  const [position2, setPosition2] = useState({ x: -initialDistance * 0.7, y: 0, z: 0 });
  const [velocity2, setVelocity2] = useState({ x: 0, y: 0, z: -initialVelocity * 0.8 });

  const animationRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const posRef = useRef(position);
  const velRef = useRef(velocity);
  const pos2Ref = useRef(position2);
  const vel2Ref = useRef(velocity2);
  const trailRef = useRef([]);
  const trail2Ref = useRef([]);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastDataTimeRef = useRef(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const safeDistance = Math.max(0.05, initialDistance);
    const circularV = Math.sqrt(G * centralMass / safeDistance);
    let vx = 0;
    let vz = initialVelocity;

    switch (orbitType) {
      case 'circular':
        vz = circularV;
        break;
      case 'elliptical':
        vz = circularV * 1.1;
        break;
      case 'escape':
        vz = Math.sqrt(2 * G * centralMass / safeDistance) * 0.9;
        break;
      default:
        vz = circularV;
    }

    const newPos = { x: safeDistance, y: 0, z: 0 };
    const newVel = { x: vx, y: 0, z: vz };
    setPosition(newPos);
    setVelocity(newVel);
    posRef.current = newPos;
    velRef.current = newVel;
    trailRef.current = [];
    setTrail([]);
    startTimeRef.current = 0;
    elapsedRef.current = 0;
  }, [centralMass, initialDistance, initialVelocity, orbitType, enableMultiBody]);

  useEffect(() => {
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

    const dt = 0.01;

    const animate = () => {
      const currentTime = performance.now() / 1000;
      elapsedRef.current = currentTime - startTimeRef.current;

      if (enableMultiBody) {
        const p1 = posRef.current;
        const v1 = velRef.current;
        const p2 = pos2Ref.current;
        const v2 = vel2Ref.current;

          const ax1Prev = gravitationalAcceleration(p1, centralMass).ax;
          const az1Prev = gravitationalAcceleration(p1, centralMass).az;
          const ax2Prev = gravitationalAcceleration(p2, centralMass).ax;
          const az2Prev = gravitationalAcceleration(p2, centralMass).az;

          const newP1 = { x: p1.x + v1.x * dt + 0.5 * ax1Prev * dt * dt, y: 0, z: p1.z + v1.z * dt + 0.5 * az1Prev * dt * dt };
          const newP2 = { x: p2.x + v2.x * dt + 0.5 * ax2Prev * dt * dt, y: 0, z: p2.z + v2.z * dt + 0.5 * az2Prev * dt * dt };

          const ax1Next = gravitationalAcceleration(newP1, centralMass).ax;
          const az1Next = gravitationalAcceleration(newP1, centralMass).az;
          const ax2Next = gravitationalAcceleration(newP2, centralMass).ax;
          const az2Next = gravitationalAcceleration(newP2, centralMass).az;

          const newV1 = { x: v1.x + 0.5 * (ax1Prev + ax1Next) * dt, y: 0, z: v1.z + 0.5 * (az1Prev + az1Next) * dt };
          const newV2 = { x: v2.x + 0.5 * (ax2Prev + ax2Next) * dt, y: 0, z: v2.z + 0.5 * (az2Prev + az2Next) * dt };

        posRef.current = newP1;
        velRef.current = newV1;
        pos2Ref.current = newP2;
        vel2Ref.current = newV2;

        trailRef.current = [...trailRef.current.slice(-499), { ...newP1 }];
        trail2Ref.current = [...trail2Ref.current.slice(-499), { ...newP2 }];

        setPosition(newP1);
        setVelocity(newV1);
        setPosition2(newP2);
        setVelocity2(newV2);
        setTrail([...trailRef.current]);
        setTrail2([...trail2Ref.current]);

        if (currentTime - lastDataTimeRef.current > 0.05) {
          const speed1 = Math.sqrt(newV1.x * newV1.x + newV1.z * newV1.z);
          const r1 = Math.sqrt(newP1.x * newP1.x + newP1.z * newP1.z);
          const KE1 = 0.5 * orbitingMass * speed1 * speed1;
          const PE1 = -G * centralMass * orbitingMass / r1;
          const L1 = orbitingMass * (newP1.x * newV1.z - newP1.z * newV1.x);

          onDataUpdate?.({
            t_s: elapsedRef.current,
            r_m: r1,
            v_mps: speed1,
            KE_J: KE1,
            PE_J: PE1,
            totalEnergy_J: KE1 + PE1,
            angularMomentum_kgm2ps: L1,
            integrationMethod: 'velocity-verlet',
            r: r1,
            v: speed1,
            KE: KE1,
            PE: PE1,
            totalEnergy: KE1 + PE1,
            angularMomentum: L1,
          });
          lastDataTimeRef.current = currentTime;
        }
      } else {
        const p = posRef.current;
        const v = velRef.current;
        const prevAcc = gravitationalAcceleration(p, centralMass);
        const newP = {
          x: p.x + v.x * dt + 0.5 * prevAcc.ax * dt * dt,
          y: 0,
          z: p.z + v.z * dt + 0.5 * prevAcc.az * dt * dt,
        };
        const nextAcc = gravitationalAcceleration(newP, centralMass);
        const newV = {
          x: v.x + 0.5 * (prevAcc.ax + nextAcc.ax) * dt,
          y: 0,
          z: v.z + 0.5 * (prevAcc.az + nextAcc.az) * dt,
        };

        posRef.current = newP;
        velRef.current = newV;

        trailRef.current = [...trailRef.current.slice(-499), { ...newP }];
        setPosition(newP);
        setVelocity(newV);
        setTrail([...trailRef.current]);

        if (currentTime - lastDataTimeRef.current > 0.05) {
          const speed = Math.sqrt(newV.x * newV.x + newV.z * newV.z);
          const dist = Math.sqrt(newP.x * newP.x + newP.z * newP.z);
          const KE = 0.5 * orbitingMass * speed * speed;
          const PE = -G * centralMass * orbitingMass / dist;
          const L = orbitingMass * (newP.x * newV.z - newP.z * newV.x);

          onDataUpdate?.({
            t_s: elapsedRef.current,
            r_m: dist,
            v_mps: speed,
            KE_J: KE,
            PE_J: PE,
            totalEnergy_J: KE + PE,
            angularMomentum_kgm2ps: L,
            integrationMethod: 'velocity-verlet',
            r: dist,
            v: speed,
            KE,
            PE,
            totalEnergy: KE + PE,
            angularMomentum: L,
          });
          lastDataTimeRef.current = currentTime;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [centralMass, orbitingMass, onDataUpdate, enableMultiBody]);

  const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
  const distance = Math.sqrt(position.x * position.x + position.z * position.z);
  const forceMag = G * centralMass * orbitingMass / (distance * distance);
  const forceDir = distance > 0 ? [-position.x / distance, -position.z / distance] : [0, 0];

  return (
    <>
      <fog attach="fog" args={['#0a0a1a', 30, 80]} />

      <ambientLight intensity={0.2} color="#4466aa" />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-10, 5, -5]} intensity={0.5} color="#aa6644" />
      <Environment preset="night" intensity={0.22} />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshPhysicalMaterial color="#0a0a1a" metalness={0.3} roughness={0.9} />
      </mesh>

      <CentralBody radius={0.8} color="#ff8800" />

      <OrbitingBody
        position={position}
        radius={0.25}
        color="#00f5ff"
        trail={trail}
      />

      {enableMultiBody && (
        <OrbitingBody
          position={position2}
          radius={0.2}
          color="#ff00ff"
          trail={trail2}
        />
      )}

      <ForceArrow
        position={position}
        direction={forceDir}
        length={Math.min(forceMag * 0.5, 2)}
        color="#ff4444"
      />

      <FrostedLabel position={[0, 4, 0]} color="#00f5ff">
        r={distance.toFixed(1)}m | v={speed.toFixed(2)}m/s | F={forceMag.toFixed(2)}N
      </FrostedLabel>
      <FrostedLabel position={[0, 3.3, 0]} color="#ff88ff">
        KE={((0.5 * orbitingMass * speed * speed)).toFixed(1)} | PE={((-G * centralMass * orbitingMass / distance)).toFixed(1)} | E={((0.5 * orbitingMass * speed * speed - G * centralMass * orbitingMass / distance)).toFixed(1)}
      </FrostedLabel>

      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.4} luminanceSmoothing={0.9} mipmapBlur />
        <Vignette offset={0.3} darkness={0.5} />
      </EffectComposer>
    </>
  );
}

export default function GravitationalOrbits({
  centralMass = 100,
  orbitingMass = 1,
  initialDistance = 5,
  initialVelocity = 1,
  isPlaying = false,
  onDataPoint,
}) {
  const [orbitType, setOrbitType] = useState('circular');
  const [enableMultiBody, setEnableMultiBody] = useState(false);
  const [dataHistory, setDataHistory] = useState([]);
  const [currentData, setCurrentData] = useState(null);

  const handleDataUpdate = useCallback((data) => {
    setCurrentData(data);
    setDataHistory(prev => {
      const newHistory = [...prev, data];
      if (newHistory.length > 500) return newHistory.slice(-500);
      return newHistory;
    });
    onDataPoint?.(data);
  }, [onDataPoint]);

  useEffect(() => {
    if (!isPlaying) {
      setDataHistory([]);
      setCurrentData(null);
    }
  }, [isPlaying, orbitType, enableMultiBody]);

  const orbitTypes = [
    { key: 'circular', label: 'Circular', desc: 'v = √(GM/r)' },
    { key: 'elliptical', label: 'Elliptical', desc: 'v > v_circular' },
    { key: 'escape', label: 'Escape', desc: 'v > √(2GM/r)' },
  ];

  return (
    <div className="relative h-full w-full">
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
        camera={{ position: [0, 12, 12], fov: 50 }}
        style={{ width: '100%', height: '100%', background: '#0a0a1a' }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false }}
      >
        <SimulationScene
          centralMass={centralMass}
          orbitingMass={orbitingMass}
          initialDistance={initialDistance}
          initialVelocity={initialVelocity}
          isPlaying={isPlaying}
          orbitType={orbitType}
          onDataUpdate={handleDataUpdate}
          enableMultiBody={enableMultiBody}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={6}
          maxDistance={28}
          autoRotate={!isPlaying}
          autoRotateSpeed={0.2}
        />
      </Canvas>

      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <div className="font-mono-display text-xs text-slate-400">ORBIT TYPE</div>
        <div className="flex flex-col gap-1">
          {orbitTypes.map(type => (
            <button
              key={type.key}
              onClick={() => setOrbitType(type.key)}
              className={`rounded px-3 py-1.5 text-left font-mono-display text-[10px] transition ${
                orbitType === type.key
                  ? 'border-[rgba(0,245,255,0.5)] bg-[rgba(0,245,255,0.2)] text-[#00f5ff]'
                  : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
              }`}
              style={{ borderWidth: '1px', borderStyle: 'solid' }}
            >
              <div>{type.label}</div>
              <div className="text-[9px] text-slate-500">{type.desc}</div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setEnableMultiBody(!enableMultiBody)}
          className={`mt-2 rounded px-3 py-1.5 font-mono-display text-[10px] transition ${
            enableMultiBody
              ? 'border-[rgba(255,0,255,0.5)] bg-[rgba(255,0,255,0.2)] text-[#ff00ff]'
              : 'border-[rgba(100,100,100,0.3)] bg-[rgba(50,50,50,0.3)] text-slate-400 hover:bg-[rgba(80,80,80,0.3)]'
          }`}
          style={{ borderWidth: '1px', borderStyle: 'solid' }}
        >
          {enableMultiBody ? 'Multi-Body: ON' : 'Multi-Body: OFF'}
        </button>
      </div>

      <div className="absolute right-4 top-4 rounded-lg border border-[rgba(0,245,255,0.3)] bg-[rgba(10,15,30,0.9)] p-3 backdrop-blur-md">
        <div className="mb-2 font-mono-display text-xs text-slate-400">ORBITAL PARAMETERS</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono-display text-[10px]">
          <span className="text-[#00f5ff]">r:</span>
          <span className="text-white">{(currentData?.r || 0).toFixed(2)} m</span>
          <span className="text-[#ff8800]">v:</span>
          <span className="text-white">{(currentData?.v || 0).toFixed(3)} m/s</span>
          <span className="text-[#88ff88]">KE:</span>
          <span className="text-white">{(currentData?.KE || 0).toFixed(2)} J</span>
          <span className="text-[#ff4444]">PE:</span>
          <span className="text-white">{(currentData?.PE || 0).toFixed(2)} J</span>
          <span className="text-[#ff88ff]">E:</span>
          <span className="text-white">{(currentData?.totalEnergy || 0).toFixed(2)} J</span>
          <span className="text-[#ffff00]">L:</span>
          <span className="text-white">{(currentData?.angularMomentum || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="absolute top-4 left-4 rounded-full border border-[rgba(255,136,0,0.3)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#ff8800]">
        Central Mass: {centralMass}
      </div>

      {orbitType === 'escape' && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-[rgba(255,68,68,0.5)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#ff4444]">
          Escape velocity mode — body will fly to infinity!
        </div>
      )}
    </div>
  );
}

GravitationalOrbits.getSceneConfig = (variables = {}) => {
  const { centralMass = 100, orbitingMass = 1, initialDistance = 5 } = variables;

  const circularV = Math.sqrt(G * centralMass / initialDistance);
  const escapeV = Math.sqrt(2 * G * centralMass / initialDistance);
  const keplerPeriod = 2 * Math.PI * Math.sqrt(Math.pow(initialDistance, 3) / (G * centralMass));
  const PE = -G * centralMass * orbitingMass / initialDistance;
  const KE = 0.5 * orbitingMass * circularV * circularV;
  const totalE = PE + KE;

  return {
    name: 'Gravitational Orbits',
    description: 'Orbital mechanics with Verlet integration',
    type: 'gravitational_orbits',
    physics: {
      centralMass,
      orbitingMass,
      initialDistance,
      circularVelocity: circularV,
      escapeVelocity: escapeV,
      keplerPeriod,
    },
    calculations: {
      circularVelocity: `v = √(GM/r) = ${circularV.toFixed(3)} m/s`,
      escapeVelocity: `v_esc = √(2GM/r) = ${escapeV.toFixed(3)} m/s`,
      keplerPeriod: `T = 2π√(r³/GM) = ${keplerPeriod.toFixed(3)} s`,
      orbitalEnergy: `E = KE + PE = ${totalE.toFixed(3)} J`,
      gravitationalForce: `F = GMm/r² = ${(G * centralMass * orbitingMass / (initialDistance * initialDistance)).toFixed(3)} N`,
    },
  };
};
