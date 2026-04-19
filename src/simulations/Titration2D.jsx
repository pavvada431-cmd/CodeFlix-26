import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

function computePH(Va, Ca, Cb, Vb) {
  // Strong acid + strong base model.
  const molA = Ca * Va;
  const molB = Cb * Vb;
  const Vtot = Va + Vb;
  if (Vtot <= 0) return 7;
  if (molB < molA) {
    const H = (molA - molB) / Vtot;
    return -Math.log10(Math.max(H, 1e-14));
  }
  if (molB > molA) {
    const OH = (molB - molA) / Vtot;
    return 14 + Math.log10(Math.max(OH, 1e-14));
  }
  return 7;
}

export default function Titration2D(rawProps) {
  const {
    acidConcentration = 0.1,
    baseConcentration = 0.1,
    volume = 25,
    isPlaying = false,
  } = useSanitizedProps(rawProps);

  const Va = volume;
  const equivalenceV = (acidConcentration * Va) / Math.max(baseConcentration, 1e-6);
  const maxV = equivalenceV * 2;

  const [addedV, setAddedV] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);

  useEffect(() => { setAddedV(0); }, [acidConcentration, baseConcentration, volume]);

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(rafRef.current); return; }
    const tick = (now) => {
      const dt = lastRef.current ? (now - lastRef.current) / 1000 : 0.016;
      lastRef.current = now;
      setAddedV(v => Math.min(maxV, v + (maxV / 12) * dt));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, maxV]);

  const pH = computePH(Va, acidConcentration, baseConcentration, addedV);

  // Curve points
  const curvePts = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const v = (i / 80) * maxV;
      pts.push([v, computePH(Va, acidConcentration, baseConcentration, v)]);
    }
    return pts;
  }, [Va, acidConcentration, baseConcentration, maxV]);

  // Layout: left side = flask/burette schematic, right side = pH curve
  const width = 18, height = 10;
  const world = { width, height, origin: { x: width / 2, y: height / 2 }, background: '#07111f', grid: { step: 2 } };

  // Burette
  const burette = { id: 'bur', type: 'rect', x: -6, y: 2.5, w: 0.8, h: 4, fill: 'rgba(34,211,238,0.15)', stroke: '#22d3ee', strokeWidth: 0.04 };
  const buretteFillFrac = Math.max(0, 1 - addedV / maxV);
  const buretteFill = { id: 'burf', type: 'rect', x: -6, y: 0.5 + 2 * buretteFillFrac, w: 0.7, h: 4 * buretteFillFrac, fill: 'rgba(34,211,238,0.55)', stroke: 'rgba(34,211,238,0.8)', strokeWidth: 0.02 };
  // Flask
  const flask = { id: 'fl', type: 'polygon', points: [[-6.8, -2.5], [-5.2, -2.5], [-4.8, -1.5], [-5, 0.2], [-7, 0.2], [-7.2, -1.5]], fill: 'rgba(255,170,0,0.12)', stroke: '#ffaa00', strokeWidth: 0.04 };
  // Flask contents color depends on pH
  const flaskColor = pH < 5 ? 'rgba(255,80,80,0.4)' : pH > 9 ? 'rgba(130,80,255,0.4)' : 'rgba(255,170,0,0.4)';
  const flaskLiquid = { id: 'flq', type: 'polygon', points: [[-6.7, -2.4], [-5.3, -2.4], [-4.95, -1.4], [-5.1, -0.2], [-6.9, -0.2], [-7.05, -1.4]], fill: flaskColor, stroke: 'none', strokeWidth: 0 };

  // Curve axes (right side)
  const gx0 = -2, gx1 = 7, gy0 = -3.5, gy1 = 3.5;
  const toGx = (v) => gx0 + (v / Math.max(maxV, 1e-6)) * (gx1 - gx0);
  const toGy = (p) => gy0 + (p / 14) * (gy1 - gy0);
  const curveMapped = curvePts.map(([v, p]) => [toGx(v), toGy(p)]);
  const nowX = toGx(addedV);
  const nowY = toGy(pH);

  const axes = [
    { id: 'xa', type: 'line', x1: gx0, y1: gy0, x2: gx1, y2: gy0, stroke: 'rgba(255,255,255,0.4)', strokeWidth: 0.02 },
    { id: 'ya', type: 'line', x1: gx0, y1: gy0, x2: gx0, y2: gy1, stroke: 'rgba(255,255,255,0.4)', strokeWidth: 0.02 },
    { id: 'eq', type: 'line', x1: toGx(equivalenceV), y1: gy0, x2: toGx(equivalenceV), y2: gy1, stroke: 'rgba(255,170,0,0.5)', strokeWidth: 0.03 },
  ];

  const trails = [{ id: 'curve', points: curveMapped, color: '#00f5ff', width: 0.06, opacity: 0.95 }];

  const bodies = [burette, buretteFill, flask, flaskLiquid, ...axes,
    { id: 'now', type: 'circle', x: nowX, y: nowY, r: 0.18, fill: '#ffaa00', stroke: '#fff1c1', strokeWidth: 0.03 },
  ];

  const labels = [
    { id: 'ph', x: -6, y: height / 2 - 0.6, text: `pH = ${pH.toFixed(2)}`, color: '#22d3ee', fontSize: 0.45 },
    { id: 'add', x: -6, y: -height / 2 + 0.7, text: `Added: ${addedV.toFixed(1)} mL`, color: '#ffaa00', fontSize: 0.32 },
    { id: 'gl', x: (gx0 + gx1) / 2, y: gy1 + 0.4, text: 'pH vs Volume Added', color: '#e5f8ff', fontSize: 0.32 },
    { id: 'eqL', x: toGx(equivalenceV), y: gy1 + 0.1, text: `eq. point ${equivalenceV.toFixed(1)} mL`, color: '#ffaa00', fontSize: 0.26 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={bodies} trails={trails} labels={labels} />
    </div>
  );
}
