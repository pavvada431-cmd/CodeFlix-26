import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';
import { collide1D } from '../physics/collisions';

const TRACK_HALF = 8;

export default function Collisions2D(rawProps) {
  const {
    mass1 = 1,
    mass2 = 1,
    velocity1 = 5,
    velocity2 = -5,
    collisionType = 'elastic',
    isPlaying = false,
    onDataPoint,
  } = useSanitizedProps(rawProps);

  const restitution = collisionType === 'inelastic' ? 0 : collisionType === 'perfectly_inelastic' ? 0 : 1;

  const world = useMemo(() => ({
    width: TRACK_HALF * 2 + 2,
    height: 5,
    origin: { x: TRACK_HALF + 1, y: 1 },
    background: '#07111f',
    grid: { step: 1 },
  }), []);

  const s1 = useRef(-3);
  const s2 = useRef(3);
  const v1 = useRef(velocity1);
  const v2 = useRef(velocity2);
  const [, setTick] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const collidedRef = useRef(false);
  const emitRef = useRef(0);

  const size1 = Math.max(0.35, Math.min(1.3, Math.cbrt(mass1) * 0.5));
  const size2 = Math.max(0.35, Math.min(1.3, Math.cbrt(mass2) * 0.5));

  useEffect(() => {
    s1.current = -3; s2.current = 3;
    v1.current = velocity1; v2.current = velocity2;
    collidedRef.current = false;
  }, [mass1, mass2, velocity1, velocity2, collisionType]);

  useEffect(() => {
    if (!isPlaying) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return undefined; }
    lastRef.current = 0;
    const tick = (now) => {
      const dt = lastRef.current ? Math.min(0.05, (now - lastRef.current) / 1000) : 0;
      lastRef.current = now;
      s1.current += v1.current * dt;
      s2.current += v2.current * dt;
      const gap = (s2.current - size2 / 2) - (s1.current + size1 / 2);
      if (!collidedRef.current && gap <= 0) {
        const { v1: newV1, v2: newV2, kineticEnergyBefore, kineticEnergyAfter, momentumBefore, momentumAfter, energyLost } =
          collide1D({ mass1, mass2, u1: v1.current, u2: v2.current, restitution });
        v1.current = newV1; v2.current = newV2;
        collidedRef.current = true;
        if (onDataPoint) {
          onDataPoint({
            t_s: now / 1000,
            velocity1_mps: newV1, velocity2_mps: newV2,
            velocity: newV1,
            kineticEnergyBefore_J: kineticEnergyBefore,
            kineticEnergyAfter_J: kineticEnergyAfter,
            energyLost_J: energyLost,
            momentumBefore_kgmps: momentumBefore,
            momentumAfter_kgmps: momentumAfter,
            type: collisionType,
          });
        }
      }
      // bounds
      if (s1.current - size1 / 2 < -TRACK_HALF) { s1.current = -TRACK_HALF + size1 / 2; v1.current = Math.abs(v1.current); }
      if (s2.current + size2 / 2 > TRACK_HALF) { s2.current = TRACK_HALF - size2 / 2; v2.current = -Math.abs(v2.current); }
      setTick((x) => (x + 1) % 1e9);
      const nowSec = now / 1000;
      if (onDataPoint && nowSec - emitRef.current > 0.1 && !collidedRef.current) {
        emitRef.current = nowSec;
        onDataPoint({
          t_s: nowSec,
          velocity1_mps: v1.current, velocity2_mps: v2.current,
          velocity: v1.current,
          position1_m: s1.current, position2_m: s2.current,
          momentum_kgmps: mass1 * v1.current + mass2 * v2.current,
          type: collisionType,
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, mass1, mass2, restitution, collisionType, size1, size2, onDataPoint]);

  const bodies = [
    { id: 'track', type: 'rect', x: 0, y: -0.05, w: TRACK_HALF * 2, h: 0.1,
      fill: 'rgba(0,245,255,0.14)', stroke: '#00f5ff', strokeWidth: 0.03 },
    { id: 'wallL', type: 'rect', x: -TRACK_HALF, y: 0.5, w: 0.1, h: 1.2,
      fill: 'rgba(0,245,255,0.3)', stroke: '#00f5ff', strokeWidth: 0.03 },
    { id: 'wallR', type: 'rect', x: TRACK_HALF, y: 0.5, w: 0.1, h: 1.2,
      fill: 'rgba(0,245,255,0.3)', stroke: '#00f5ff', strokeWidth: 0.03 },
    { id: 'm1', type: 'rect', x: s1.current, y: size1 / 2, w: size1, h: size1,
      fill: 'rgba(255,170,0,0.82)', stroke: '#fff1c1', strokeWidth: 0.03 },
    { id: 'm2', type: 'rect', x: s2.current, y: size2 / 2, w: size2, h: size2,
      fill: 'rgba(0,245,255,0.82)', stroke: '#e5f8ff', strokeWidth: 0.03 },
  ];

  const labels = [
    { id: 'm1l', x: s1.current, y: size1 + 0.3, text: `${mass1.toFixed(1)} kg`, color: '#ffaa00' },
    { id: 'm2l', x: s2.current, y: size2 + 0.3, text: `${mass2.toFixed(1)} kg`, color: '#00f5ff' },
    { id: 'v1', x: s1.current, y: -0.6, text: `v₁ = ${v1.current.toFixed(2)} m/s`, color: '#ffaa00' },
    { id: 'v2', x: s2.current, y: -0.6, text: `v₂ = ${v2.current.toFixed(2)} m/s`, color: '#00f5ff' },
    { id: 'type', x: 0, y: 2.2, text: `${collisionType}`.replace(/_/g, ' '), color: '#e5f8ff' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={bodies} labels={labels} />
    </div>
  );
}
