import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const R_GAS = 0.082057

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function speedColor(normalized) {
  const n = clamp(normalized, 0, 1)
  if (n < 0.4) return '#38bdf8'
  if (n < 0.75) return '#facc15'
  return '#ef4444'
}

function relationForMode(mode) {
  if (mode === 'boyle') return { title: "Boyle's Law", equation: 'P₁V₁ = P₂V₂ (T constant)', xKey: 'V', yKey: 'P' }
  if (mode === 'charles') return { title: "Charles's Law", equation: 'V/T = constant (P constant)', xKey: 'T', yKey: 'V' }
  return { title: "Gay-Lussac's Law", equation: 'P/T = constant (V constant)', xKey: 'T', yKey: 'P' }
}

export default function GasLaws({
  variables,
  isPlaying = false,
  onDataUpdate,
  onDataPoint,
  pressure,
  volume,
  temperature,
  moles,
  mode,
}) {
  const emit = onDataUpdate || onDataPoint
  const values = variables && typeof variables === 'object' ? variables : {}
  const initialP = Number(values.pressure ?? pressure ?? 1)
  const initialV = Number(values.volume ?? volume ?? 12)
  const initialT = Number(values.temperature ?? temperature ?? 300)
  const initialN = Number(values.moles ?? values.n ?? moles ?? 1)
  const initialMode = values.mode || mode || 'boyle'

  const [selectedMode, setSelectedMode] = useState(initialMode)
  const [nMoles, setNMoles] = useState(clamp(Number.isFinite(initialN) ? initialN : 1, 0.2, 4))
  const [constantP, setConstantP] = useState(clamp(Number.isFinite(initialP) ? initialP : 1, 0.4, 4))
  const [constantV, setConstantV] = useState(clamp(Number.isFinite(initialV) ? initialV : 12, 6, 30))
  const [constantT, setConstantT] = useState(clamp(Number.isFinite(initialT) ? initialT : 300, 220, 900))
  const [volumeControl, setVolumeControl] = useState(clamp(Number.isFinite(initialV) ? initialV : 12, 6, 30))
  const [temperatureControl, setTemperatureControl] = useState(clamp(Number.isFinite(initialT) ? initialT : 300, 220, 900))
  const [history, setHistory] = useState([])
  const [time, setTime] = useState(0)
  const canvasRef = useRef(null)
  const particlesRef = useRef([])

  const relation = relationForMode(selectedMode)

  const state = useMemo(() => {
    let P = constantP
    let V = constantV
    let T = constantT
    if (selectedMode === 'boyle') {
      V = volumeControl
      T = constantT
      P = (nMoles * R_GAS * T) / Math.max(V, 1e-6)
    } else if (selectedMode === 'charles') {
      T = temperatureControl
      P = constantP
      V = (nMoles * R_GAS * T) / Math.max(P, 1e-6)
    } else {
      T = temperatureControl
      V = constantV
      P = (nMoles * R_GAS * T) / Math.max(V, 1e-6)
    }
    return { P, V, T, n: nMoles }
  }, [constantP, constantT, constantV, nMoles, selectedMode, temperatureControl, volumeControl])

  useEffect(() => {
    let rafId = 0
    let prev = performance.now()
    let accumulator = 0
    const animate = (now) => {
      const dt = (now - prev) / 1000
      prev = now
      if (isPlaying) {
        accumulator += dt
        setTime(t => t + dt)
        if (selectedMode === 'boyle') {
          setVolumeControl(v => {
            const next = v + Math.sin(now * 0.0012) * 0.03
            return clamp(next, 6, 30)
          })
        } else {
          setTemperatureControl(t => {
            const next = t + Math.sin(now * 0.001) * 0.8
            return clamp(next, 220, 900)
          })
        }
      }
      if (accumulator > 0.14) {
        accumulator = 0
        setHistory(prevHistory => {
          const xValue = relation.xKey === 'V' ? state.V : state.T
          const yValue = relation.yKey === 'P' ? state.P : state.V
          const next = [...prevHistory, { t: Number(time.toFixed(2)), x: Number(xValue.toFixed(3)), y: Number(yValue.toFixed(3)) }]
          return next.slice(-300)
        })
      }
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [isPlaying, relation.xKey, relation.yKey, selectedMode, state.P, state.T, state.V, time])

  useEffect(() => {
    if (!emit) return
    const id = setInterval(() => {
      emit({
        t: time,
        pressure: state.P,
        volume: state.V,
        temperature: state.T,
        moles: state.n,
        relationX: relation.xKey === 'V' ? state.V : state.T,
        relationY: relation.yKey === 'P' ? state.P : state.V,
      })
    }, 70)
    return () => clearInterval(id)
  }, [emit, relation.xKey, relation.yKey, state.P, state.T, state.V, state.n, time])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const count = Math.max(10, Math.min(120, Math.round(state.n * 22)))
    if (particlesRef.current.length !== count) {
      particlesRef.current = Array.from({ length: count }).map(() => ({
        x: 70 + Math.random() * 220,
        y: 70 + Math.random() * 220,
        vx: (Math.random() - 0.5) * 70,
        vy: (Math.random() - 0.5) * 70,
      }))
    }

    let rafId = 0
    let previous = performance.now()
    const draw = (now) => {
      const dt = Math.min((now - previous) / 1000, 0.033)
      previous = now
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, width, height)

      const chamberWidth = 220
      const baseTop = 50
      const maxHeight = 250
      const normalizedVolume = clamp(state.V / 30, 0.2, 1)
      const gasHeight = maxHeight * normalizedVolume
      const chamberLeft = 70
      const chamberBottom = baseTop + maxHeight
      const chamberTop = chamberBottom - gasHeight

      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 3
      ctx.strokeRect(chamberLeft, baseTop, chamberWidth, maxHeight)
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(chamberLeft, chamberTop - 8, chamberWidth, 10)

      const thermalScale = Math.sqrt(state.T / 300)
      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx * thermalScale * dt
        particle.y += particle.vy * thermalScale * dt
        if (particle.x < chamberLeft + 4 || particle.x > chamberLeft + chamberWidth - 4) particle.vx *= -1
        if (particle.y < chamberTop + 4 || particle.y > chamberBottom - 4) particle.vy *= -1
        particle.x = clamp(particle.x, chamberLeft + 4, chamberLeft + chamberWidth - 4)
        particle.y = clamp(particle.y, chamberTop + 4, chamberBottom - 4)
        const speed = Math.sqrt(particle.vx ** 2 + particle.vy ** 2) * thermalScale / 120
        ctx.fillStyle = speedColor(speed)
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, 2.4, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.fillStyle = '#cbd5e1'
      ctx.font = '12px monospace'
      ctx.fillText(`P=${state.P.toFixed(2)} atm`, 16, 18)
      ctx.fillText(`V=${state.V.toFixed(2)} L`, 150, 18)
      ctx.fillText(`T=${state.T.toFixed(1)} K`, 16, 34)
      ctx.fillText(`n=${state.n.toFixed(2)} mol`, 150, 34)
      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [state.P, state.T, state.V, state.n])

  return (
    <div className="grid h-full min-h-[620px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]" style={{ background: 'var(--color-bg)' }}>
      <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{relation.title}</h3>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{relation.equation}</span>
        </div>
        <canvas ref={canvasRef} width={360} height={320} className="mx-auto w-full rounded-xl border" style={{ borderColor: 'var(--color-border)', maxWidth: 520 }} />
        <div className="mt-4 h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="x" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis dataKey="y" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="y" stroke="#22d3ee" strokeWidth={2.1} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Law mode
          <select value={selectedMode} onChange={(event) => {
            setSelectedMode(event.target.value)
            setHistory([])
            setTime(0)
          }} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
            <option value="boyle">Boyle (T constant)</option>
            <option value="charles">Charles (P constant)</option>
            <option value="gay_lussac">Gay-Lussac (V constant)</option>
          </select>
        </label>

        <label className="block text-xs" style={{ color: 'var(--color-text)' }}>
          Moles (n): {nMoles.toFixed(2)} mol
          <input type="range" min={0.2} max={4} step={0.05} value={nMoles} onChange={(event) => setNMoles(Number(event.target.value))} className="mt-2 w-full" />
        </label>

        {selectedMode === 'boyle' ? (
          <>
            <label className="block text-xs" style={{ color: 'var(--color-text)' }}>
              Temperature constant: {constantT.toFixed(0)} K
              <input type="range" min={220} max={900} step={5} value={constantT} onChange={(event) => setConstantT(Number(event.target.value))} className="mt-2 w-full" />
            </label>
            <label className="block text-xs" style={{ color: 'var(--color-text)' }}>
              Volume control: {volumeControl.toFixed(2)} L
              <input type="range" min={6} max={30} step={0.1} value={volumeControl} onChange={(event) => setVolumeControl(Number(event.target.value))} className="mt-2 w-full" />
            </label>
          </>
        ) : (
          <>
            {selectedMode === 'charles' ? (
              <label className="block text-xs" style={{ color: 'var(--color-text)' }}>
                Pressure constant: {constantP.toFixed(2)} atm
                <input type="range" min={0.4} max={4} step={0.05} value={constantP} onChange={(event) => setConstantP(Number(event.target.value))} className="mt-2 w-full" />
              </label>
            ) : (
              <label className="block text-xs" style={{ color: 'var(--color-text)' }}>
                Volume constant: {constantV.toFixed(2)} L
                <input type="range" min={6} max={30} step={0.1} value={constantV} onChange={(event) => setConstantV(Number(event.target.value))} className="mt-2 w-full" />
              </label>
            )}
            <label className="block text-xs" style={{ color: 'var(--color-text)' }}>
              Temperature control: {temperatureControl.toFixed(1)} K
              <input type="range" min={220} max={900} step={1} value={temperatureControl} onChange={(event) => setTemperatureControl(Number(event.target.value))} className="mt-2 w-full" />
            </label>
          </>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <Metric label="Pressure" value={`${state.P.toFixed(3)} atm`} />
          <Metric label="Volume" value={`${state.V.toFixed(3)} L`} />
          <Metric label="Temperature" value={`${state.T.toFixed(1)} K`} />
          <Metric label="nRT/PV" value={`${((state.n * R_GAS * state.T) / Math.max(state.P * state.V, 1e-9)).toFixed(3)}`} />
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border p-2" style={{ borderColor: 'var(--color-border)' }}>
      <div style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="mt-1 font-semibold" style={{ color: 'var(--color-text)' }}>{value}</div>
    </div>
  )
}
