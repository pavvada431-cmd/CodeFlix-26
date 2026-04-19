import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

// Hydrocarbon combustion: CₓHᵧ + (x + y/4) O₂ → x CO₂ + (y/2) H₂O
const FUELS = {
  methane:   { formula: 'CH₄',   x: 1, y: 4,  H: 890  },   // kJ/mol
  propane:   { formula: 'C₃H₈',  x: 3, y: 8,  H: 2220 },
  butane:    { formula: 'C₄H₁₀', x: 4, y: 10, H: 2878 },
  octane:    { formula: 'C₈H₁₈', x: 8, y: 18, H: 5470 },
  ethanol:   { formula: 'C₂H₆O', x: 2, y: 6,  H: 1367 },
};

export default function Combustion2D(rawProps) {
  const {
    fuel = 'methane',
    fuelMoles = 1,
    isPlaying = false,
  } = useSanitizedProps(rawProps);

  const f = FUELS[fuel] || FUELS.methane;
  const o2 = (f.x + f.y / 4) * fuelMoles;
  const co2 = f.x * fuelMoles;
  const h2o = (f.y / 2) * fuelMoles;
  const energy = (f.H * fuelMoles).toFixed(0);

  const [t, setT] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(rafRef.current); return; }
    let last = 0;
    const loop = (now) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      setT(v => v + dt);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  const width = 18, height = 10;
  const world = { width, height, origin: { x: width / 2, y: height / 2 }, background: '#07111f' };

  // Flickering flame (concentric teardrops)
  const flicker = 0.08 * Math.sin(t * 12);
  const flame = useMemo(() => {
    const layers = [
      { r: 1.4 + flicker, color: 'rgba(255,80,20,0.22)' },
      { r: 1.0 + flicker * 1.4, color: 'rgba(255,170,0,0.5)' },
      { r: 0.55 + flicker * 1.8, color: 'rgba(255,230,120,0.85)' },
    ];
    return layers.map((l, i) => ({
      id: `flame-${i}`, type: 'circle', x: -4.5, y: 0.2 + (1.4 - l.r), r: l.r,
      fill: l.color, stroke: 'none', strokeWidth: 0,
    }));
  }, [flicker]);

  // Burner base
  const base = [
    { id: 'base', type: 'rect', x: -4.5, y: -1.6, w: 1.8, h: 0.6, fill: '#334155', stroke: '#64748b', strokeWidth: 0.04 },
    { id: 'pipe', type: 'rect', x: -4.5, y: -2.5, w: 0.4, h: 1.4, fill: '#475569', stroke: '#94a3b8', strokeWidth: 0.04 },
  ];

  // Reactant/product bars on right
  const speciesBars = [
    { label: f.formula, n: fuelMoles, color: '#ffaa00', x: 2 },
    { label: 'O₂',      n: o2,        color: '#60a5fa', x: 3.2 },
    { label: 'CO₂',     n: co2,       color: '#22d3ee', x: 5,   post: true },
    { label: 'H₂O',     n: h2o,       color: '#34d399', x: 6.2, post: true },
  ];
  const maxN = Math.max(...speciesBars.map(s => s.n), 1);
  const barBodies = speciesBars.flatMap(s => {
    const h = (s.n / maxN) * 4.2;
    return [
      { id: `b-${s.label}-bg`, type: 'rect', x: s.x, y: -1 + h / 2, w: 0.9, h, fill: 'rgba(255,255,255,0.06)', stroke: 'rgba(255,255,255,0.2)', strokeWidth: 0.02 },
      { id: `b-${s.label}`,    type: 'rect', x: s.x, y: -1 + h / 2, w: 0.85, h, fill: s.color, stroke: s.color, strokeWidth: 0.02 },
    ];
  });

  const arrow = { id: 'arr', type: 'line', x1: 4, y1: 0.8, x2: 4.8, y2: 0.8, stroke: '#22d3ee', strokeWidth: 0.08 };
  const arrowHead = { id: 'ah', type: 'polygon', points: [[4.8, 0.8], [4.5, 1.0], [4.5, 0.6]], fill: '#22d3ee', stroke: '#22d3ee', strokeWidth: 0.02 };

  const labels = [
    { id: 'eq', x: 0, y: height / 2 - 0.6, text: `${fuelMoles} ${f.formula} + ${o2} O₂ → ${co2} CO₂ + ${h2o} H₂O`, color: '#22d3ee', fontSize: 0.42 },
    { id: 'dh', x: 0, y: height / 2 - 1.15, text: `ΔH ≈ −${energy} kJ (exothermic)`, color: '#ff8899', fontSize: 0.32 },
    ...speciesBars.map(s => ({ id: `l-${s.label}`, x: s.x, y: -1.6, text: s.label, color: '#e5f8ff', fontSize: 0.3 })),
    ...speciesBars.map(s => ({ id: `v-${s.label}`, x: s.x, y: -1 + (s.n / maxN) * 4.2 + 0.3, text: `${s.n}`, color: '#9ca3af', fontSize: 0.26 })),
    { id: 'rh', x: 2.6, y: -2.1, text: 'Reactants', color: '#ffaa00', fontSize: 0.3 },
    { id: 'ph', x: 5.6, y: -2.1, text: 'Products',  color: '#22d3ee', fontSize: 0.3 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={[...base, ...flame, arrow, arrowHead, ...barBodies]} labels={labels} />
    </div>
  );
}
