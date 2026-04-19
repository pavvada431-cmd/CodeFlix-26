import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

// Moment of inertia coefficients (I = k·m·r²)
const INERTIA_K = { disk: 0.5, ring: 1, sphere: 0.4, rod: 1 / 12 };

export default function RotationalMechanics2D(rawProps) {
  const {
    objectType = 'disk',
    mass = 2,
    radius = 1,
    appliedForce = 10,
    forcePosition = 90,
    isPlaying = false,
  } = useSanitizedProps(rawProps);

  const R = Math.max(0.5, Math.min(3, radius));
  const k = INERTIA_K[objectType] ?? 0.5;
  const I = k * mass * R * R;
  const torque = appliedForce * R;
  const alpha = torque / Math.max(I, 1e-3);

  const [theta, setTheta] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const omegaRef = useRef(0);

  useEffect(() => { setTheta(0); omegaRef.current = 0; }, [objectType, mass, radius, appliedForce]);

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(rafRef.current); return; }
    const tick = (now) => {
      const dt = lastRef.current ? Math.min(0.05, (now - lastRef.current) / 1000) : 0.016;
      lastRef.current = now;
      omegaRef.current = Math.min(12, omegaRef.current + alpha * dt * 0.2);
      setTheta(t => t + omegaRef.current * dt);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, alpha]);

  const width = 14, height = 10;
  const world = { width, height, origin: { x: width / 2, y: height / 2 }, background: '#07111f', grid: { step: 1 } };

  const shape = useMemo(() => {
    if (objectType === 'ring') {
      return [
        { id: 'ring-o', type: 'circle', x: 0, y: 0, r: R, fill: 'rgba(34,211,238,0.15)', stroke: '#22d3ee', strokeWidth: 0.08 },
        { id: 'ring-i', type: 'circle', x: 0, y: 0, r: R * 0.75, fill: '#07111f', stroke: '#22d3ee', strokeWidth: 0.05 },
      ];
    }
    if (objectType === 'rod') {
      const hw = R, hh = 0.12;
      return [{ id: 'rod', type: 'rect', x: 0, y: 0, w: hw * 2, h: hh * 2, angle: theta, fill: 'rgba(255,170,0,0.3)', stroke: '#ffaa00', strokeWidth: 0.05 }];
    }
    // disk or sphere
    return [
      { id: 'disk', type: 'circle', x: 0, y: 0, r: R, fill: 'rgba(34,211,238,0.2)', stroke: '#22d3ee', strokeWidth: 0.05 },
    ];
  }, [objectType, R, theta]);

  // Spoke showing rotation
  const spokeEndX = R * Math.cos(theta);
  const spokeEndY = R * Math.sin(theta);
  const spoke = { id: 'spoke', type: 'line', x1: 0, y1: 0, x2: spokeEndX, y2: spokeEndY, stroke: '#ffaa00', strokeWidth: 0.08 };
  const hub = { id: 'hub', type: 'circle', x: 0, y: 0, r: 0.1, fill: '#ffaa00', stroke: '#ffaa00', strokeWidth: 0.02 };

  // Force arrow tangent at forcePosition on rim
  const phi = (forcePosition * Math.PI) / 180;
  const fx = -Math.sin(phi); // tangent direction
  const fy = Math.cos(phi);
  const ox = R * Math.cos(phi);
  const oy = R * Math.sin(phi);
  const force = { id: 'F', x: ox, y: oy, fx: fx * Math.min(2, appliedForce / 10), fy: fy * Math.min(2, appliedForce / 10), color: '#ff5566' };

  const labels = [
    { id: 't', x: 0, y: height / 2 - 0.6, text: `${objectType[0].toUpperCase() + objectType.slice(1)}  I=${I.toFixed(2)} kg·m²`, color: '#22d3ee', fontSize: 0.38 },
    { id: 'τ', x: ox + fx * 1.2, y: oy + fy * 1.2, text: `τ=${torque.toFixed(1)} N·m`, color: '#ff8899', fontSize: 0.3 },
    { id: 'a', x: 0, y: -height / 2 + 0.8, text: `α=${alpha.toFixed(2)} rad/s²  ω=${omegaRef.current.toFixed(2)} rad/s`, color: '#ffaa00', fontSize: 0.32 },
    { id: 'mr', x: 0, y: -height / 2 + 0.3, text: `m=${mass} kg  r=${R.toFixed(2)} m`, color: '#9ca3af', fontSize: 0.28 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={[...shape, spoke, hub]} forces={[force]} labels={labels} />
    </div>
  );
}
