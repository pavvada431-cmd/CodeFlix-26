import { useEffect, useMemo, useRef, useState } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';
import {
  solveProjectileKinematics,
  sampleTrajectory,
  buildProjectileGraph,
  PROJECTILE_DEFAULT_GRAVITY,
} from '../physics/projectile';

const BALL_RADIUS_M = 0.25;
const PADDING = 1.2;

export default function ProjectileMotion2D(rawProps) {
  const {
    initialVelocity = 30,
    launchAngle = 45,
    height = 2,
    isPlaying = false,
    onDataPoint,
  } = useSanitizedProps(rawProps);

  const kin = useMemo(
    () => solveProjectileKinematics(initialVelocity, launchAngle, height),
    [initialVelocity, launchAngle, height],
  );
  const predicted = useMemo(
    () => sampleTrajectory(initialVelocity, launchAngle, height, 80),
    [initialVelocity, launchAngle, height],
  );
  const graphData = useMemo(
    () => buildProjectileGraph(initialVelocity, launchAngle, height),
    [initialVelocity, launchAngle, height],
  );

  const world = useMemo(() => {
    const w = Math.max(10, kin.range * 1.1 + PADDING * 2);
    const h = Math.max(6, kin.maxHeight * 1.25 + PADDING);
    return {
      width: w,
      height: h,
      origin: { x: PADDING, y: 0.4 },
      background: '#07111f',
      grid: { step: Math.max(1, Math.round(Math.max(w, h) / 20)) },
    };
  }, [kin.range, kin.maxHeight]);

  const [t, setT] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const lastEmitRef = useRef(0);
  const trailRef = useRef([]);

  useEffect(() => {
    setT(0);
    trailRef.current = [];
    lastEmitRef.current = 0;
  }, [initialVelocity, launchAngle, height]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return undefined;
    }
    startRef.current = 0;
    trailRef.current = [];
    const tick = (now) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = (now - startRef.current) / 1000;
      const bounded = Math.min(elapsed, kin.timeOfFlight);
      setT(bounded);
      if (bounded < kin.timeOfFlight) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, kin.timeOfFlight]);

  const g = PROJECTILE_DEFAULT_GRAVITY;
  const ballX = kin.vx * t;
  const ballY = Math.max(0, height + kin.vy * t - 0.5 * g * t * t);

  // Append to trail (mutating ref is intentional — we only want a re-render via setT)
  const lastPoint = trailRef.current[trailRef.current.length - 1];
  if (!lastPoint || lastPoint[0] !== ballX || lastPoint[1] !== ballY) {
    trailRef.current.push([ballX, ballY]);
    if (trailRef.current.length > 400) trailRef.current.shift();
  }

  useEffect(() => {
    if (!onDataPoint) return;
    if (t - lastEmitRef.current < 0.05 && t !== 0) return;
    lastEmitRef.current = t;
    const idx = Math.min(graphData.length - 1, Math.floor((t / Math.max(kin.timeOfFlight, 1e-6)) * (graphData.length - 1)));
    const sample = graphData[idx];
    if (sample) onDataPoint(sample);
  }, [t, graphData, kin.timeOfFlight, onDataPoint]);

  const bodies = [
    {
      id: 'ground',
      type: 'rect',
      x: world.width / 2 - PADDING, y: -0.2,
      w: world.width, h: 0.4,
      fill: 'rgba(0,245,255,0.08)', stroke: 'rgba(0,245,255,0.2)', strokeWidth: 0.02,
    },
    {
      id: 'platform',
      type: 'rect',
      x: -0.3, y: height / 2,
      w: 0.8, h: height,
      fill: 'rgba(255,170,0,0.22)', stroke: '#ffaa00', strokeWidth: 0.04,
    },
    {
      id: 'ball',
      type: 'circle',
      x: ballX, y: ballY + BALL_RADIUS_M,
      r: BALL_RADIUS_M,
      fill: '#ffaa00', stroke: '#fff1c1', strokeWidth: 0.04,
    },
  ];

  const trails = [
    { id: 'predicted', points: predicted.map((p) => [p.x, p.y + BALL_RADIUS_M]),
      color: 'rgba(0,245,255,0.55)', width: 0.04, opacity: 0.6 },
    { id: 'live', points: trailRef.current.map(([x, y]) => [x, y + BALL_RADIUS_M]),
      color: '#ffaa00', width: 0.07, opacity: 0.95 },
  ];

  const labels = [
    { id: 'range', x: kin.range, y: 0.6, text: `R = ${kin.range.toFixed(2)} m`, color: '#00f5ff' },
    { id: 'apex', x: kin.range / 2, y: kin.maxHeight + 0.6, text: `H = ${kin.maxHeight.toFixed(2)} m`, color: '#ffaa00' },
    { id: 'v0', x: 0.4, y: height + 1.1, text: `v₀ = ${initialVelocity.toFixed(1)} m/s @ ${launchAngle.toFixed(0)}°`, color: '#e5f8ff', anchor: 'start' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={bodies} trails={trails} labels={labels} />
    </div>
  );
}

ProjectileMotion2D.getSceneConfig = function getSceneConfig(variables = {}) {
  const { initialVelocity = 30, launchAngle = 45, height = 2 } = variables;
  const kin = solveProjectileKinematics(initialVelocity, launchAngle, height);
  return {
    name: 'Projectile Motion',
    description: '2D projectile motion',
    physics: {
      gravity: -PROJECTILE_DEFAULT_GRAVITY,
      initialVelocity, launchAngle, initialHeight: height,
      initialVelocityComponents: { vx_mps: kin.vx, vy_mps: kin.vy },
    },
    predictedTrajectory: sampleTrajectory(initialVelocity, launchAngle, height).map(p => ({ x: p.x, y: p.y, z: 0 })),
    graphData: buildProjectileGraph(initialVelocity, launchAngle, height),
    calculations: {
      gravity: 'g = 9.81 m/s²',
      horizontalRangeFormula: `R = v²sin(2θ)/g = ${kin.range.toFixed(2)} m`,
      maximumHeightFormula: `H = h₀ + v²sin²(θ)/(2g) = ${kin.maxHeight.toFixed(2)} m`,
      timeOfFlightFormula: `T = ${kin.timeOfFlight.toFixed(2)} s`,
      maxHeight: kin.maxHeight.toFixed(2),
      range: kin.range.toFixed(2),
      timeOfFlight: kin.timeOfFlight.toFixed(2),
    },
  };
};
