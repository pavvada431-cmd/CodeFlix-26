import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';
import { circularMotion, positionOnCircle } from '../physics/circularMotion';

export default function CircularMotion2D(rawProps) {
  const {
    radius = 2,
    mass = 1,
    angularVelocity = 2,
    frictionCoefficient = 0.6,
    isPlaying = false,
    onDataPoint,
  } = useSanitizedProps(rawProps);

  const v = angularVelocity * radius;
  const kin = useMemo(() => circularMotion({ radius, speed: v, mass }), [radius, v, mass]);

  const angleRef = useRef(0);
  const [, setTick] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const emitRef = useRef(0);
  const trailRef = useRef([]);

  useEffect(() => { angleRef.current = 0; trailRef.current = []; },
    [radius, mass, angularVelocity]);

  useEffect(() => {
    if (!isPlaying) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return undefined; }
    lastRef.current = 0;
    const tick = (now) => {
      const dt = lastRef.current ? Math.min(0.05, (now - lastRef.current) / 1000) : 0;
      lastRef.current = now;
      angleRef.current += kin.omega * dt;
      const pos = positionOnCircle(radius, 1, angleRef.current);
      trailRef.current.push([pos.x, pos.y]);
      if (trailRef.current.length > 200) trailRef.current.shift();
      setTick((x) => (x + 1) % 1e9);
      const nowSec = now / 1000;
      if (onDataPoint && nowSec - emitRef.current > 0.05) {
        emitRef.current = nowSec;
        onDataPoint({
          t_s: nowSec,
          theta_rad: angleRef.current,
          angle_deg: (angleRef.current * 180) / Math.PI,
          angularVelocity_radps: kin.omega,
          tangentialVelocity_mps: kin.v,
          velocity: kin.v,
          centripetalAcceleration_mps2: kin.centripetalAcceleration,
          centripetalForce_N: kin.centripetalForce,
          period_s: Number.isFinite(kin.period) ? kin.period : null,
          frequency_hz: kin.frequency,
          radius_m: kin.r,
          mass_kg: kin.m,
          frictionCoefficient,
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, kin.omega, kin.v, kin.centripetalAcceleration, kin.centripetalForce, kin.period, kin.frequency, kin.r, kin.m, frictionCoefficient, radius, onDataPoint]);

  const span = Math.max(3, radius * 2.6);
  const world = useMemo(() => ({
    width: span, height: span,
    origin: { x: span / 2, y: span / 2 },
    background: '#07111f', grid: { step: 0.5 },
  }), [span]);

  const pos = positionOnCircle(radius, 1, angleRef.current);
  const bobR = Math.max(0.1, Math.min(0.4, Math.cbrt(Math.max(0.01, mass)) * 0.25));

  const bodies = [
    { id: 'center', type: 'circle', x: 0, y: 0, r: 0.08, fill: '#e5f8ff', stroke: '#00f5ff' },
    { id: 'orbit', type: 'circle', x: 0, y: 0, r: radius, fill: 'none', stroke: 'rgba(0,245,255,0.4)', strokeWidth: 0.02 },
    { id: 'rope', type: 'line', x1: 0, y1: 0, x2: pos.x, y2: pos.y, stroke: 'rgba(0,245,255,0.6)', strokeWidth: 0.03 },
    { id: 'ball', type: 'circle', x: pos.x, y: pos.y, r: bobR, fill: '#ffaa00', stroke: '#fff1c1', strokeWidth: 0.03 },
  ];

  const forces = [
    { id: 'Fc', x: pos.x, y: pos.y, fx: -pos.x, fy: -pos.y, color: '#ff6b6b',
      scale: Math.min(1, 0.5 / Math.max(0.1, radius)) },
  ];

  const trails = [{ id: 'trail', points: trailRef.current.slice(), color: 'rgba(255,170,0,0.5)', width: 0.025 }];

  const labels = [
    { id: 'omega', x: 0, y: -radius - 0.5, text: `ω = ${kin.omega.toFixed(2)} rad/s`, color: '#00f5ff' },
    { id: 'Fc', x: 0, y: radius + 0.5, text: `F_c = ${kin.centripetalForce.toFixed(2)} N`, color: '#ff6b6b' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={bodies} forces={forces} trails={trails} labels={labels} />
    </div>
  );
}
