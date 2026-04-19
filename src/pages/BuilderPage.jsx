import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Play, Pause, RotateCcw, Trash2, Share2, Copy, Undo2, Redo2, Zap } from 'lucide-react'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'

// World in metres (y-up). SVG viewBox flips y via transform.
const WORLD_W = 24
const WORLD_H = 14
const FIXED_DT = 1 / 120
const MAX_STEPS_PER_FRAME = 8
const DEFAULTS = { gravity: 9.81, restitution: 0.55, friction: 0.02 }
const HISTORY_LIMIT = 100
const TRAIL_LEN = 48
const SNAP = 0.5

const PALETTE = [
  { kind: 'ball',  label: 'Ball',  icon: '●', hint: 'Falls under gravity' },
  { kind: 'wall',  label: 'Wall',  icon: '▬', hint: 'Solid segment' },
  { kind: 'ramp',  label: 'Ramp',  icon: '◢', hint: 'Inclined segment' },
  { kind: 'pivot', label: 'Pivot', icon: '✕', hint: 'Fixed anchor (visual)' },
]

const uid = (kind) => `${kind}-${Math.random().toString(36).slice(2, 8)}`

function makeEntity(kind, x, y) {
  const id = uid(kind)
  switch (kind) {
    case 'ball':
      return { id, kind, x, y, r: 0.5, mass: 1, vx0: 0, vy0: 0, pinned: false }
    case 'wall':
      return { id, kind, x1: x - 2, y1: y, x2: x + 2, y2: y, restitution: null, friction: null }
    case 'ramp':
      return { id, kind, x1: x - 2, y1: y - 1, x2: x + 2, y2: y + 1, restitution: null, friction: null }
    case 'pivot':
      return { id, kind, x, y }
    default:
      return null
  }
}

function cloneEntity(e) {
  const c = { ...e, id: uid(e.kind) }
  if (c.x !== undefined) { c.x += 1; c.y += 1 }
  if (c.x1 !== undefined) { c.x1 += 1; c.y1 += 1; c.x2 += 1; c.y2 += 1 }
  return c
}

function snapVal(v, snap) { return snap ? Math.round(v / SNAP) * SNAP : v }

// ---------- Physics ----------
function resolveSegment(ball, seg, rest, fric) {
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
  ball.x += ux * (ball.r - d)
  ball.y += uy * (ball.r - d)
  const vn = ball.vx * ux + ball.vy * uy
  if (vn < 0) {
    ball.vx -= (1 + rest) * vn * ux
    ball.vy -= (1 + rest) * vn * uy
    ball.vx *= 1 - fric
    ball.vy *= 1 - fric
  }
}

function resolveBallPair(a, b, rest, fric) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d2 = dx * dx + dy * dy
  const rsum = a.r + b.r
  if (d2 === 0 || d2 >= rsum * rsum) return
  const d = Math.sqrt(d2)
  const nx = dx / d
  const ny = dy / d
  const overlap = rsum - d
  const wa = a.pinned ? 0 : 1 / a.mass
  const wb = b.pinned ? 0 : 1 / b.mass
  const wsum = wa + wb
  if (wsum === 0) return
  a.x -= nx * overlap * (wa / wsum)
  a.y -= ny * overlap * (wa / wsum)
  b.x += nx * overlap * (wb / wsum)
  b.y += ny * overlap * (wb / wsum)
  const rvx = b.vx - a.vx
  const rvy = b.vy - a.vy
  const vn = rvx * nx + rvy * ny
  if (vn >= 0) return
  const j = -(1 + rest) * vn / wsum
  const ix = j * nx
  const iy = j * ny
  a.vx -= ix * wa; a.vy -= iy * wa
  b.vx += ix * wb; b.vy += iy * wb
  const f = 1 - fric
  if (!a.pinned) { a.vx *= f; a.vy *= f }
  if (!b.pinned) { b.vx *= f; b.vy *= f }
}

