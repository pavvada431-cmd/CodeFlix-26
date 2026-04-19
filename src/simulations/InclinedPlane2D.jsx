import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';
import { inclinedPlaneForces } from '../physics/inclinedPlane';

export default function InclinedPlane2D(rawProps) {
  const {
    mass = 10,
    angle = 30,
    friction = 0,
    isPlaying = false,
    onComplete,
    onDataPoint,
  } = useSanitizedProps(rawProps);

  const f = useMemo(() => inclinedPlaneForces({ mass, angleDeg: angle, friction }),
    [mass, angle, friction]);

  const rampLength = 8;
  const blockSize = Math.max(0.35, Math.min(1.1, Math.cbrt(Math.max(0.1, mass)) * 0.45));

  const world = useMemo(() => ({
    width: rampLength * Math.cos(f.theta) + 4,
    height: rampLength * Math.sin(f.theta) + 3,
    origin: { x: 2, y: 0.6 },
    background: '#07111f',
    grid: { step: 1 },
  }), [f.theta]);

  const sRef = useRef(0);
  const vRef = useRef(0);
  const [, setTick] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const startRef = useRef(0);
  const completedRef = useRef(false);
  const emitRef = useRef(0);

  useEffect(() => {
    sRef.current = 0;
    vRef.current = 0;
    completedRef.current = false;
  }, [mass, angle, friction, isPlaying]);

  useEffect(() => {
    if (!isPlaying) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return undefined; }
    lastRef.current = 0;
    startRef.current = performance.now() / 1000;
    const tick = (now) => {
      const dt = lastRef.current ? Math.min(0.05, (now - lastRef.current) / 1000) : 0;
      lastRef.current = now;
      vRef.current += f.acceleration * dt;
      sRef.current += vRef.current * dt;
      const maxS = rampLength - blockSize;
      if (sRef.current >= maxS) {
        sRef.current = maxS;
        if (!completedRef.current) {
          completedRef.current = true;
          if (typeof onComplete === 'function') onComplete(vRef.current);
        }
      }
      setTick((x) => (x + 1) % 1e9);
      const nowSec = performance.now() / 1000;
      if (onDataPoint && nowSec - emitRef.current > 0.05) {
        emitRef.current = nowSec;
        onDataPoint({
          t_s: nowSec - startRef.current,
          position_m: sRef.current,
          velocity_mps: vRef.current,
          velocity: vRef.current,
          acceleration_mps2: f.acceleration,
          normalForce_N: f.normal,
          frictionForce_N: f.frictionForce,
          netForce_N: f.netForce,
          parallelComponent_N: f.parallel,
        });
      }
      if (!completedRef.current) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, f.acceleration, f.normal, f.frictionForce, f.netForce, f.parallel, onComplete, onDataPoint, blockSize, rampLength]);

  // Ramp goes from bottom-left (0,0) up to top-right (topX, topY).
  // Block starts at the top and slides DOWN the slope due to gravity.
  // `s` is distance slid from the top, in metres.
  const rx = 0;
  const ry = 0;
  const topX = rx + rampLength * Math.cos(f.theta);
  const topY = ry + rampLength * Math.sin(f.theta);
  const s = sRef.current;
  const slideX = topX - s * Math.cos(f.theta);
  const slideY = topY - s * Math.sin(f.theta);
  // Block centre sits one half-height above the slope surface (normal direction).
  const blockCx = slideX - (blockSize / 2) * Math.sin(f.theta);
  const blockCy = slideY + (blockSize / 2) * Math.cos(f.theta);

  const bodies = [
    { id: 'ground', type: 'rect', x: (world.width) / 2 - 2, y: -0.2, w: world.width, h: 0.4,
      fill: 'rgba(0,245,255,0.08)', stroke: 'rgba(0,245,255,0.2)', strokeWidth: 0.02 },
    { id: 'ramp', type: 'polygon',
      points: [[rx, ry], [topX, topY], [topX, 0]],
      fill: 'rgba(0,245,255,0.14)', stroke: '#00f5ff', strokeWidth: 0.04 },
    { id: 'block', type: 'rect', x: blockCx, y: blockCy,
      w: blockSize, h: blockSize, angle: f.theta,
      fill: 'rgba(255,170,0,0.78)', stroke: '#fff1c1', strokeWidth: 0.04 },
  ];

  const forces = [
    { id: 'g', x: blockCx, y: blockCy, fx: 0, fy: -Math.min(1.2, f.weight / Math.max(f.weight, 1)) * 1.2, color: '#ff6b6b', scale: 1 },
  ];

  const labels = [
    { id: 'theta', x: rx + 1.4 * Math.cos(f.theta / 2), y: ry + 0.7 * Math.sin(f.theta / 2),
      text: `θ = ${angle.toFixed(0)}°`, color: '#00f5ff' },
    { id: 'a', x: blockCx + blockSize * 1.3, y: blockCy + 0.3,
      text: `a = ${f.acceleration.toFixed(2)} m/s²`, color: '#ffaa00', anchor: 'start' },
    { id: 'mu', x: topX, y: topY + 0.6, text: `μ = ${friction.toFixed(2)}`, color: '#e5f8ff', anchor: 'end' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={bodies} forces={forces} labels={labels} />
    </div>
  );
}

InclinedPlane2D.getSceneConfig = function getSceneConfig(variables = {}) {
  const f = inclinedPlaneForces({ mass: variables.mass, angleDeg: variables.angle, friction: variables.friction });
  return {
    name: 'Inclined Plane',
    backgroundColor: '#07111f',
    showGrid: true,
    variables: { mass: variables.mass, angle: variables.angle, friction: variables.friction },
    physics: {
      gravity: 9.81,
      normalForce_N: f.normal,
      parallelComponent_N: f.parallel,
      frictionLimit_N: f.maxStaticFriction,
      frictionForce_N: f.frictionForce,
      frictionRegime: f.slides ? 'kinetic' : 'static',
      netForce_N: f.netForce,
      acceleration_mps2: f.acceleration,
    },
  };
};
