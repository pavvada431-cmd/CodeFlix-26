import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

export default function GravitationalOrbits2D(rawProps) {
  const {
    centralMass = 100,
    orbitingMass = 1,
    initialDistance = 5,
    initialVelocity = 1,
    isPlaying = false,
  } = useSanitizedProps(rawProps);

  const G = 1;
  const r0 = Math.max(1, initialDistance);
  const v0 = Math.max(0.1, initialVelocity);

  // Compute orbital elements from initial state (perpendicular velocity assumption).
  const elements = useMemo(() => {
    const mu = G * centralMass;
    const energy = 0.5 * v0 * v0 - mu / r0;
    const a = -mu / (2 * energy); // semi-major axis
    const L = r0 * v0; // specific angular momentum
    const e = Math.sqrt(Math.max(0, 1 + (2 * energy * L * L) / (mu * mu)));
    const T = 2 * Math.PI * Math.sqrt(Math.max(a, 0.1) ** 3 / mu);
    return { a: Math.abs(a), e: Math.min(0.95, e), T: Math.max(2, T), mu };
  }, [centralMass, v0, r0]);

  const [t, setT] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const trailRef = useRef([]);

  useEffect(() => { setT(0); trailRef.current = []; }, [centralMass, initialDistance, initialVelocity]);

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(rafRef.current); return; }
    startRef.current = 0;
    const tick = (now) => {
      if (!startRef.current) startRef.current = now;
      setT((now - startRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  // Kepler: approximate by uniform angle for visualization speed.
  const { a, e, T } = elements;
  const b = a * Math.sqrt(1 - e * e);
  const theta = (2 * Math.PI * t) / T;
  const cx = a * Math.cos(theta) - a * e;
  const cy = b * Math.sin(theta);

  const lastTrail = trailRef.current[trailRef.current.length - 1];
  if (!lastTrail || Math.hypot(lastTrail[0] - cx, lastTrail[1] - cy) > 0.1) {
    trailRef.current.push([cx, cy]);
    if (trailRef.current.length > 500) trailRef.current.shift();
  }

  // Ellipse path for display
  const ellipsePts = [];
  for (let i = 0; i <= 100; i++) {
    const ang = (i / 100) * Math.PI * 2;
    ellipsePts.push([a * Math.cos(ang) - a * e, b * Math.sin(ang)]);
  }

  const extent = Math.max(a * 1.4, 5);
  const world = { width: extent * 2, height: extent * 2, origin: { x: extent, y: extent }, background: '#07111f', grid: { step: Math.max(1, Math.round(extent / 6)) } };

  const bodies = [
    { id: 'star', type: 'circle', x: 0, y: 0, r: 0.45, fill: '#ffaa00', stroke: '#fff1c1', strokeWidth: 0.05 },
    { id: 'planet', type: 'circle', x: cx, y: cy, r: 0.22, fill: '#22d3ee', stroke: '#88e6ff', strokeWidth: 0.03 },
  ];

  const trails = [
    { id: 'ellipse', points: ellipsePts, color: 'rgba(0,245,255,0.35)', width: 0.03, opacity: 0.7 },
    { id: 'path', points: trailRef.current, color: '#22d3ee', width: 0.06, opacity: 0.9 },
  ];

  const labels = [
    { id: 'a', x: 0, y: extent - 0.5, text: `a=${a.toFixed(2)} e=${e.toFixed(2)} T=${T.toFixed(1)}s`, color: '#e5f8ff', fontSize: 0.35 },
    { id: 'star-lbl', x: 0, y: -0.8, text: `M=${centralMass}`, color: '#ffaa00', fontSize: 0.3 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={bodies} trails={trails} labels={labels} />
    </div>
  );
}