function step(state, segments, opts) {
  const { gravity, restitution, friction } = opts
  for (const b of state.balls) {
    if (b.pinned) { b.vx = 0; b.vy = 0; continue }
    b.vy -= gravity * FIXED_DT
    b.x += b.vx * FIXED_DT
    b.y += b.vy * FIXED_DT
    if (b.y - b.r < -WORLD_H / 2) { b.y = -WORLD_H / 2 + b.r; if (b.vy < 0) { b.vy = -b.vy * restitution; b.vx *= 1 - friction } }
    if (b.x - b.r < -WORLD_W / 2) { b.x = -WORLD_W / 2 + b.r; if (b.vx < 0) b.vx = -b.vx * restitution }
    if (b.x + b.r >  WORLD_W / 2) { b.x =  WORLD_W / 2 - b.r; if (b.vx > 0) b.vx = -b.vx * restitution }
    if (b.y + b.r >  WORLD_H / 2) { b.y =  WORLD_H / 2 - b.r; if (b.vy > 0) b.vy = -b.vy * restitution }
    for (const s of segments) {
      const sr = s.restitution ?? restitution
      const sf = s.friction ?? friction
      resolveSegment(b, s, sr, sf)
    }
  }
  const balls = state.balls
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      resolveBallPair(balls[i], balls[j], restitution, friction)
    }
  }
}

// ---------- Share encoding ----------
function encodeScene(entities, world) {
  try { return btoa(encodeURIComponent(JSON.stringify({ v: 2, entities, world }))) } catch { return '' }
}
function decodeScene(hash) {
  try {
    const raw = JSON.parse(decodeURIComponent(atob(hash)))
    if (Array.isArray(raw)) return { entities: raw, world: null }
    if (raw && Array.isArray(raw.entities)) return { entities: raw.entities, world: raw.world || null }
    return null
  } catch { return null }
}

function clientToWorld(svgEl, clientX, clientY) {
  const pt = svgEl.createSVGPoint()
  pt.x = clientX; pt.y = clientY
  const ctm = svgEl.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const local = pt.matrixTransform(ctm.inverse())
  return { x: local.x - WORLD_W / 2, y: -(local.y - WORLD_H / 2) }
}

