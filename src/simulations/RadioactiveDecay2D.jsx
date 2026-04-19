import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

export default function RadioactiveDecay2D(rawProps) {
  const {
    initialAtoms = 100,
    halfLife = 5,
    decayType = 'alpha',
    isPlaying = false,
  } = useSanitizedProps(rawProps);

  const N0 = Math.max(4, Math.min(400, Math.round(initialAtoms)));
  const lambda = Math.log(2) / Math.max(halfLife, 0.01);

  const atoms = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(N0 * 1.6));
    const rows = Math.ceil(N0 / cols);
    const arr = [];
    for (let i = 0; i < N0; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      arr.push({
        id: i,
        x: (c - cols / 2) * 0.5,
        y: (r - rows / 2) * 0.5,
        // exponential lifetime sample
        decayTime: -Math.log(Math.random() + 1e-9) / lambda,
      });
    }
    return arr;
  }, [N0, lambda]);

  const [t, setT] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => { setT(0); }, [N0, halfLife]);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
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

  const remaining = atoms.filter(a => a.decayTime > t).length;
  const expected = N0 * Math.exp(-lambda * t);

  const width = 16, height = 10;
  const world = { width, height, origin: { x: width / 2, y: height / 2 }, background: '#07111f' };

  const bodies = atoms.map(a => ({
    id: `a-${a.id}`,
    type: 'circle',
    x: a.x - 3, y: a.y,
    r: 0.15,
    fill: a.decayTime > t ? '#22d3ee' : 'rgba(255,100,100,0.18)',
    stroke: a.decayTime > t ? '#88e6ff' : 'rgba(255,100,100,0.25)',
    strokeWidth: 0.02,
  }));

  // Curve: N/N0 vs t
  const curvePts = [];
  const tMax = halfLife * 6;
  const graphX0 = 3.2, graphX1 = 7.5, graphY0 = -3.5, graphY1 = 3;
  for (let i = 0; i <= 60; i++) {
    const tt = (i / 60) * tMax;
    const frac = Math.exp(-lambda * tt);
    curvePts.push([graphX0 + (tt / tMax) * (graphX1 - graphX0), graphY0 + frac * (graphY1 - graphY0)]);
  }
  const trails = [
    { id: 'curve', points: curvePts, color: '#00f5ff', width: 0.06, opacity: 0.9 },
    { id: 'now', points: [[graphX0 + Math.min(1, t / tMax) * (graphX1 - graphX0), graphY0], [graphX0 + Math.min(1, t / tMax) * (graphX1 - graphX0), graphY1]], color: '#ffaa00', width: 0.04, opacity: 0.8 },
  ];

  const axis = [
    { id: 'xa', type: 'line', x1: graphX0, y1: graphY0, x2: graphX1, y2: graphY0, stroke: 'rgba(255,255,255,0.4)', strokeWidth: 0.02 },
    { id: 'ya', type: 'line', x1: graphX0, y1: graphY0, x2: graphX0, y2: graphY1, stroke: 'rgba(255,255,255,0.4)', strokeWidth: 0.02 },
  ];

  const labels = [
    { id: 'tit', x: -3, y: height / 2 - 0.7, text: `Atoms: ${remaining}/${N0}`, color: '#22d3ee', fontSize: 0.4 },
    { id: 'sub', x: -3, y: height / 2 - 1.3, text: `t=${t.toFixed(1)}s, t½=${halfLife}s, ${decayType}`, color: '#9ca3af', fontSize: 0.3 },
    { id: 'gtit', x: (graphX0 + graphX1) / 2, y: graphY1 + 0.4, text: 'N(t)/N₀ = e^(−λt)', color: '#e5f8ff', fontSize: 0.32 },
    { id: 'exp', x: -3, y: -height / 2 + 0.7, text: `Expected: ${expected.toFixed(1)}`, color: '#ffaa00', fontSize: 0.3 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={[...bodies, ...axis]} trails={trails} labels={labels} />
    </div>
  );
}
