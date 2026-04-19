import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Play, Pause, RotateCcw, Trash2, Share2, Copy } from 'lucide-react'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'

// World in metres (y-up). SVG viewBox flips y via transform.
const WORLD_W = 24
const WORLD_H = 14
const GRAVITY = 9.81
const DT = 1 / 60
const RESTITUTION = 0.55
const FRICTION = 0.02

const PALETTE = [
  { kind: 'ball',  label: 'Ball',  icon: '●', hint: 'Falls under gravity' },
  { kind: 'wall',  label: 'Wall',  icon: '▬', hint: 'Solid segment' },
  { kind: 'ramp',  label: 'Ramp',  icon: '◢', hint: 'Inclined segment' },
  { kind: 'pivot', label: 'Pivot', icon: '✕', hint: 'Fixed anchor' },
]

function makeEntity(kind, x, y) {
  const id = `${kind}-${Math.random().toString(36).slice(2, 8)}`
  switch (kind) {
    case 'ball':
      return { id, kind, x, y, r: 0.5, mass: 1, vx0: 0, vy0: 0 }
    case 'wall':
      return { id, kind, x1: x - 2, y1: y, x2: x + 2, y2: y }
    case 'ramp':
      return { id, kind, x1: x - 2, y1: y - 1, x2: x + 2, y2: y + 1 }
    case 'pivot':
      return { id, kind, x, y }
    default:
      return null
  }
}

function cloneScene(entities) {
  return entities.map(e => ({ ...e }))
}

