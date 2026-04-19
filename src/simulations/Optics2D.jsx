import { useMemo } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

export default function Optics2D(rawProps) {
  const {
    lensType = 'convex',
    focalLength = 2,
    objectDistance = 4,
    objectHeight = 1,
  } = useSanitizedProps(rawProps);

  const isMirror = lensType === 'mirror' || lensType === 'concave_mirror' || lensType === 'convex_mirror';
  const f = lensType === 'concave' || lensType === 'convex_mirror' ? -Math.abs(focalLength) : Math.abs(focalLength);
  const u = -Math.abs(objectDistance);
  const v = useMemo(() => {
    const inv = 1 / f - 1 / u;
    return Math.abs(inv) < 1e-6 ? 1e6 : 1 / inv;
  }, [f, u]);
  const magnification = v / u;
  const imageHeight = magnification * objectHeight;

  const width = Math.max(16, Math.abs(u) * 2 + Math.abs(v) * 2 + 4);
  const height = Math.max(8, Math.abs(objectHeight) * 4 + 4);
  const world = { width, height, origin: { x: width / 2, y: height / 2 }, background: '#07111f', grid: { step: 1 } };

  const lensHeight = Math.min(height * 0.7, 5);
  const lensShape = lensType === 'convex'
    ? { id: 'lens', type: 'polygon', points: [[0, lensHeight / 2], [0.25, 0], [0, -lensHeight / 2], [-0.25, 0]], fill: 'rgba(0,245,255,0.2)', stroke: '#00f5ff', strokeWidth: 0.04 }
    : { id: 'lens', type: 'polygon', points: [[-0.2, lensHeight / 2], [0.2, lensHeight / 2], [0, 0], [0.2, -lensHeight / 2], [-0.2, -lensHeight / 2], [0, 0]], fill: 'rgba(255,170,0,0.15)', stroke: '#ffaa00', strokeWidth: 0.04 };

  const mirrorShape = {
    id: 'mirror',
    type: 'path',
    d: f > 0 ? `M 0 ${lensHeight / 2} Q -0.6 0 0 ${-lensHeight / 2}` : `M 0 ${lensHeight / 2} Q 0.6 0 0 ${-lensHeight / 2}`,
    fill: 'none', stroke: '#00f5ff', strokeWidth: 0.08,
  };

  const axis = { id: 'axis', type: 'line', x1: -width / 2, y1: 0, x2: width / 2, y2: 0, stroke: 'rgba(255,255,255,0.3)', strokeWidth: 0.02 };

  const obj = { id: 'obj', type: 'line', x1: u, y1: 0, x2: u, y2: objectHeight, stroke: '#ffaa00', strokeWidth: 0.1 };
  const objTip = { id: 'objTip', type: 'polygon', points: [[u, objectHeight], [u - 0.15, objectHeight - 0.3], [u + 0.15, objectHeight - 0.3]], fill: '#ffaa00', stroke: '#ffaa00', strokeWidth: 0.02 };

  const img = Number.isFinite(v) && Math.abs(v) < width * 2 ? {
    id: 'img', type: 'line', x1: v, y1: 0, x2: v, y2: imageHeight,
    stroke: magnification < 0 ? '#22d3ee' : 'rgba(34,211,238,0.5)', strokeWidth: 0.1,
  } : null;

  const bodies = [axis, isMirror ? mirrorShape : lensShape, obj, objTip];
  if (img) bodies.push(img);

  // Principal rays: parallel → through F, through center (lens) or reflects through axis (mirror).
  const ray1 = { id: 'r1', points: [[u, objectHeight], [0, objectHeight], [v, imageHeight]], color: 'rgba(255,170,0,0.7)', width: 0.04 };
  const ray2 = { id: 'r2', points: [[u, objectHeight], [0, 0], [v, imageHeight]], color: 'rgba(0,245,255,0.7)', width: 0.04 };
  const trails = [ray1, ray2];

  const labels = [
    { id: 'f1', x: f, y: -0.4, text: 'F', color: '#ff5566', fontSize: 0.3 },
    { id: 'f2', x: -f, y: -0.4, text: 'F', color: '#ff5566', fontSize: 0.3 },
    { id: 'u', x: u + 0.1, y: -0.4, text: `u=${objectDistance.toFixed(1)}`, color: '#ffaa00', anchor: 'start', fontSize: 0.3 },
    { id: 'v', x: v, y: -0.4, text: Number.isFinite(v) ? `v=${v.toFixed(1)}` : 'v=∞', color: '#22d3ee', fontSize: 0.3 },
    { id: 'm', x: 0, y: height / 2 - 0.5, text: `m=${magnification.toFixed(2)} (${magnification < 0 ? 'inverted real' : 'upright virtual'})`, color: '#e5f8ff', fontSize: 0.32 },
  ];

  const foci = [
    { id: 'fp1', type: 'circle', x: f, y: 0, r: 0.08, fill: '#ff5566', stroke: '#ff5566', strokeWidth: 0.02 },
    { id: 'fp2', type: 'circle', x: -f, y: 0, r: 0.08, fill: '#ff5566', stroke: '#ff5566', strokeWidth: 0.02 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={[...bodies, ...foci]} trails={trails} labels={labels} />
    </div>
  );
}
