import { useMemo } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

const K_E = 8.9875e9;

function fieldAt(x, y, charges) {
  let ex = 0, ey = 0;
  for (const c of charges) {
    const dx = x - c.x, dy = y - c.y;
    const r2 = dx * dx + dy * dy;
    if (r2 < 0.04) continue;
    const r = Math.sqrt(r2);
    const f = (c.q * 1e6) / r2;
    ex += f * (dx / r);
    ey += f * (dy / r);
  }
  return [ex, ey];
}

function traceLine(startX, startY, sign, charges, bounds) {
  const pts = [[startX, startY]];
  let x = startX, y = startY;
  const step = 0.15;
  for (let i = 0; i < 300; i++) {
    const [ex, ey] = fieldAt(x, y, charges);
    const mag = Math.hypot(ex, ey);
    if (mag < 1e-6) break;
    x += (sign * ex / mag) * step;
    y += (sign * ey / mag) * step;
    if (x < bounds.xMin || x > bounds.xMax || y < bounds.yMin || y > bounds.yMax) break;
    const hitCharge = charges.some((c) => Math.hypot(x - c.x, y - c.y) < 0.3);
    pts.push([x, y]);
    if (hitCharge) break;
  }
  return pts;
}

export default function ElectricFields2D(rawProps) {
  const { charges = [{ x: -2, y: 0, q: 1e-6 }, { x: 2, y: 0, q: -1e-6 }] } = useSanitizedProps(rawProps);

  const width = 16, height = 10;
  const bounds = { xMin: -width / 2, xMax: width / 2, yMin: -height / 2, yMax: height / 2 };

  const trails = useMemo(() => {
    const lines = [];
    const SEEDS = 12;
    charges.forEach((c, ci) => {
      if (Math.abs(c.q) < 1e-12) return;
      for (let k = 0; k < SEEDS; k++) {
        const a = (k / SEEDS) * Math.PI * 2;
        const sx = c.x + Math.cos(a) * 0.35;
        const sy = c.y + Math.sin(a) * 0.35;
        const sign = c.q > 0 ? 1 : -1;
        const pts = traceLine(sx, sy, sign, charges, bounds);
        lines.push({
          id: `fl-${ci}-${k}`,
          points: pts,
          color: 'rgba(0,245,255,0.45)',
          width: 0.035,
          opacity: 0.8,
        });
      }
    });
    return lines;
  }, [charges]);

  const bodies = charges.map((c, i) => ({
    id: `q-${i}`,
    type: 'circle',
    x: c.x, y: c.y, r: 0.35,
    fill: c.q > 0 ? '#ff5566' : '#22d3ee',
    stroke: '#ffffff', strokeWidth: 0.05,
  }));

  const labels = charges.map((c, i) => ({
    id: `lbl-${i}`,
    x: c.x, y: c.y + 0.7,
    text: `${c.q > 0 ? '+' : ''}${(c.q * 1e6).toFixed(1)} µC`,
    color: c.q > 0 ? '#ff8899' : '#88e6ff',
    fontSize: 0.38,
  }));

  const world = { width, height, origin: { x: width / 2, y: height / 2 }, background: '#07111f', grid: { step: 1 } };

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={bodies} trails={trails} labels={labels} />
    </div>
  );
}
