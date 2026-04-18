import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';
import { createSpringState, stepSpring, springDerived } from '../physics/springMass';

// Spring drawn as a zigzag polyline between ceiling and mass centre.
function springPath(x0, y0, x1, y1, coils = 10, amplitude = 0.12) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) return [];
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const segs = coils * 2;
  const pts = [[x0, y0]];
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const cx = x0 + ux * len * t;
    const cy = y0 + uy * len * t;
    const side = (i % 2 === 0) ? -1 : 1;
    pts.push([cx + nx * amplitude * side, cy + ny * amplitude * side]);
  }
  pts.push([x1, y1]);
  return pts;
}

export default function SpringMass2D(rawProps) {
  const {
    springConstant = 50,
    mass = 2,
    initialDisplacement = 0.5,
    damping = 0,
    isPlaying = false,
    onDataPoint,
  } = useSanitizedProps(rawProps);

  const stateRef = useRef(createSpringState(initialDisplacement, 0));
  const [, setTick] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const emitRef = useRef(0);

  useEffect(() => {
    stateRef.current = createSpringState(initialDisplacement, 0);
  }, [initialDisplacement, mass, springConstant, damping]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return undefined;
    }
    lastRef.current = 0;
    const tick = (now) => {
      const dt = lastRef.current ? Math.min(0.05, (now - lastRef.current) / 1000) : 0;
      lastRef.current = now;
      stepSpring(stateRef.current, dt, { mass, springConstant, damping });
      setTick((x) => (x + 1) % 1e9);
      if (onDataPoint && now / 1000 - emitRef.current > 0.05) {
        emitRef.current = now / 1000;
        const d = springDerived(stateRef.current, { mass, springConstant, damping });
        onDataPoint({
          t_s: now / 1000,
          displacement_m: stateRef.current.x,
          velocity_mps: stateRef.current.v,
          acceleration_mps2: (-springConstant * stateRef.current.x - damping * stateRef.current.v) / Math.max(1e-6, mass),
          kineticEnergy_J: d.kineticEnergy,
          potentialEnergy_J: d.potentialEnergy,
          totalEnergy_J: d.totalEnergy,
          period_s: d.period,
          naturalFrequency_radps: d.naturalFrequency,
          dampingRatio: d.dampingRatio,
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, mass, springConstant, damping, onDataPoint]);

  const restLen = 2.2;
  const maxDisp = Math.max(Math.abs(initialDisplacement), 0.5) + 0.5;
  const span = Math.max(3, restLen + maxDisp * 2 + 1);

  const world = useMemo(() => ({
    width: span,
    height: span,
    origin: { x: span / 2, y: span - 0.4 },
    background: '#07111f',
    grid: { step: 0.5 },
  }), [span]);

  const x = stateRef.current.x;
  const massSide = Math.max(0.25, Math.min(0.9, Math.cbrt(Math.max(0.05, mass)) * 0.35));
  const massY = -restLen - x;
  const springPts = springPath(0, 0, 0, massY + massSide / 2, 14, 0.15);

  const bodies = [
    { id: 'ceiling', type: 'rect', x: 0, y: 0.05, w: 2.2, h: 0.1,
      fill: 'rgba(0,245,255,0.12)', stroke: '#00f5ff', strokeWidth: 0.03 },
    { id: 'spring', type: 'polygon', points: springPts,
      fill: 'none', stroke: '#00f5ff', strokeWidth: 0.04 },
    { id: 'mass', type: 'rect', x: 0, y: massY,
      w: massSide, h: massSide,
      fill: 'rgba(255,170,0,0.75)', stroke: '#fff1c1', strokeWidth: 0.04 },
  ];

  const { period, naturalFrequency } = springDerived(stateRef.current, { mass, springConstant, damping });
  const labels = [
    { id: 'info', x: 0, y: 0.4, text: `T = ${period.toFixed(2)} s   ω₀ = ${naturalFrequency.toFixed(2)} rad/s`, color: '#e5f8ff' },
    { id: 'x', x: massSide / 2 + 0.25, y: massY, text: `x = ${x.toFixed(3)} m`, anchor: 'start', color: '#ffaa00' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={bodies} labels={labels} />
    </div>
  );
}
