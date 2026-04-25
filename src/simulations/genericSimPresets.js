/**
 * Built-in generative-spec presets — surfaced in the command palette.
 * Each preset is a complete, runnable spec for GenericSim2D.
 */

export const GENERATIVE_PRESETS = [
  {
    id: 'gen-newtons-cradle',
    label: '5 falling balls (gen)',
    description: 'Five balls drop onto a tilted ramp — pure generative spec.',
    spec: {
      world: { gravity: { x: 0, y: 1.2 }, bounds: { width: 20, height: 12 } },
      entities: [
        ...Array.from({ length: 5 }).map((_, i) => ({
          id: `ball-${i}`, kind: 'ball', x: 3 + i * 0.9, y: 1 + i * 0.3, r: 0.45,
          mass: 1, vx: 1.5, vy: 0,
          color: ['#22d3ee', '#67e8f9', '#a78bfa', '#f472b6', '#facc15'][i],
        })),
        { id: 'ramp', kind: 'static', x: 14, y: 9, w: 8, h: 0.3, angle: -25, color: '#4b5563' },
      ],
    },
  },
  {
    id: 'gen-domino-tower',
    label: 'Domino tower (gen)',
    description: 'A row of stacked boxes hit by a heavy ball.',
    spec: {
      world: { gravity: { x: 0, y: 1.4 }, bounds: { width: 20, height: 12 } },
      entities: [
        { id: 'wrecker', kind: 'ball', x: 1, y: 6, r: 0.7, mass: 8, vx: 8, vy: 0, color: '#f43f5e' },
        ...Array.from({ length: 8 }).map((_, i) => ({
          id: `block-${i}`, kind: 'box', x: 7 + i * 0.8, y: 10.2, w: 0.6, h: 1.6,
          mass: 0.5, color: i % 2 ? '#22d3ee' : '#a78bfa',
        })),
      ],
    },
  },
  {
    id: 'gen-double-pendulum',
    label: 'Double pendulum (gen)',
    description: 'Two pendula coupled by a spring.',
    spec: {
      world: { gravity: { x: 0, y: 1 }, bounds: { width: 20, height: 12 } },
      entities: [
        { id: 'anchor1', kind: 'static', x: 7,  y: 1, w: 0.4, h: 0.4, color: '#1f2937' },
        { id: 'anchor2', kind: 'static', x: 13, y: 1, w: 0.4, h: 0.4, color: '#1f2937' },
        { id: 'bob1', kind: 'ball', x: 7,  y: 5, r: 0.5, mass: 1, color: '#22d3ee' },
        { id: 'bob2', kind: 'ball', x: 13, y: 5, r: 0.5, mass: 1, color: '#a78bfa' },
      ],
      constraints: [
        { from: 'anchor1', to: 'bob1', stiffness: 0.9, length: 4 },
        { from: 'anchor2', to: 'bob2', stiffness: 0.9, length: 4 },
        { from: 'bob1', to: 'bob2', stiffness: 0.02, length: 6 },
      ],
    },
  },
]

export function normalizeSpec(raw) {
  const out = {
    v: 1,
    world: {
      gravity: { x: raw?.world?.gravity?.x ?? 0, y: raw?.world?.gravity?.y ?? 1 },
      bounds: {
        width: raw?.world?.bounds?.width ?? 20,
        height: raw?.world?.bounds?.height ?? 12,
      },
    },
    entities: Array.isArray(raw?.entities) ? raw.entities : [],
    constraints: Array.isArray(raw?.constraints) ? raw.constraints : [],
  }
  const hasFloor = out.entities.some((e) => e.kind === 'static' && (e.h || 0) < 1)
  if (!hasFloor) {
    out.entities.push({
      id: '_floor',
      kind: 'static',
      x: out.world.bounds.width / 2,
      y: out.world.bounds.height - 0.25,
      w: out.world.bounds.width,
      h: 0.5,
      color: '#1f2937',
    })
  }
  return out
}