// Point-segment collision resolution for ball vs line segment
function resolveSegment(ball, seg) {
  const dx = seg.x2 - seg.x1
  const dy = seg.y2 - seg.y1
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return
  let t = ((ball.x - seg.x1) * dx + (ball.y - seg.y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = seg.x1 + t * dx
  const cy = seg.y1 + t * dy
  const nx = ball.x - cx
  const ny = ball.y - cy
  const d2 = nx * nx + ny * ny
  if (d2 >= ball.r * ball.r) return
  const d = Math.sqrt(d2) || 1e-6
  const ux = nx / d
  const uy = ny / d
  const overlap = ball.r - d
  ball.x += ux * overlap
  ball.y += uy * overlap
  const vn = ball.vx * ux + ball.vy * uy
  if (vn < 0) {
    ball.vx -= (1 + RESTITUTION) * vn * ux
    ball.vy -= (1 + RESTITUTION) * vn * uy
    // Tangential friction
    ball.vx *= 1 - FRICTION
    ball.vy *= 1 - FRICTION
  }
}

function stepPhysics(state, segments) {
  for (const b of state.balls) {
    b.vy -= GRAVITY * DT
    b.x += b.vx * DT
    b.y += b.vy * DT
    // Floor / walls of world
    if (b.y - b.r < -WORLD_H / 2) {
      b.y = -WORLD_H / 2 + b.r
      if (b.vy < 0) { b.vy = -b.vy * RESTITUTION; b.vx *= 1 - FRICTION }
    }
    if (b.x - b.r < -WORLD_W / 2) { b.x = -WORLD_W / 2 + b.r; if (b.vx < 0) b.vx = -b.vx * RESTITUTION }
    if (b.x + b.r >  WORLD_W / 2) { b.x =  WORLD_W / 2 - b.r; if (b.vx > 0) b.vx = -b.vx * RESTITUTION }
    if (b.y + b.r >  WORLD_H / 2) { b.y =  WORLD_H / 2 - b.r; if (b.vy > 0) b.vy = -b.vy * RESTITUTION }
    for (const s of segments) resolveSegment(b, s)
  }
}

function encodeScene(entities) {
  try { return btoa(encodeURIComponent(JSON.stringify(entities))) } catch { return '' }
}
function decodeScene(hash) {
  try { return JSON.parse(decodeURIComponent(atob(hash))) } catch { return null }
}

// Convert SVG client coords to world coords
function clientToWorld(svgEl, clientX, clientY) {
  const pt = svgEl.createSVGPoint()
  pt.x = clientX; pt.y = clientY
  const ctm = svgEl.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const local = pt.matrixTransform(ctm.inverse())
  return { x: local.x - WORLD_W / 2, y: -(local.y - WORLD_H / 2) }
}

export default function BuilderPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [entities, setEntities] = useState(() => {
    const h = searchParams.get('scene')
    if (h) {
      const decoded = decodeScene(h)
      if (Array.isArray(decoded)) return decoded
    }
    return [
      makeEntity('ball', -6, 4),
      makeEntity('ramp', -2, 0),
      makeEntity('wall', 6, -3),
    ]
  })
  const [selectedId, setSelectedId] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [draggingKind, setDraggingKind] = useState(null)
  const [moving, setMoving] = useState(null) // {id, offsetX, offsetY, endpoint?}
  const svgRef = useRef(null)
  const rafRef = useRef(0)
  const stateRef = useRef({ balls: [] })
  const [, forceRender] = useState(0)

  const segments = useMemo(
    () => entities.filter(e => e.kind === 'wall' || e.kind === 'ramp'),
    [entities]
  )

  // Start/stop physics
  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(rafRef.current); return }
    stateRef.current.balls = entities
      .filter(e => e.kind === 'ball')
      .map(e => ({ id: e.id, x: e.x, y: e.y, r: e.r, vx: e.vx0 || 0, vy: e.vy0 || 0 }))
    const loop = () => {
      stepPhysics(stateRef.current, segments)
      forceRender(n => n + 1)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, segments, entities])

  const handlePaletteDragStart = (kind) => (e) => {
    setDraggingKind(kind)
    e.dataTransfer.setData('text/plain', kind)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleCanvasDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleCanvasDrop = (e) => {
    e.preventDefault()
    const kind = e.dataTransfer.getData('text/plain') || draggingKind
    if (!kind) return
    const { x, y } = clientToWorld(svgRef.current, e.clientX, e.clientY)
    const ent = makeEntity(kind, x, y)
    if (ent) {
      setEntities(prev => [...prev, ent])
      setSelectedId(ent.id)
    }
    setDraggingKind(null)
  }

  const onEntityMouseDown = (entity, endpoint) => (e) => {
    e.stopPropagation()
    setSelectedId(entity.id)
    if (isPlaying) return
    const { x, y } = clientToWorld(svgRef.current, e.clientX, e.clientY)
    setMoving({
      id: entity.id,
      endpoint,
      offsetX: endpoint === '1' ? x - entity.x1 : endpoint === '2' ? x - entity.x2 : x - (entity.x ?? 0),
      offsetY: endpoint === '1' ? y - entity.y1 : endpoint === '2' ? y - entity.y2 : y - (entity.y ?? 0),
    })
  }

  const onCanvasMouseMove = (e) => {
    if (!moving) return
    const { x, y } = clientToWorld(svgRef.current, e.clientX, e.clientY)
    setEntities(prev => prev.map(ent => {
      if (ent.id !== moving.id) return ent
      const nx = x - moving.offsetX
      const ny = y - moving.offsetY
      if (moving.endpoint === '1') return { ...ent, x1: nx, y1: ny }
      if (moving.endpoint === '2') return { ...ent, x2: nx, y2: ny }
      if (ent.kind === 'wall' || ent.kind === 'ramp') {
        const ddx = nx - ent.x1
        const ddy = ny - ent.y1
        const cx = (ent.x1 + ent.x2) / 2
        const cy = (ent.y1 + ent.y2) / 2
        const shiftX = (x - moving.offsetX) - cx
        const shiftY = (y - moving.offsetY) - cy
        return { ...ent, x1: ent.x1 + shiftX, y1: ent.y1 + shiftY, x2: ent.x2 + shiftX, y2: ent.y2 + shiftY }
      }
      return { ...ent, x: nx, y: ny }
    }))
  }

  const onCanvasMouseUp = () => setMoving(null)

  const selected = entities.find(e => e.id === selectedId) || null

  const updateSelected = (patch) => {
    setEntities(prev => prev.map(e => e.id === selectedId ? { ...e, ...patch } : e))
  }

  const deleteSelected = () => {
    if (!selectedId) return
    setEntities(prev => prev.filter(e => e.id !== selectedId))
    setSelectedId(null)
  }

  const reset = () => {
    setIsPlaying(false)
    stateRef.current.balls = []
    forceRender(n => n + 1)
  }

  const clearAll = () => {
    setIsPlaying(false)
    setEntities([])
    setSelectedId(null)
  }

  const share = useCallback(() => {
    const code = encodeScene(entities)
    setSearchParams({ scene: code })
    const url = `${window.location.origin}${window.location.pathname}?scene=${code}`
    navigator.clipboard?.writeText(url).catch(() => {})
  }, [entities, setSearchParams])

  const displayBalls = useMemo(() => {
    if (!isPlaying) return entities.filter(e => e.kind === 'ball')
    const byId = new Map(stateRef.current.balls.map(b => [b.id, b]))
    return entities
      .filter(e => e.kind === 'ball')
      .map(e => {
        const live = byId.get(e.id)
        return live ? { ...e, x: live.x, y: live.y } : e
      })
  }, [entities, isPlaying]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="px-6 py-4 flex gap-4" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      {/* Palette */}
      <Panel className="w-52 shrink-0 p-3">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Palette</h3>
        <div className="flex flex-col gap-2">
          {PALETTE.map(p => (
            <div
              key={p.kind}
              draggable
              onDragStart={handlePaletteDragStart(p.kind)}
              onDragEnd={() => setDraggingKind(null)}
              className="px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing border"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{p.icon}</span>
                <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{p.label}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{p.hint}</div>
            </div>
          ))}
        </div>
        <div className="text-xs mt-4 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Drag items onto the canvas. Click to select, drag to move. Press Play to simulate gravity & collisions.
        </div>
      </Panel>

      {/* Canvas */}
      <Panel className="flex-1 p-3 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Button onClick={() => setIsPlaying(p => !p)} variant="primary">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="ml-1">{isPlaying ? 'Pause' : 'Play'}</span>
          </Button>
          <Button onClick={reset} variant="secondary">
            <RotateCcw className="w-4 h-4" />
            <span className="ml-1">Reset</span>
          </Button>
          <Button onClick={clearAll} variant="secondary">
            <Trash2 className="w-4 h-4" />
            <span className="ml-1">Clear</span>
          </Button>
          <div className="flex-1" />
          <Button onClick={share} variant="secondary">
            <Share2 className="w-4 h-4" />
            <span className="ml-1">Share link</span>
          </Button>
        </div>

        <div
          className="flex-1 rounded-xl overflow-hidden border"
          style={{ borderColor: 'var(--color-border)', background: '#07111f' }}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%', display: 'block' }}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
            onClick={() => setSelectedId(null)}
          >
            <g transform={`translate(${WORLD_W / 2} ${WORLD_H / 2}) scale(1 -1)`}>
              {/* Grid */}
              {Array.from({ length: WORLD_W + 1 }, (_, i) => (
                <line key={`vg${i}`} x1={-WORLD_W / 2 + i} y1={-WORLD_H / 2} x2={-WORLD_W / 2 + i} y2={WORLD_H / 2}
                  stroke="rgba(0,245,255,0.06)" strokeWidth={0.015} />
              ))}
              {Array.from({ length: WORLD_H + 1 }, (_, i) => (
                <line key={`hg${i}`} x1={-WORLD_W / 2} y1={-WORLD_H / 2 + i} x2={WORLD_W / 2} y2={-WORLD_H / 2 + i}
                  stroke="rgba(0,245,255,0.06)" strokeWidth={0.015} />
              ))}
              {/* Segments */}
              {entities.filter(e => e.kind === 'wall' || e.kind === 'ramp').map(e => {
                const isSel = e.id === selectedId
                const color = e.kind === 'ramp' ? '#ffaa00' : '#22d3ee'
                return (
                  <g key={e.id}>
                    <line
                      x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                      stroke={color} strokeWidth={isSel ? 0.22 : 0.16} strokeLinecap="round"
                      style={{ cursor: isPlaying ? 'default' : 'move' }}
                      onMouseDown={onEntityMouseDown(e)}
                      onClick={(ev) => { ev.stopPropagation(); setSelectedId(e.id) }}
                    />
                    {isSel && !isPlaying && (
                      <>
                        <circle cx={e.x1} cy={e.y1} r={0.22} fill="#fff" stroke={color} strokeWidth={0.04}
                          style={{ cursor: 'grab' }} onMouseDown={onEntityMouseDown(e, '1')} />
                        <circle cx={e.x2} cy={e.y2} r={0.22} fill="#fff" stroke={color} strokeWidth={0.04}
                          style={{ cursor: 'grab' }} onMouseDown={onEntityMouseDown(e, '2')} />
                      </>
                    )}
                  </g>
                )
              })}
              {/* Pivots */}
              {entities.filter(e => e.kind === 'pivot').map(e => (
                <g key={e.id} onMouseDown={onEntityMouseDown(e)}
                  onClick={(ev) => { ev.stopPropagation(); setSelectedId(e.id) }}
                  style={{ cursor: isPlaying ? 'default' : 'move' }}>
                  <circle cx={e.x} cy={e.y} r={0.25} fill="none" stroke="#ff5566" strokeWidth={0.06} />
                  <line x1={e.x - 0.25} y1={e.y - 0.25} x2={e.x + 0.25} y2={e.y + 0.25} stroke="#ff5566" strokeWidth={0.06} />
                  <line x1={e.x - 0.25} y1={e.y + 0.25} x2={e.x + 0.25} y2={e.y - 0.25} stroke="#ff5566" strokeWidth={0.06} />
                </g>
              ))}
              {/* Balls */}
              {displayBalls.map(b => {
                const isSel = b.id === selectedId
                return (
                  <g key={b.id}
                    onMouseDown={onEntityMouseDown(b)}
                    onClick={(ev) => { ev.stopPropagation(); setSelectedId(b.id) }}
                    style={{ cursor: isPlaying ? 'default' : 'move' }}>
                    <circle cx={b.x} cy={b.y} r={b.r}
                      fill="rgba(34,211,238,0.35)" stroke={isSel ? '#ffaa00' : '#22d3ee'}
                      strokeWidth={isSel ? 0.08 : 0.05} />
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
      </Panel>

      {/* Properties */}
      <Panel className="w-72 shrink-0 p-3">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Properties</h3>
        {!selected && (
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Select an object to edit its properties. Drag from the palette to add new objects.
          </div>
        )}
        {selected && (
          <div className="flex flex-col gap-3 text-sm" style={{ color: 'var(--color-text)' }}>
            <div className="flex items-center justify-between">
              <span className="font-medium capitalize">{selected.kind}</span>
              <button onClick={deleteSelected} className="text-xs px-2 py-1 rounded"
                style={{ background: 'var(--color-surface)', color: '#ff5566', border: '1px solid var(--color-border)' }}>
                Delete
              </button>
            </div>
            {selected.kind === 'ball' && (
              <>
                <NumRow label="x (m)" value={selected.x} onChange={v => updateSelected({ x: v })} />
                <NumRow label="y (m)" value={selected.y} onChange={v => updateSelected({ y: v })} />
                <NumRow label="radius (m)" value={selected.r} onChange={v => updateSelected({ r: Math.max(0.1, v) })} step={0.1} />
                <NumRow label="mass (kg)" value={selected.mass} onChange={v => updateSelected({ mass: Math.max(0.01, v) })} step={0.1} />
                <NumRow label="v₀ₓ (m/s)" value={selected.vx0 || 0} onChange={v => updateSelected({ vx0: v })} />
                <NumRow label="v₀ᵧ (m/s)" value={selected.vy0 || 0} onChange={v => updateSelected({ vy0: v })} />
              </>
            )}
            {(selected.kind === 'wall' || selected.kind === 'ramp') && (
              <>
                <NumRow label="x₁" value={selected.x1} onChange={v => updateSelected({ x1: v })} />
                <NumRow label="y₁" value={selected.y1} onChange={v => updateSelected({ y1: v })} />
                <NumRow label="x₂" value={selected.x2} onChange={v => updateSelected({ x2: v })} />
                <NumRow label="y₂" value={selected.y2} onChange={v => updateSelected({ y2: v })} />
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  length = {Math.hypot(selected.x2 - selected.x1, selected.y2 - selected.y1).toFixed(2)} m
                </div>
              </>
            )}
            {selected.kind === 'pivot' && (
              <>
                <NumRow label="x (m)" value={selected.x} onChange={v => updateSelected({ x: v })} />
                <NumRow label="y (m)" value={selected.y} onChange={v => updateSelected({ y: v })} />
              </>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Scene</div>
          <div className="text-xs" style={{ color: 'var(--color-text)' }}>
            {entities.filter(e => e.kind === 'ball').length} balls · {segments.length} segments · {entities.filter(e => e.kind === 'pivot').length} pivots
          </div>
          <button onClick={share}
            className="mt-3 w-full text-xs px-3 py-2 rounded flex items-center justify-center gap-2"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
            <Copy className="w-3 h-3" /> Copy shareable link
          </button>
        </div>
      </Panel>
    </div>
  )
}

function NumRow({ label, value, onChange, step = 0.5 }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? Number(value.toFixed(3)) : 0}
        step={step}
        onChange={e => {
          const n = parseFloat(e.target.value)
          if (!Number.isNaN(n)) onChange(n)
        }}
        className="w-24 px-2 py-1 rounded text-sm text-right"
        style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
      />
    </label>
  )
}
