import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

export default function Thermodynamics2D(rawProps) {
  const {
    numParticles = 50,
    temperature = 300,
    volume = 8,
    isPlaying = false,
  } = useSanitizedProps(rawProps);

  const N = Math.round(Math.max(10, Math.min(150, numParticles)));
  const rmsSpeed = Math.sqrt(Math.max(100, temperature) / 100);
  const boxW = Math.max(3, Math.min(10, volume * 0.7));
  const boxH = 5;

  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rmsSpeed * (0.5 + Math.random());
      arr.push({
        x: (Math.random() - 0.5) * boxW,
        y: (Math.random() - 0.5) * boxH,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      });
    }
    return arr;
  }, [N, boxW, boxH, rmsSpeed]);

  const [, setTick] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(rafRef.current); return; }
    const step = (now) => {
      const dt = lastRef.current ? Math.min(0.05, (now - lastRef.current) / 1000) : 0.016;
      lastRef.current = now;
      for (const p of particles) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (Math.abs(p.x) > boxW / 2) { p.vx = -p.vx; p.x = Math.sign(p.x) * boxW / 2; }
        if (Math.abs(p.y) > boxH / 2) { p.vy = -p.vy; p.y = Math.sign(p.y) * boxH / 2; }
      }
      setTick(n => n + 1);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, particles, boxW, boxH]);

  // Histogram of speeds
  const bins = 12;
  const maxSpeed = rmsSpeed * 2.5;
  const hist = new Array(bins).fill(0);
  for (const p of particles) {
    const s = Math.hypot(p.vx, p.vy);
    const idx = Math.min(bins - 1, Math.floor((s / maxSpeed) * bins));
    hist[idx]++;
  }
  const histMax = Math.max(1, ...hist);

  const width = 18, height = 10;
  const world = { width, height, origin: { x: width / 2, y: height / 2 }, background: '#07111f' };

  const box = { id: 'box', type: 'rect', x: -3, y: 0, w: boxW, h: boxH, fill: 'rgba(0,245,255,0.05)', stroke: '#00f5ff', strokeWidth: 0.06 };

  const partBodies = particles.map((p, i) => ({
    id: `p-${i}`, type: 'circle', x: p.x - 3, y: p.y, r: 0.1,
    fill: '#ffaa00', stroke: '#ffcc66', strokeWidth: 0.01,
  }));

  // Histogram bars to the right
  const barX0 = 3, barX1 = 7.5, barY0 = -2.5;
  const barWidth = (barX1 - barX0) / bins;
  const histBars = hist.map((c, i) => ({
    id: `b-${i}`, type: 'rect',
    x: barX0 + (i + 0.5) * barWidth, y: barY0 + (c / histMax) * 2.5,
    w: barWidth * 0.85, h: (c / histMax) * 5,
    fill: 'rgba(34,211,238,0.55)', stroke: '#22d3ee', strokeWidth: 0.02,
  }));

  const axes = [
    { id: 'xa', type: 'line', x1: barX0, y1: barY0, x2: barX1, y2: barY0, stroke: 'rgba(255,255,255,0.4)', strokeWidth: 0.02 },
    { id: 'ya', type: 'line', x1: barX0, y1: barY0, x2: barX0, y2: barY0 + 5.2, stroke: 'rgba(255,255,255,0.4)', strokeWidth: 0.02 },
  ];

  const labels = [
    { id: 't', x: -3, y: height / 2 - 0.6, text: `Ideal Gas: N=${N}, T=${temperature}K`, color: '#22d3ee', fontSize: 0.38 },
    { id: 'h', x: (barX0 + barX1) / 2, y: barY0 + 5.6, text: 'Maxwell–Boltzmann speed distribution', color: '#e5f8ff', fontSize: 0.3 },
    { id: 'V', x: -3, y: -height / 2 + 0.5, text: `V=${volume} m³  v_rms≈${rmsSpeed.toFixed(2)}`, color: '#ffaa00', fontSize: 0.3 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={[box, ...partBodies, ...axes, ...histBars]} labels={labels} />
    </div>
  );
}
