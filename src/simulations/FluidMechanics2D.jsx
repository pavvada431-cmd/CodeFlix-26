import { useMemo } from 'react';
import SvgScene from './shared/SvgScene';
import useSanitizedProps from './shared/useSanitizedProps';

const G = 9.81;

export default function FluidMechanics2D(rawProps) {
  const {
    fluidDensity = 1000,
    objectDensity = 800,
    objectVolume = 0.125,
    objectShape = 'cube',
  } = useSanitizedProps(rawProps);

  const { depthFrac, floats } = useMemo(() => {
    const frac = Math.max(0, Math.min(1, objectDensity / fluidDensity));
    return { depthFrac: frac, floats: objectDensity < fluidDensity };
  }, [fluidDensity, objectDensity]);

  const sideLen = Math.cbrt(objectVolume);
  const displayedSide = Math.max(0.6, Math.min(3, sideLen * 6));
  const mass = objectVolume * objectDensity;
  const weight = mass * G;
  const buoyancy = floats
    ? weight
    : fluidDensity * objectVolume * G;

  const width = 14, height = 10;
  const tankW = 8, tankH = 7;
  const waterLevel = 1;
  const world = { width, height, origin: { x: width / 2, y: height / 2 }, background: '#07111f', grid: { step: 1 } };

  // Object center: if it floats, part submerged by depthFrac
  const objCy = floats
    ? waterLevel + (displayedSide / 2) - displayedSide * depthFrac
    : waterLevel - tankH / 2 + displayedSide / 2 + 0.3;

  const tank = { id: 'tank', type: 'rect', x: 0, y: waterLevel - tankH / 2, w: tankW, h: tankH, fill: 'none', stroke: '#22d3ee', strokeWidth: 0.06 };
  const water = { id: 'water', type: 'rect', x: 0, y: (waterLevel - tankH / 2 + waterLevel) / 2 - 0.5, w: tankW - 0.1, h: tankH - 0.5, fill: 'rgba(34,211,238,0.25)', stroke: 'rgba(34,211,238,0.4)', strokeWidth: 0.03 };
  const waterTop = { id: 'wt', type: 'line', x1: -tankW / 2 + 0.05, y1: waterLevel, x2: tankW / 2 - 0.05, y2: waterLevel, stroke: '#00f5ff', strokeWidth: 0.05 };

  const obj = objectShape === 'sphere'
    ? { id: 'obj', type: 'circle', x: 0, y: objCy, r: displayedSide / 2, fill: '#ffaa00', stroke: '#fff1c1', strokeWidth: 0.05 }
    : { id: 'obj', type: 'rect', x: 0, y: objCy, w: displayedSide, h: displayedSide, fill: '#ffaa00', stroke: '#fff1c1', strokeWidth: 0.05 };

  const bodies = [water, waterTop, tank, obj];

  const arrowScale = 1.2;
  const forces = [
    { id: 'W', x: 0, y: objCy, fx: 0, fy: -Math.min(1.5, weight / 100) * arrowScale, color: '#ff5566' },
    { id: 'Fb', x: 0, y: objCy, fx: 0, fy: Math.min(1.5, buoyancy / 100) * arrowScale, color: '#22d3ee' },
  ];

  const labels = [
    { id: 't', x: 0, y: height / 2 - 0.6, text: floats ? `Floats (${(depthFrac * 100).toFixed(0)}% submerged)` : 'Sinks', color: floats ? '#22d3ee' : '#ff5566', fontSize: 0.4 },
    { id: 'r', x: -width / 2 + 0.3, y: -height / 2 + 1.2, text: `ρ_fluid=${fluidDensity} kg/m³`, color: '#88e6ff', anchor: 'start', fontSize: 0.3 },
    { id: 'r2', x: -width / 2 + 0.3, y: -height / 2 + 0.7, text: `ρ_obj=${objectDensity} kg/m³`, color: '#ffaa00', anchor: 'start', fontSize: 0.3 },
    { id: 'V', x: -width / 2 + 0.3, y: -height / 2 + 0.2, text: `V=${objectVolume} m³  m=${mass.toFixed(2)} kg`, color: '#e5f8ff', anchor: 'start', fontSize: 0.3 },
    { id: 'w', x: width / 2 - 0.3, y: -height / 2 + 0.7, text: `W=${weight.toFixed(1)} N`, color: '#ff8899', anchor: 'end', fontSize: 0.3 },
    { id: 'fb', x: width / 2 - 0.3, y: -height / 2 + 0.2, text: `F_b=${buoyancy.toFixed(1)} N`, color: '#22d3ee', anchor: 'end', fontSize: 0.3 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,245,255,0.14)' }}>
      <SvgScene world={world} bodies={bodies} forces={forces} labels={labels} />
    </div>
  );
}
