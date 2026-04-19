import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

export default function GasLaws2D(rawProps) {
  const {
    pressure = 1,
    volume = 12,
    temperature = 300,
    moles = 1,
    mode = 'boyle',
    isPlaying = false,
  } = useSanitizedProps(rawProps);

  const numParticles = Math.round(Math.max(15, Math.min(120, moles * 40)));
  const speed = Math.sqrt(Math.max(50, temperature) / 100);
  const boxW = Math.max(4, Math.min(12, volume * 0.6));
  const boxH = 6;

  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < numParticles; i++) {
      const a = Math.random() * Math.PI * 2;
      arr.push({
        x: (Math.random() - 0.5) * boxW,
        y: (Math.random() - 0.5) * boxH,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
      });
    }
    return arr;
  }, [numParticles, boxW, boxH, speed]);

  const [, setTick] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(rafRef.current); return; }
    const step = (now) => {
      const dt = lastRef.current ? Math.min(0.05, (now - lastRef.current) / 1000) : 0.016;
      lastRef.current = now;
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -boxW / 2 || p.x > boxW / 2) { p.vx = -p.vx; p.x = Math.max(-boxW / 2, Math.min(boxW / 2, p.x)); }
        if (p.y < -boxH / 2 || p.y > boxH / 2) { p.vy = -p.vy; p.y = Math.max(-boxH / 2, Math.min(boxH / 2, p.y)); }
      }
      setTick(n => n + 1);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, particles, boxW, boxH]);

  const width = 16, height = 10;
  const world = { width, height, origin: { x: width / 2, y: height / 2 }, background: '#07111f' };

  const box = { id: 'box', type: 'rect', x: 0, y: 0, w: boxW, h: boxH, fill: 'rgba(0,245,255,0.05)', stroke: '#00f5ff', strokeWidth: 0.06 };

  const bodies = [
    box,
    ...particles.map((p, i) => ({
      id: `p-${i}`, type: 'circle', x: p.x, y: p.y, r: 0.12,
      fill: '#ffaa00', stroke: '#ffcc66', strokeWidth: 0.01,
    })),
  ];

  const labels = [
    { id: 'law', x: 0, y: height / 2 - 0.6, text: `${mode.toUpperCase()}'s LAW`, color: '#22d3ee', fontSize: 0.4 },
    { id: 'P', x: -6, y: -height / 2 + 1.6, text: `P=${pressure.toFixed(2)} atm`, color: '#ffaa00', anchor: 'start', fontSize: 0.32 },
    { id: 'V', x: -6, y: -height / 2 + 1.1, text: `V=${volume.toFixed(1)} L`, color: '#ffaa00', anchor: 'start', fontSize: 0.32 },
    { id: 'T', x: -6, y: -height / 2 + 0.6, text: `T=${temperature.toFixed(0)} K`, color: '#ffaa00', anchor: 'start', fontSize: 0.32 },
    { id: 'n', x: -6, y: -height / 2 + 0.1, text: `n=${moles.toFixed(2)} mol`, color: '#ffaa00', anchor: 'start', fontSize: 0.32 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={bodies} labels={labels} />
    </div>
  );
}
