import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

export default function MagneticFields2D(rawProps) {
  const {
    charge = 1.6e-19,
    velocity = 1e6,
    magneticField = 0.5,
    electricField = 0,
    isPlaying = false,
  } = useSanitizedProps(rawProps);

  const mass = 9.11e-31;
  const q = Math.abs(charge) || 1.6e-19;
  const radius = useMemo(() => Math.max(0.5, Math.min(4, (mass * velocity) / (q * Math.max(magneticField, 1e-6)) * 1e6)), [velocity, magneticField, q]);
  const omega = useMemo(() => (q * magneticField) / mass / 1e6, [q, magneticField]);

  const [t, setT] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const trailRef = useRef([]);

  useEffect(() => {
    setT(0);
    trailRef.current = [];
  }, [velocity, magneticField, charge, electricField]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    startRef.current = 0;
    const tick = (now) => {
      if (!startRef.current) startRef.current = now;
      setT((now - startRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  const sign = charge >= 0 ? -1 : 1;
  const theta = sign * omega * t;
  const cx = radius * Math.cos(theta);
  const cy = radius * Math.sin(theta) + (electricField * t * t * 0.01);

  const lastTrail = trailRef.current[trailRef.current.length - 1];
  if (!lastTrail || Math.hypot(lastTrail[0] - cx, lastTrail[1] - cy) > 0.05) {
    trailRef.current.push([cx, cy]);
    if (trailRef.current.length > 500) trailRef.current.shift();
  }

  const width = 14, height = 10;
  const world = { width, height, origin: { x: width / 2, y: height / 2 }, background: '#07111f', grid: { step: 1 } };

  const bodies = [
    { id: 'particle', type: 'circle', x: cx, y: cy, r: 0.2, fill: charge >= 0 ? '#ff5566' : '#22d3ee', stroke: '#fff', strokeWidth: 0.04 },
  ];

  const bgDots = [];
  for (let x = -width / 2 + 1; x < width / 2; x += 1.2) {
    for (let y = -height / 2 + 1; y < height / 2; y += 1.2) {
      bgDots.push({ id: `b-${x}-${y}`, type: 'circle', x, y, r: 0.04, fill: 'rgba(0,245,255,0.35)', stroke: 'rgba(0,245,255,0.35)', strokeWidth: 0 });
    }
  }

  const trails = [
    { id: 'path', points: trailRef.current, color: charge >= 0 ? '#ff8899' : '#22d3ee', width: 0.05, opacity: 0.9 },
  ];

  const labels = [
    { id: 'B', x: -width / 2 + 1, y: height / 2 - 0.6, text: `B = ${magneticField} T (into page)`, color: '#88e6ff', anchor: 'start' },
    { id: 'r', x: 0, y: -height / 2 + 0.6, text: `r = ${radius.toFixed(2)} m`, color: '#ffaa00' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={[...bgDots, ...bodies]} trails={trails} labels={labels} />
    </div>
  );
}
