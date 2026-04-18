import { useMemo } from 'react';

// Declarative SVG scene for 2D simulations.
// World coordinates use metres with y-up (physics convention). The renderer
// flips y to SVG screen space automatically. viewBox is derived from
// world.width/height so 1 metre = 1 SVG unit unless a scale is provided.
//
// Props:
//   world:  { width, height, origin?: {x,y}, background?, grid? }
//   bodies: [{ id, type: 'circle'|'rect'|'polygon'|'line'|'path', ...geometry }]
//   forces: [{ id, x, y, fx, fy, color?, label? }]
//   trails: [{ id, points: [[x,y], ...], color?, width? }]
//   labels: [{ id, x, y, text, color?, anchor? }]
//   overlay: optional raw SVG children rendered on top without y-flip
//
// Keeping the API small on purpose — sims describe state, renderer draws.

const DEFAULT_BG = '#07111f';

function Grid({ width, height, step = 1, color = 'rgba(0,245,255,0.07)' }) {
  const verticals = [];
  const horizontals = [];
  for (let x = 0; x <= width; x += step) verticals.push(x);
  for (let y = 0; y <= height; y += step) horizontals.push(y);
  return (
    <g opacity={0.9} pointerEvents="none">
      {verticals.map((x) => (
        <line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke={color} strokeWidth={0.015} />
      ))}
      {horizontals.map((y) => (
        <line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke={color} strokeWidth={0.015} />
      ))}
    </g>
  );
}

function Body({ body }) {
  const stroke = body.stroke ?? '#00f5ff';
  const fill = body.fill ?? 'rgba(0,245,255,0.18)';
  const strokeWidth = body.strokeWidth ?? 0.03;
  switch (body.type) {
    case 'circle':
      return (
        <circle cx={body.x} cy={body.y} r={Math.max(0, body.r || 0)}
          stroke={stroke} fill={fill} strokeWidth={strokeWidth} />
      );
    case 'rect': {
      const w = Math.max(0, body.w || 0);
      const h = Math.max(0, body.h || 0);
      const angle = (body.angle || 0) * (180 / Math.PI);
      return (
        <g transform={`translate(${body.x} ${body.y}) rotate(${-angle})`}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h}
            stroke={stroke} fill={fill} strokeWidth={strokeWidth} />
        </g>
      );
    }
    case 'line':
      return (
        <line x1={body.x1} y1={body.y1} x2={body.x2} y2={body.y2}
          stroke={stroke} strokeWidth={strokeWidth} />
      );
    case 'polygon':
      return (
        <polygon points={(body.points || []).map(([x, y]) => `${x},${y}`).join(' ')}
          stroke={stroke} fill={fill} strokeWidth={strokeWidth} />
      );
    case 'path':
      return <path d={body.d} stroke={stroke} fill={fill || 'none'} strokeWidth={strokeWidth} />;
    default:
      return null;
  }
}

function Trail({ trail }) {
  const pts = trail.points || [];
  if (pts.length < 2) return null;
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  return (
    <path d={d} stroke={trail.color || '#ffaa00'} strokeWidth={trail.width ?? 0.04}
      fill="none" opacity={trail.opacity ?? 0.85} />
  );
}

function ForceArrow({ force }) {
  const { x, y, fx = 0, fy = 0, color = '#ff6b6b', scale = 1 } = force;
  const ex = x + fx * scale;
  const ey = y + fy * scale;
  const len = Math.hypot(fx * scale, fy * scale);
  if (len < 1e-4) return null;
  const ux = (ex - x) / len;
  const uy = (ey - y) / len;
  const head = Math.min(0.25, len * 0.3);
  const leftX = ex - ux * head + -uy * head * 0.5;
  const leftY = ey - uy * head + ux * head * 0.5;
  const rightX = ex - ux * head + uy * head * 0.5;
  const rightY = ey - uy * head + -ux * head * 0.5;
  return (
    <g>
      <line x1={x} y1={y} x2={ex} y2={ey} stroke={color} strokeWidth={0.04} />
      <polygon points={`${ex},${ey} ${leftX},${leftY} ${rightX},${rightY}`} fill={color} />
    </g>
  );
}

function Label({ label, flipY }) {
  // Labels are typeset in screen orientation; counteract the y-flip via scale(1,-1)
  // so text is not upside-down when the scene transform flips world coordinates.
  const color = label.color || '#e5f8ff';
  const fontSize = label.fontSize ?? 0.35;
  const anchor = label.anchor || 'middle';
  return (
    <g transform={`translate(${label.x} ${label.y}) scale(1, ${flipY ? -1 : 1})`}>
      <text fontSize={fontSize} fill={color} textAnchor={anchor}
        fontFamily="system-ui, sans-serif" style={{ fontWeight: 600, letterSpacing: 0.02 }}>
        {label.text}
      </text>
    </g>
  );
}

export default function SvgScene({
  world,
  bodies = [],
  forces = [],
  trails = [],
  labels = [],
  overlay = null,
  className,
  style,
}) {
  const width = Math.max(1, world?.width ?? 20);
  const height = Math.max(1, world?.height ?? 10);
  const originX = world?.origin?.x ?? 0;
  const originY = world?.origin?.y ?? 0;
  const background = world?.background ?? DEFAULT_BG;
  const gridStep = world?.grid?.step ?? 0;
  const gridColor = world?.grid?.color;

  // viewBox: we render in a [-originX..width-originX] x [-originY..height-originY]
  // world frame; flip y via preserveAspectRatio + transform.
  const viewBox = useMemo(
    () => `${-originX} ${-(height - originY)} ${width} ${height}`,
    [width, height, originX, originY],
  );

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ width: '100%', height: '100%', background, display: 'block', ...style }}
    >
      <g transform={`scale(1 -1)`}>
        {gridStep > 0 && (
          <g transform={`translate(${-originX} ${-originY})`}>
            <Grid width={width} height={height} step={gridStep} color={gridColor} />
          </g>
        )}
        {trails.map((t) => <Trail key={t.id ?? JSON.stringify(t.points?.[0] ?? 't')} trail={t} />)}
        {bodies.map((b) => <Body key={b.id} body={b} />)}
        {forces.map((f) => <ForceArrow key={f.id ?? `${f.x}-${f.y}`} force={f} />)}
        {labels.map((l) => <Label key={l.id ?? l.text} label={l} flipY />)}
        {overlay}
      </g>
    </svg>
  );
}
