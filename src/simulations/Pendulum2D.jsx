import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';
import { createPendulumState, stepPendulum, pendulumDerived } from '../physics/pendulum';

export default function Pendulum2D(rawProps) {
  const {
    length = 2,
    mass = 1,
    initialAngle = 30,
    damping = 0,
    isPlaying = false,
    onDataPoint,
  } = useSanitizedProps(rawProps);

  const stateRef = useRef(createPendulumState(initialAngle));
  const [, setTick] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const emitRef = useRef(0);
  const trailRef = useRef([]);

  useEffect(() => {
    stateRef.current = createPendulumState(initialAngle);
    trailRef.current = [];
  }, [initialAngle, length, mass, damping]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return undefined;
    }
    lastRef.current = 0;
    const tick = (now) => {
      const dt = lastRef.current ? Math.min(0.05, (now - lastRef.current) / 1000) : 0;
      lastRef.current = now;
      stepPendulum(stateRef.current, dt, { length, damping, gravity: 9.81 });
      const bobX = Math.sin(stateRef.current.theta) * length;
      const bobY = -Math.cos(stateRef.current.theta) * length;
      trailRef.current.push([bobX, bobY]);
      if (trailRef.current.length > 240) trailRef.current.shift();
      setTick((x) => (x + 1) % 1e9);
      if (onDataPoint && now / 1000 - emitRef.current > 0.05) {
        emitRef.current = now / 1000;
        const d = pendulumDerived(stateRef.current, { length, mass, damping, gravity: 9.81 });
        onDataPoint({
          t_s: now / 1000,
          theta_rad: d.theta,
          angle_deg: (d.theta * 180) / Math.PI,
          angle: (d.theta * 180) / Math.PI,
          angularVelocity_radps: d.omega,
          angularAcceleration_radps2: d.alpha,
          tangentialVelocity_mps: d.tangentialVelocity,
          tangentialAcceleration_mps2: d.tangentialAcceleration,
          radialAcceleration_mps2: d.radialAcceleration,
          velocity_mps: d.tangentialVelocity,
          velocity: d.tangentialVelocity,
          tangentialForce_N: d.tangentForce,
          centripetalForce_N: d.centripetalForce,
          tension_N: d.tensionForce,
          kineticEnergy_J: d.kineticEnergy,
          potentialEnergy_J: d.potentialEnergy,
          totalEnergy_J: d.totalEnergy,
          smallAnglePeriod_s: d.smallAnglePeriod,
          dampedPeriod_s: d.dampedPeriod,
          dampingCoefficient_per_s: damping,
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, length, mass, damping, onDataPoint]);

  const span = Math.max(2, length * 2 + 1);
  const world = useMemo(() => ({
    width: span,
    height: span,
    origin: { x: span / 2, y: span - 0.6 },
    background: '#07111f',
    grid: { step: 0.5 },
  }), [span]);

  const theta = stateRef.current.theta;
  const bobX = Math.sin(theta) * length;
  const bobY = -Math.cos(theta) * length;
  const bobR = Math.max(0.08, Math.min(0.4, Math.cbrt(Math.max(0.01, mass)) * 0.2));

  const bodies = [
    { id: 'pivot', type: 'circle', x: 0, y: 0, r: 0.08, fill: '#e5f8ff', stroke: '#00f5ff' },
    { id: 'rod', type: 'line', x1: 0, y1: 0, x2: bobX, y2: bobY, stroke: '#00f5ff', strokeWidth: 0.04 },
    { id: 'bob', type: 'circle', x: bobX, y: bobY, r: bobR, fill: '#ffaa00', stroke: '#fff1c1', strokeWidth: 0.03 },
  ];

  const trails = [
    { id: 'swing', points: trailRef.current.slice(), color: 'rgba(255,170,0,0.65)', width: 0.03 },
  ];

  const period = 2 * Math.PI * Math.sqrt(Math.max(1e-6, length) / 9.81);
  const labels = [
    { id: 'period', x: 0, y: 0.4, text: `T ≈ ${period.toFixed(2)} s`, color: '#e5f8ff' },
    { id: 'angle', x: bobX, y: bobY - bobR - 0.25, text: `θ = ${((theta * 180) / Math.PI).toFixed(1)}°`, color: '#ffaa00' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={bodies} trails={trails} labels={labels} />
    </div>
  );
}
