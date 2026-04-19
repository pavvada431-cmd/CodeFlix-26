import { useEffect, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

// Simple DC series circuit: battery → resistor → bulb → back.
// Ohm's law I = V/R, bulb power P = I²R_bulb.
export default function Circuit2D(rawProps) {
  const {
    voltage = 9,          // V
    resistance = 10,      // Ω (external resistor)
    bulbResistance = 5,   // Ω
    isPlaying = false,
  } = useSanitizedProps(rawProps);

  const V = Math.max(0.1, voltage);
  const Rtot = Math.max(0.1, resistance + bulbResistance);
  const I = V / Rtot;
  const Pbulb = I * I * bulbResistance;
  const Ptot = V * I;

  const [phase, setPhase] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(rafRef.current); return; }
    let last = 0;
    const loop = (now) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      setPhase(p => p + I * dt * 1.5);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, I]);

  const width = 18, height = 10;
  const world = { width, height, origin: { x: width / 2, y: height / 2 }, background: '#07111f' };

  // Rectangular loop
  const L = -6, R = 6, T = 2.5, B = -2.5;
  const wires = [
    { id: 'w1', type: 'line', x1: L, y1: B, x2: L, y2: T, stroke: '#22d3ee', strokeWidth: 0.08 },
    { id: 'w2', type: 'line', x1: L, y1: T, x2: -2, y2: T, stroke: '#22d3ee', strokeWidth: 0.08 },
    { id: 'w3', type: 'line', x1: 2,  y1: T, x2: R, y2: T, stroke: '#22d3ee', strokeWidth: 0.08 },
    { id: 'w4', type: 'line', x1: R,  y1: T, x2: R, y2: B, stroke: '#22d3ee', strokeWidth: 0.08 },
    { id: 'w5', type: 'line', x1: R,  y1: B, x2: 1.5, y2: B, stroke: '#22d3ee', strokeWidth: 0.08 },
    { id: 'w6', type: 'line', x1: -1.5, y1: B, x2: L, y2: B, stroke: '#22d3ee', strokeWidth: 0.08 },
  ];

  // Battery (left side on bottom leg). Long = +, short = −
  const battery = [
    { id: 'bat-long',  type: 'line', x1: -1.8, y1: B - 0.45, x2: -1.8, y2: B + 0.45, stroke: '#e5f8ff', strokeWidth: 0.1 },
    { id: 'bat-short', type: 'line', x1: -1.5, y1: B - 0.25, x2: -1.5, y2: B + 0.25, stroke: '#e5f8ff', strokeWidth: 0.1 },
    { id: 'bat-long2', type: 'line', x1: -1.2, y1: B - 0.45, x2: -1.2, y2: B + 0.45, stroke: '#e5f8ff', strokeWidth: 0.1 },
    { id: 'bat-short2',type: 'line', x1: -0.9, y1: B - 0.25, x2: -0.9, y2: B + 0.25, stroke: '#e5f8ff', strokeWidth: 0.1 },
    { id: 'bat-wire',  type: 'line', x1: -0.9, y1: B, x2: 1.5, y2: B, stroke: '#22d3ee', strokeWidth: 0.08 },
  ];

  // Resistor (zig-zag on top leg, between -2 and +2)
  const zig = [];
  const zigPts = [];
  const zx0 = -2, zx1 = 2, zy = T;
  const segs = 8;
  for (let i = 0; i <= segs; i++) {
    const x = zx0 + (zx1 - zx0) * (i / segs);
    const y = zy + (i % 2 === 0 ? 0 : 0.25);
    zigPts.push([x, y]);
  }
  for (let i = 0; i < zigPts.length - 1; i++) {
    zig.push({ id: `z${i}`, type: 'line', x1: zigPts[i][0], y1: zigPts[i][1], x2: zigPts[i+1][0], y2: zigPts[i+1][1], stroke: '#ffaa00', strokeWidth: 0.08 });
  }

  // Bulb (circle on right side mid, splice into top-right leg wire)
  // Replace w3 path: route through bulb at (4, T)
  const brightness = Math.min(1, Pbulb / 8);
  const bulbGlow = 0.25 + brightness * 0.75;
  const bulb = [
    { id: 'bulb-glow', type: 'circle', x: 4, y: T, r: 0.9, fill: `rgba(255,230,120,${0.1 + brightness * 0.35})`, stroke: 'none', strokeWidth: 0 },
    { id: 'bulb', type: 'circle', x: 4, y: T, r: 0.55, fill: `rgba(255,230,120,${bulbGlow})`, stroke: '#ffaa00', strokeWidth: 0.06 },
    { id: 'filament', type: 'line', x1: 3.7, y1: T, x2: 4.3, y2: T, stroke: '#ffaa00', strokeWidth: 0.06 },
  ];

  // Current electrons — small dots moving along loop
  const perim = 2 * ((R - L) + (T - B));
  const electronCount = 12;
  const electrons = [];
  for (let i = 0; i < electronCount; i++) {
    const s = ((phase + i / electronCount) % 1) * perim;
    let x, y;
    let d = s;
    const leftH = (T - B);
    const topW = (R - L);
    if (d < leftH) { x = L; y = B + d; }
    else if ((d -= leftH) < topW) { x = L + d; y = T; }
    else if ((d -= topW) < leftH) { x = R; y = T - d; }
    else { d -= leftH; x = R - d; y = B; }
    electrons.push({ id: `e${i}`, type: 'circle', x, y, r: 0.1, fill: '#22d3ee', stroke: '#e5f8ff', strokeWidth: 0.02 });
  }

  const labels = [
    { id: 't', x: 0, y: height / 2 - 0.6, text: `V = ${V} V · R = ${resistance} Ω · R_bulb = ${bulbResistance} Ω`, color: '#22d3ee', fontSize: 0.38 },
    { id: 'i', x: 0, y: height / 2 - 1.2, text: `I = V/R = ${I.toFixed(3)} A`, color: '#ffaa00', fontSize: 0.34 },
    { id: 'p', x: 0, y: -height / 2 + 0.8, text: `P_total = ${Ptot.toFixed(2)} W · P_bulb = ${Pbulb.toFixed(2)} W`, color: '#e5f8ff', fontSize: 0.3 },
    { id: 'rl', x: 0, y: T + 0.7, text: `R`, color: '#ffaa00', fontSize: 0.32 },
    { id: 'bl', x: 4, y: T - 0.95, text: 'Bulb', color: '#ffaa00', fontSize: 0.28 },
    { id: 'batl', x: -1.35, y: B - 0.9, text: 'Battery', color: '#e5f8ff', fontSize: 0.28 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={[...wires, ...battery, ...zig, ...bulb, ...electrons]} labels={labels} />
    </div>
  );
}