// ---------- Component ----------
export default function BuilderPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const initial = useMemo(() => {
    const h = searchParams.get('scene')
    if (h) {
      const d = decodeScene(h)
      if (d) return d
    }
    return {
      entities: [
        makeEntity('ball', -6, 4),
        makeEntity('ramp', -2, 0),
        makeEntity('wall', 6, -3),
      ],
      world: null,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [entities, setEntities] = useState(initial.entities)
  const [world, setWorld] = useState({ ...DEFAULTS, trails: true, ...(initial.world || {}) })
  const [selectedId, setSelectedId] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [draggingKind, setDraggingKind] = useState(null)
  const [moving, setMoving] = useState(null)
  const [hudTick, setHudTick] = useState(0)
  const svgRef = useRef(null)
  const rafRef = useRef(0)
  const stateRef = useRef({ balls: [], trails: new Map(), accumulator: 0, lastT: 0 })
  const [, forceRender] = useState(0)

  // history
  const historyRef = useRef({ past: [], future: [] })
  const [historyVersion, setHistoryVersion] = useState(0)
  const bumpHistory = useCallback(() => setHistoryVersion(v => v + 1), [])
  const movingStartRef = useRef(null)

  const segments = useMemo(
    () => entities.filter(e => e.kind === 'wall' || e.kind === 'ramp'),
    [entities]
  )

  const entitiesRef = useRef(entities)
  const segmentsRef = useRef(segments)
  const worldRef = useRef(world)
  useEffect(() => { entitiesRef.current = entities }, [entities])
  useEffect(() => { segmentsRef.current = segments }, [segments])
  useEffect(() => { worldRef.current = world }, [world])

  const pushHistory = useCallback((next) => {
    const h = historyRef.current
    h.past.push(entitiesRef.current)
    if (h.past.length > HISTORY_LIMIT) h.past.shift()
    h.future = []
    setEntities(next)
    bumpHistory()
  }, [bumpHistory])

  const undo = useCallback(() => {
    const h = historyRef.current
    if (!h.past.length) return
    const prev = h.past.pop()
    h.future.push(entitiesRef.current)
    setEntities(prev)
    bumpHistory()
  }, [bumpHistory])

  const redo = useCallback(() => {
    const h = historyRef.current
    if (!h.future.length) return
    const next = h.future.pop()
    h.past.push(entitiesRef.current)
    setEntities(next)
    bumpHistory()
  }, [bumpHistory])

  // Fixed-timestep physics loop
  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(rafRef.current); return }
    const existingById = new Map(stateRef.current.balls.map(b => [b.id, b]))
    stateRef.current.balls = entitiesRef.current
      .filter(e => e.kind === 'ball')
      .map(e => {
        const prev = existingById.get(e.id)
        return prev ?? { id: e.id, x: e.x, y: e.y, r: e.r, mass: e.mass, pinned: !!e.pinned, vx: e.vx0 || 0, vy: e.vy0 || 0 }
      })
    stateRef.current.trails = new Map()
    stateRef.current.accumulator = 0
    stateRef.current.lastT = performance.now()

    const loop = (t) => {
      const s = stateRef.current
      const dt = Math.min(0.1, (t - s.lastT) / 1000)
      s.lastT = t
      s.accumulator += dt

      // Sync ball list (additions / deletions / radius / mass / pinned)
      const latestById = new Map(
        entitiesRef.current.filter(e => e.kind === 'ball').map(e => [e.id, e])
      )
      s.balls = s.balls
        .filter(b => latestById.has(b.id))
        .map(b => {
          const e = latestById.get(b.id)
          return { ...b, r: e.r, mass: e.mass, pinned: !!e.pinned }
        })
      for (const e of entitiesRef.current) {
        if (e.kind !== 'ball') continue
        if (!s.balls.find(b => b.id === e.id)) {
          s.balls.push({ id: e.id, x: e.x, y: e.y, r: e.r, mass: e.mass, pinned: !!e.pinned, vx: e.vx0 || 0, vy: e.vy0 || 0 })
        }
      }

      let steps = 0
      while (s.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        step(s, segmentsRef.current, worldRef.current)
        s.accumulator -= FIXED_DT
        steps++
      }
      if (steps === MAX_STEPS_PER_FRAME) s.accumulator = 0 // drop lag

      if (worldRef.current.trails) {
        for (const b of s.balls) {
          let arr = s.trails.get(b.id)
          if (!arr) { arr = []; s.trails.set(b.id, arr) }
          arr.push([b.x, b.y])
          if (arr.length > TRAIL_LEN) arr.shift()
        }
      }

      forceRender(n => n + 1)
      setHudTick(n => n + 1)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying])

  // ---------- Keyboard shortcuts ----------
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      const meta = e.ctrlKey || e.metaKey
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo(); else undo()
        return
      }
      if (meta && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return }
      if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setSelectedId(prevId => {
          const src = entitiesRef.current.find(x => x.id === prevId)
          if (!src) return prevId
          const copy = cloneEntity(src)
          pushHistory([...entitiesRef.current, copy])
          return copy.id
        })
        return
      }
      if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); return }
      if (e.key === 'Escape') { setSelectedId(null); return }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        setSelectedId(prevId => {
          if (!prevId) return prevId
          pushHistory(entitiesRef.current.filter(x => x.id !== prevId))
          return null
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, pushHistory])

  // ---------- Interaction ----------
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
    const sx = e.shiftKey ? snapVal(x, true) : x
    const sy = e.shiftKey ? snapVal(y, true) : y
    const ent = makeEntity(kind, sx, sy)
    if (ent) {
      pushHistory([...entitiesRef.current, ent])
      setSelectedId(ent.id)
    }
    setDraggingKind(null)
  }

  const onEntityMouseDown = (entity, endpoint) => (e) => {
    e.stopPropagation()
    setSelectedId(entity.id)
    if (isPlaying) return
    const { x, y } = clientToWorld(svgRef.current, e.clientX, e.clientY)
    movingStartRef.current = entitiesRef.current
    if (endpoint === '1') {
      setMoving({ id: entity.id, endpoint, offsetX: x - entity.x1, offsetY: y - entity.y1 })
    } else if (endpoint === '2') {
      setMoving({ id: entity.id, endpoint, offsetX: x - entity.x2, offsetY: y - entity.y2 })
    } else if (entity.kind === 'wall' || entity.kind === 'ramp') {
      const cx = (entity.x1 + entity.x2) / 2
      const cy = (entity.y1 + entity.y2) / 2
      setMoving({ id: entity.id, endpoint: null, offsetX: x - cx, offsetY: y - cy })
    } else {
      setMoving({ id: entity.id, endpoint: null, offsetX: x - (entity.x ?? 0), offsetY: y - (entity.y ?? 0) })
    }
  }

  const onCanvasMouseMove = (e) => {
    if (!moving) return
    const { x, y } = clientToWorld(svgRef.current, e.clientX, e.clientY)
    const snap = e.shiftKey
    setEntities(prev => prev.map(ent => {
      if (ent.id !== moving.id) return ent
      const nxRaw = x - moving.offsetX
      const nyRaw = y - moving.offsetY
      const nx = snap ? snapVal(nxRaw, true) : nxRaw
      const ny = snap ? snapVal(nyRaw, true) : nyRaw
      if (moving.endpoint === '1') return { ...ent, x1: nx, y1: ny }
      if (moving.endpoint === '2') return { ...ent, x2: nx, y2: ny }
      if (ent.kind === 'wall' || ent.kind === 'ramp') {
        const cx = (ent.x1 + ent.x2) / 2
        const cy = (ent.y1 + ent.y2) / 2
        const dx = nx - cx
        const dy = ny - cy
        return { ...ent, x1: ent.x1 + dx, y1: ent.y1 + dy, x2: ent.x2 + dx, y2: ent.y2 + dy }
      }
      return { ...ent, x: nx, y: ny }
    }))
  }

  const onCanvasMouseUp = () => {
    if (moving && movingStartRef.current) {
      // commit one history entry for the whole drag
      const start = movingStartRef.current
      const end = entitiesRef.current
      if (start !== end) {
        historyRef.current.past.push(start)
        if (historyRef.current.past.length > HISTORY_LIMIT) historyRef.current.past.shift()
        historyRef.current.future = []
        bumpHistory()
      }
    }
    movingStartRef.current = null
    setMoving(null)
  }

  const selected = entities.find(e => e.id === selectedId) || null

  const updateSelected = (patch) => {
    const next = entitiesRef.current.map(e => e.id === selectedId ? { ...e, ...patch } : e)
    pushHistory(next)
  }

  const deleteSelected = () => {
    if (!selectedId) return
    pushHistory(entitiesRef.current.filter(e => e.id !== selectedId))
    setSelectedId(null)
  }

  const duplicateSelected = () => {
    if (!selected) return
    const copy = cloneEntity(selected)
    pushHistory([...entitiesRef.current, copy])
    setSelectedId(copy.id)
  }

  const reset = () => {
    setIsPlaying(false)
    stateRef.current.balls = []
    stateRef.current.trails = new Map()
    forceRender(n => n + 1)
  }

  const clearAll = () => {
    setIsPlaying(false)
    pushHistory([])
    setSelectedId(null)
  }

  const share = useCallback(() => {
    const code = encodeScene(entitiesRef.current, worldRef.current)
    setSearchParams({ scene: code })
    const url = `${window.location.origin}${window.location.pathname}?scene=${code}`
    navigator.clipboard?.writeText(url).catch(() => {})
  }, [setSearchParams])

  const displayBalls = useMemo(() => {
    if (!isPlaying) return entities.filter(e => e.kind === 'ball')
    const byId = new Map(stateRef.current.balls.map(b => [b.id, b]))
    return entities
      .filter(e => e.kind === 'ball')
      .map(e => {
        const live = byId.get(e.id)
        return live ? { ...e, x: live.x, y: live.y } : e
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, isPlaying, hudTick])

  // Energy telemetry
  const hud = useMemo(() => {
    const balls = isPlaying
      ? stateRef.current.balls
      : entities.filter(e => e.kind === 'ball').map(e => ({ mass: e.mass, vx: e.vx0 || 0, vy: e.vy0 || 0, y: e.y }))
    let ke = 0, pe = 0, speedMax = 0
    for (const b of balls) {
      const m = b.mass || 1
      const v2 = b.vx * b.vx + b.vy * b.vy
      ke += 0.5 * m * v2
      pe += m * world.gravity * (b.y + WORLD_H / 2)
      const s = Math.sqrt(v2)
      if (s > speedMax) speedMax = s
    }
    return { ke, pe, total: ke + pe, speedMax, n: balls.length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hudTick, isPlaying, entities, world.gravity])

  const ballCount = entities.filter(e => e.kind === 'ball').length
  const pivotCount = entities.filter(e => e.kind === 'pivot').length

  return (
    <div className="px-6 py-4" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <PageHeader
        eyebrow="Simulator · Builder"
        title="Build your"
        accent="Scene"
        subtitle="Drag primitives onto the canvas, edit properties, press Play to simulate. Hold Shift to snap to the grid. Space to play/pause, Del to delete, Ctrl+Z to undo, Ctrl+D to duplicate."
        stats={[
          { value: ballCount, label: 'balls' },
          { value: segments.length, label: 'segments' },
          { value: pivotCount, label: 'pivots' },
        ]}
      />
      <div className="flex gap-4">
        {/* Palette + world controls */}
        <Panel className="w-56 shrink-0 p-3">
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

          <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>World</div>
            <Slider label="Gravity" value={world.gravity} min={0} max={30} step={0.1}
              onChange={v => setWorld(w => ({ ...w, gravity: v }))} suffix="m/s²" />
            <Slider label="Restitution" value={world.restitution} min={0} max={1} step={0.01}
              onChange={v => setWorld(w => ({ ...w, restitution: v }))} />
            <Slider label="Friction" value={world.friction} min={0} max={0.3} step={0.005}
              onChange={v => setWorld(w => ({ ...w, friction: v }))} />
            <label className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--color-text)' }}>
              <input type="checkbox" checked={world.trails} onChange={e => setWorld(w => ({ ...w, trails: e.target.checked }))} />
              Show trails
            </label>
          </div>
        </Panel>

        {/* Canvas */}
        <Panel className="flex-1 p-3 flex flex-col">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Button onClick={() => setIsPlaying(p => !p)} variant="primary">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="ml-1">{isPlaying ? 'Pause' : 'Play'}</span>
            </Button>
            <Button onClick={reset} variant="secondary">
              <RotateCcw className="w-4 h-4" /><span className="ml-1">Reset</span>
            </Button>
            <Button onClick={undo} variant="secondary" disabled={historyVersion >= 0 && !historyRef.current.past.length}>
              <Undo2 className="w-4 h-4" /><span className="ml-1">Undo</span>
            </Button>
            <Button onClick={redo} variant="secondary" disabled={historyVersion >= 0 && !historyRef.current.future.length}>
              <Redo2 className="w-4 h-4" /><span className="ml-1">Redo</span>
            </Button>
            <Button onClick={duplicateSelected} variant="secondary" disabled={!selected}>
              <Copy className="w-4 h-4" /><span className="ml-1">Duplicate</span>
            </Button>
            <Button onClick={clearAll} variant="secondary">
              <Trash2 className="w-4 h-4" /><span className="ml-1">Clear</span>
            </Button>
            <div className="flex-1" />
            <Button onClick={share} variant="secondary">
              <Share2 className="w-4 h-4" /><span className="ml-1">Share link</span>
            </Button>
          </div>

          <div
            className="flex-1 rounded-xl overflow-hidden border relative"
            style={{ borderColor: 'var(--color-border)', background: '#07111f', minHeight: 420 }}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
          >
            {/* HUD */}
            <div className="absolute top-2 left-2 z-10 rounded-lg px-3 py-2 text-xs flex items-center gap-3"
              style={{ background: 'rgba(7,17,31,0.7)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>KE <b>{hud.ke.toFixed(1)}</b> J</span>
              <span>PE <b>{hud.pe.toFixed(1)}</b> J</span>
              <span>E <b>{hud.total.toFixed(1)}</b> J</span>
              <span>v<sub>max</sub> <b>{hud.speedMax.toFixed(2)}</b> m/s</span>
            </div>

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
                {Array.from({ length: WORLD_W + 1 }, (_, i) => (
                  <line key={`vg${i}`} x1={-WORLD_W / 2 + i} y1={-WORLD_H / 2} x2={-WORLD_W / 2 + i} y2={WORLD_H / 2}
                    stroke="rgba(0,245,255,0.06)" strokeWidth={0.015} />
                ))}
                {Array.from({ length: WORLD_H + 1 }, (_, i) => (
                  <line key={`hg${i}`} x1={-WORLD_W / 2} y1={-WORLD_H / 2 + i} x2={WORLD_W / 2} y2={-WORLD_H / 2 + i}
                    stroke="rgba(0,245,255,0.06)" strokeWidth={0.015} />
                ))}

                {/* Trails */}
                {world.trails && isPlaying && Array.from(stateRef.current.trails.entries()).map(([id, pts]) => {
                  if (pts.length < 2) return null
                  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')
                  return <path key={`tr-${id}`} d={d} fill="none" stroke="rgba(34,211,238,0.35)" strokeWidth={0.04} />
                })}

                {/* Segments */}
                {segments.map(e => {
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
                  const stroke = b.pinned ? '#c084fc' : (isSel ? '#ffaa00' : '#22d3ee')
                  return (
                    <g key={b.id}
                      onMouseDown={onEntityMouseDown(b)}
                      onClick={(ev) => { ev.stopPropagation(); setSelectedId(b.id) }}
                      style={{ cursor: isPlaying ? 'default' : 'move' }}>
                      <circle cx={b.x} cy={b.y} r={b.r}
                        fill={b.pinned ? 'rgba(192,132,252,0.3)' : 'rgba(34,211,238,0.35)'}
                        stroke={stroke}
                        strokeWidth={isSel ? 0.08 : 0.05} />
                      {b.pinned && (
                        <circle cx={b.x} cy={b.y} r={0.08} fill={stroke} />
                      )}
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
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={!!selected.pinned} onChange={e => updateSelected({ pinned: e.target.checked })} />
                    Pinned (kinematic anchor)
                  </label>
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
                  <OverrideRow
                    label="restitution"
                    value={selected.restitution}
                    fallback={world.restitution}
                    min={0} max={1} step={0.01}
                    onChange={v => updateSelected({ restitution: v })}
                  />
                  <OverrideRow
                    label="friction"
                    value={selected.friction}
                    fallback={world.friction}
                    min={0} max={0.3} step={0.005}
                    onChange={v => updateSelected({ friction: v })}
                  />
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
              {ballCount} balls · {segments.length} segments · {pivotCount} pivots
            </div>
            <button onClick={share}
              className="mt-3 w-full text-xs px-3 py-2 rounded flex items-center justify-center gap-2"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
              <Copy className="w-3 h-3" /> Copy shareable link
            </button>
          </div>
        </Panel>
      </div>
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

function Slider({ label, value, min, max, step, onChange, suffix }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <span style={{ color: 'var(--color-text)' }}>{value.toFixed(step < 0.01 ? 3 : 2)}{suffix ? ` ${suffix}` : ''}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  )
}

function OverrideRow({ label, value, fallback, min, max, step, onChange }) {
  const overridden = value != null
  return (
    <div className="border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between text-xs mb-1">
        <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <label className="flex items-center gap-1" style={{ color: 'var(--color-text)' }}>
          <input
            type="checkbox"
            checked={overridden}
            onChange={e => onChange(e.target.checked ? fallback : null)}
          />
          override
        </label>
      </div>
      {overridden && (
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="w-full"
        />
      )}
      <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        {overridden ? value.toFixed(step < 0.01 ? 3 : 2) : `world (${fallback.toFixed(step < 0.01 ? 3 : 2)})`}
      </div>
    </div>
  )
}
