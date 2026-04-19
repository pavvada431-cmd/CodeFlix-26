import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

const SHELLS = [2, 8, 18, 32, 32, 18, 8];

function distributeElectrons(Z) {
  const shells = [];
  let remaining = Z;
  for (const cap of SHELLS) {
    const n = Math.min(cap, remaining);
    shells.push(n);
    remaining -= n;
    if (remaining <= 0) break;
  }
  return shells;
}

const ELEMENTS = ['', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca'];

export default function AtomicStructure2D(rawProps) {
  const {
    atomicNumber = 8,
    mode = 'bohr',
    isPlaying = false,
  } = useSanitizedProps(rawProps);

  const Z = Math.max(1, Math.min(30, Math.round(atomicNumber)));
  const shells = useMemo(() => distributeElectrons(Z), [Z]);

  const [t, setT] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);

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

  const width = 14, height = 10;
  const world = { width, height, origin: { x: width / 2, y: height / 2 }, background: '#07111f' };

  const nucleus = { id: 'nuc', type: 'circle', x: 0, y: 0, r: 0.55, fill: '#ff5566', stroke: '#ffcc88', strokeWidth: 0.06 };

  const orbits = shells.map((_, i) => ({
    id: `orb-${i}`, type: 'circle', x: 0, y: 0, r: 1 + i * 0.9,
    fill: 'none', stroke: 'rgba(0,245,255,0.3)', strokeWidth: 0.02,
  }));

  const electrons = [];
  shells.forEach((count, shellIdx) => {
    const r = 1 + shellIdx * 0.9;
    const omega = 1.2 / (1 + shellIdx * 0.5);
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + omega * t + shellIdx * 0.3;
      electrons.push({
        id: `e-${shellIdx}-${i}`,
        type: 'circle',
        x: r * Math.cos(ang),
        y: r * Math.sin(ang),
        r: 0.15,
        fill: '#22d3ee', stroke: '#88e6ff', strokeWidth: 0.02,
      });
    }
  });

  const symbol = ELEMENTS[Z] || `Z=${Z}`;

  const labels = [
    { id: 'sym', x: 0, y: 0, text: symbol, color: '#fff1c1', fontSize: 0.5 },
    { id: 'z', x: 0, y: height / 2 - 0.6, text: `${symbol}  Z=${Z}   config: ${shells.join(',')}`, color: '#e5f8ff', fontSize: 0.38 },
    { id: 'mode', x: -width / 2 + 0.3, y: -height / 2 + 0.4, text: mode === 'bohr' ? 'Bohr Model' : 'Quantum Cloud', color: '#9ca3af', anchor: 'start', fontSize: 0.3 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={[...orbits, nucleus, ...electrons]} labels={labels} />
    </div>
  );
}
