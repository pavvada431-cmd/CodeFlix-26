import { useEffect, useMemo, useRef, useState } from 'react'
import Matter from 'matter-js'
import useSanitizedProps from './shared/useSanitizedProps'
import { normalizeSpec } from './genericSimPresets'

/**
 * Generic, spec-driven 2D simulation. Consumes a JSON `spec` and
 * runs it on a real Matter.js engine with a canvas renderer.
 *
 * This is the substrate that lets the AI generate *new* simulations
 * on the fly — anything expressible as bodies + constraints
 * runs without bespoke code.
 *
 * Spec format (v1):
 * {
 *   v: 1,
 *   world: { gravity: { x: 0, y: 1 }, bounds: { width: 20, height: 12 } },
 *   entities: [
 *     { id, kind: 'ball'|'box'|'static', x, y, r?, w?, h?, mass?, vx?, vy?, angle?, color?, restitution? },
 *     ...
 *   ],
 *   constraints: [{ from, to, stiffness, length? }],
 * }
 */
export default function GenericSim2D(rawProps) {
  const { spec: rawSpec, isPlaying = false, onDataPoint } = useSanitizedProps(rawProps)
  const spec = useMemo(() => normalizeSpec(rawSpec), [rawSpec])
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const engineRef = useRef(null)
  const runnerRef = useRef(null)
  const bodiesRef = useRef(new Map())
  const rafRef = useRef(0)
  const [size, setSize] = useState({ w: 800, h: 480 })

  /* Resize observer */
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ w: Math.max(320, r.width), h: Math.max(240, r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* Build / rebuild the engine when spec changes */
  useEffect(() => {
    const engine = Matter.Engine.create({ enableSleeping: false })
    engine.gravity.x = spec.world.gravity.x
    engine.gravity.y = spec.world.gravity.y
    engineRef.current = engine

    const map = new Map()
    spec.entities.forEach((e) => {
      let body
      const opts = {
        restitution: e.restitution ?? (e.kind === 'static' ? 0 : 0.65),
        friction: e.friction ?? 0.05,
        frictionAir: 0.01,
        density: e.mass ? Math.max(0.001, e.mass / Math.max(0.01, (e.r ? Math.PI * e.r * e.r : (e.w || 1) * (e.h || 1)))) : 0.001,
        isStatic: e.kind === 'static',
        angle: ((e.angle || 0) * Math.PI) / 180,
      }
      if (e.kind === 'ball') {
        body = Matter.Bodies.circle(e.x, e.y, e.r || 0.4, opts)
      } else if (e.kind === 'box' || e.kind === 'static') {
        body = Matter.Bodies.rectangle(e.x, e.y, e.w || 1, e.h || 1, opts)
      } else {
        return
      }
      if (e.vx || e.vy) Matter.Body.setVelocity(body, { x: e.vx || 0, y: e.vy || 0 })
      body.plugin = { color: e.color || '#22d3ee', kind: e.kind, id: e.id }
      map.set(e.id, body)
      Matter.World.add(engine.world, body)
    })

    spec.constraints.forEach((c) => {
      const a = map.get(c.from); const b = map.get(c.to)
      if (!a || !b) return
      Matter.World.add(engine.world, Matter.Constraint.create({
        bodyA: a, bodyB: b, stiffness: c.stiffness ?? 0.05, length: c.length,
      }))
    })

    bodiesRef.current = map

    return () => {
      Matter.Engine.clear(engine)
      bodiesRef.current = new Map()
    }
  }, [spec])

  /* Run / pause */
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (isPlaying && !runnerRef.current) {
      runnerRef.current = Matter.Runner.create()
      Matter.Runner.run(runnerRef.current, engine)
    } else if (!isPlaying && runnerRef.current) {
      Matter.Runner.stop(runnerRef.current)
      runnerRef.current = null
    }
    return () => {
      if (runnerRef.current) {
        Matter.Runner.stop(runnerRef.current)
        runnerRef.current = null
      }
    }
  }, [isPlaying])

  /* Render loop (draw bodies on a canvas, world-units → pixels) */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(size.w * dpr)
    canvas.height = Math.floor(size.h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const { width: W, height: H } = spec.world.bounds
    const scale = Math.min(size.w / W, size.h / H)
    const offsetX = (size.w - W * scale) / 2
    const offsetY = (size.h - H * scale) / 2

    const draw = () => {
      ctx.fillStyle = '#070b14'
      ctx.fillRect(0, 0, size.w, size.h)

      // Grid
      ctx.strokeStyle = 'rgba(34,211,238,0.07)'
      ctx.lineWidth = 1
      for (let gx = 0; gx <= W; gx++) {
        const x = offsetX + gx * scale
        ctx.beginPath(); ctx.moveTo(x, offsetY); ctx.lineTo(x, offsetY + H * scale); ctx.stroke()
      }
      for (let gy = 0; gy <= H; gy++) {
        const y = offsetY + gy * scale
        ctx.beginPath(); ctx.moveTo(offsetX, y); ctx.lineTo(offsetX + W * scale, y); ctx.stroke()
      }

      // Bodies
      bodiesRef.current.forEach((body) => {
        const color = body.plugin?.color || '#22d3ee'
        ctx.save()
        ctx.translate(offsetX + body.position.x * scale, offsetY + body.position.y * scale)
        ctx.rotate(body.angle)

        if (body.circleRadius) {
          // glow
          const r = body.circleRadius * scale
          const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.2)
          grad.addColorStop(0, color)
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = grad
          ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill()
          // core
          ctx.fillStyle = color
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
          ctx.strokeStyle = 'rgba(255,255,255,0.4)'
          ctx.lineWidth = 1.5
          ctx.stroke()
        } else if (body.vertices) {
          ctx.fillStyle = body.plugin?.kind === 'static'
            ? 'rgba(75,85,99,0.85)' : color
          ctx.strokeStyle = 'rgba(255,255,255,0.18)'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          body.vertices.forEach((v, i) => {
            const x = (v.x - body.position.x) * scale
            const y = (v.y - body.position.y) * scale
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          })
          ctx.closePath()
          ctx.fill(); ctx.stroke()
        }
        ctx.restore()
      })

      // Telemetry — first ball
      const firstBall = [...bodiesRef.current.values()].find((b) => b.circleRadius)
      if (firstBall && onDataPoint) {
        onDataPoint({
          time: performance.now() / 1000,
          x: firstBall.position.x,
          y: spec.world.bounds.height - firstBall.position.y,
          vx: firstBall.velocity.x,
          vy: -firstBall.velocity.y,
        })
      }

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [size, spec, onDataPoint])

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden rounded-xl bg-[#070b14]">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-cyan-300/30 bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-200 backdrop-blur">
        <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? 'animate-pulse bg-cyan-300' : 'bg-cyan-300/40'}`} />
        generative · {spec.entities.length} bodies
      </div>
    </div>
  )
}
