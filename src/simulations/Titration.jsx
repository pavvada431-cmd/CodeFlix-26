import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const KA_ACETIC = 1.8e-5
const PKA_ACETIC = 4.76
const KW = 1e-14

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function interpolateColor(c1, c2, t) {
  const a = c1.match(/\w\w/g).map(hex => Number.parseInt(hex, 16))
  const b = c2.match(/\w\w/g).map(hex => Number.parseInt(hex, 16))
  const mixed = a.map((value, i) => Math.round(value + (b[i] - value) * clamp(t, 0, 1)))
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`
}

function calcStrongAcidStrongBasePH(cAcid, vAcidMl, cBase, addedBaseMl) {
  const nAcid = cAcid * (vAcidMl / 1000)
  const nBase = cBase * (addedBaseMl / 1000)
  const totalVolumeL = (vAcidMl + addedBaseMl) / 1000
  const delta = nAcid - nBase
  if (Math.abs(delta) < 1e-10) return 7
  if (delta > 0) {
    const h = Math.max(delta / totalVolumeL, 1e-14)
    return -Math.log10(h)
  }
  const oh = Math.max((-delta) / totalVolumeL, 1e-14)
  return 14 + Math.log10(oh)
}

function calcWeakAcidStrongBasePH(cAcid, vAcidMl, cBase, addedBaseMl) {
  const nHA0 = cAcid * (vAcidMl / 1000)
  const nOH = cBase * (addedBaseMl / 1000)
  const totalVolumeL = (vAcidMl + addedBaseMl) / 1000
  if (nOH <= 1e-12) {
    const h = Math.sqrt(KA_ACETIC * cAcid)
    return -Math.log10(Math.max(h, 1e-14))
  }
  if (nOH < nHA0 - 1e-10) {
    const nA = nOH
    const nHA = nHA0 - nOH
    return PKA_ACETIC + Math.log10(Math.max(nA / nHA, 1e-10))
  }
  if (Math.abs(nOH - nHA0) < 1e-10) {
    const cA = Math.max(nHA0 / totalVolumeL, 1e-12)
    const kb = KW / KA_ACETIC
    const oh = Math.sqrt(kb * cA)
    const pOH = -Math.log10(Math.max(oh, 1e-14))
    return 14 - pOH
  }
  const excessOH = nOH - nHA0
  const oh = Math.max(excessOH / totalVolumeL, 1e-14)
  return 14 + Math.log10(oh)
}

function FlaskGraphic({ pH }) {
  const transition = clamp((pH - 8.2) / 1.8, 0, 1)
  const indicatorColor = interpolateColor('eff6ff', 'f472b6', transition)
  return (
    <svg viewBox="0 0 240 220" className="h-full w-full">
      <rect x="108" y="8" width="24" height="90" rx="4" fill="none" stroke="#94a3b8" strokeWidth="3" />
      <rect x="112" y="8" width="16" height="90" rx="3" fill="#1e293b" />
      <rect x="118" y="98" width="4" height="46" fill="#94a3b8" />
      <circle cx="120" cy="150" r="58" fill="none" stroke="#94a3b8" strokeWidth="3" />
      <ellipse cx="120" cy="176" rx="46" ry="26" fill={indicatorColor} opacity="0.8" />
      <path d="M72 152 Q120 135 168 152" fill={indicatorColor} opacity="0.35" />
      <text x="120" y="208" textAnchor="middle" fill="var(--color-text)" fontSize="12" fontWeight="700">
        Indicator: {pH >= 8.2 ? 'Pink' : 'Colorless'}
      </text>
    </svg>
  )
}

export default function Titration({
  variables,
  isPlaying = false,
  onDataUpdate,
  onDataPoint,
  acidConcentration,
  baseConcentration,
  volume,
  mode,
}) {
  const emit = onDataUpdate || onDataPoint
  const values = variables && typeof variables === 'object' ? variables : {}
  const initialAcidM = Number(values.acidConcentration ?? acidConcentration ?? 0.1)
  const initialBaseM = Number(values.baseConcentration ?? baseConcentration ?? 0.1)
  const initialVolumeMl = Number(values.volume ?? volume ?? 25)
  const initialMode = values.mode || mode || 'strong_acid_strong_base'

  const [cAcid, setCAcid] = useState(Number.isFinite(initialAcidM) && initialAcidM > 0 ? initialAcidM : 0.1)
  const [cBase, setCBase] = useState(Number.isFinite(initialBaseM) && initialBaseM > 0 ? initialBaseM : 0.1)
  const [acidVolumeMl, setAcidVolumeMl] = useState(Number.isFinite(initialVolumeMl) && initialVolumeMl > 0 ? initialVolumeMl : 25)
  const [selectedMode, setSelectedMode] = useState(initialMode)
  const [addedVolumeMl, setAddedVolumeMl] = useState(0)
  const tRef = useRef(0)

  const equivalenceVolumeMl = useMemo(() => {
    const nAcid = cAcid * (acidVolumeMl / 1000)
    return (nAcid / Math.max(cBase, 1e-9)) * 1000
  }, [acidVolumeMl, cAcid, cBase])

  const currentPH = useMemo(() => {
    const ph = selectedMode === 'weak_acid_strong_base'
      ? calcWeakAcidStrongBasePH(cAcid, acidVolumeMl, cBase, addedVolumeMl)
      : calcStrongAcidStrongBasePH(cAcid, acidVolumeMl, cBase, addedVolumeMl)
    return clamp(ph, 0, 14)
  }, [acidVolumeMl, addedVolumeMl, cAcid, cBase, selectedMode])

  const curveData = useMemo(() => {
    const max = Math.max(addedVolumeMl, 0)
    const step = max > 40 ? 0.25 : 0.15
    const points = []
    for (let volumeMl = 0; volumeMl <= max + 1e-6; volumeMl += step) {
      const ph = selectedMode === 'weak_acid_strong_base'
        ? calcWeakAcidStrongBasePH(cAcid, acidVolumeMl, cBase, volumeMl)
        : calcStrongAcidStrongBasePH(cAcid, acidVolumeMl, cBase, volumeMl)
      points.push({ volume: Number(volumeMl.toFixed(2)), pH: Number(clamp(ph, 0, 14).toFixed(4)) })
    }
    if (!points.length) {
      points.push({ volume: 0, pH: Number(currentPH.toFixed(4)) })
    }
    return points
  }, [acidVolumeMl, addedVolumeMl, cAcid, cBase, currentPH, selectedMode])

  useEffect(() => {
    let rafId = 0
    let previous = performance.now()
    const tick = (now) => {
      const dt = (now - previous) / 1000
      previous = now
      if (isPlaying) {
        tRef.current += dt
        setAddedVolumeMl(prev => {
          const next = prev + dt * 1.2
          const cap = Math.max(equivalenceVolumeMl * 1.5, 5)
          return next >= cap ? 0 : next
        })
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [equivalenceVolumeMl, isPlaying])

  useEffect(() => {
    if (!emit) return
    const id = setInterval(() => {
      emit({
        t: tRef.current,
        addedVolumeMl,
        pH: currentPH,
        equivalenceVolumeMl,
        normalizedProgress: equivalenceVolumeMl > 0 ? addedVolumeMl / equivalenceVolumeMl : 0,
      })
    }, 70)
    return () => clearInterval(id)
  }, [addedVolumeMl, currentPH, emit, equivalenceVolumeMl])

  const equivalentNow = Math.abs(addedVolumeMl - equivalenceVolumeMl) < 0.25
  const maxVolume = Math.max(equivalenceVolumeMl * 1.6, 10)

  return (
    <div className="grid h-full min-h-[620px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]" style={{ background: 'var(--color-bg)' }}>
      <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Real-time pH Titration Curve</h3>
          <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: equivalentNow ? '#22c55e' : 'var(--color-border)', color: equivalentNow ? '#22c55e' : 'var(--color-text-muted)' }}>
            {equivalentNow ? 'Equivalence reached' : 'Approaching equivalence'}
          </span>
        </div>
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveData}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="volume" name="Added base (mL)" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis domain={[0, 14]} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip />
              <ReferenceLine y={8.2} stroke="#f472b6" strokeDasharray="3 3" label="Indicator pH 8.2" />
              <ReferenceLine x={equivalenceVolumeMl} stroke="#22c55e" strokeDasharray="3 3" label="Eq. Point" />
              <Line type="monotone" dataKey="pH" stroke="#22d3ee" strokeWidth={2.2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Math mode: {selectedMode === 'weak_acid_strong_base' ? 'Henderson–Hasselbalch in buffer region + hydrolysis at equivalence' : 'Strong acid/strong base neutralization'}
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="h-[220px] rounded-xl border p-2" style={{ borderColor: 'var(--color-border)' }}>
          <FlaskGraphic pH={currentPH} />
        </div>

        <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Mode
          <select value={selectedMode} onChange={(event) => {
            setSelectedMode(event.target.value)
            setAddedVolumeMl(0)
          }} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
            <option value="strong_acid_strong_base">HCl + NaOH (strong/strong)</option>
            <option value="weak_acid_strong_base">CH₃COOH + NaOH (weak/strong)</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs" style={{ color: 'var(--color-text)' }}>
            Acid concentration (M)
            <input type="number" min={0.01} step={0.01} value={cAcid} onChange={(event) => {
              setCAcid(clamp(Number(event.target.value) || 0.1, 0.01, 2))
              setAddedVolumeMl(0)
            }} className="mt-1 w-full rounded-lg border px-2 py-1.5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }} />
          </label>
          <label className="text-xs" style={{ color: 'var(--color-text)' }}>
            Base concentration (M)
            <input type="number" min={0.01} step={0.01} value={cBase} onChange={(event) => {
              setCBase(clamp(Number(event.target.value) || 0.1, 0.01, 2))
              setAddedVolumeMl(0)
            }} className="mt-1 w-full rounded-lg border px-2 py-1.5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }} />
          </label>
        </div>

        <label className="block text-xs" style={{ color: 'var(--color-text)' }}>
          Initial acid volume: {acidVolumeMl.toFixed(1)} mL
          <input type="range" min={5} max={80} step={0.5} value={acidVolumeMl} onChange={(event) => {
            setAcidVolumeMl(Number(event.target.value))
            setAddedVolumeMl(0)
          }} className="mt-2 w-full" />
        </label>
        <label className="block text-xs" style={{ color: 'var(--color-text)' }}>
          Added titrant volume: {addedVolumeMl.toFixed(2)} mL
          <input type="range" min={0} max={maxVolume} step={0.05} value={addedVolumeMl} onChange={(event) => setAddedVolumeMl(Number(event.target.value))} className="mt-2 w-full" />
        </label>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border p-2" style={{ borderColor: 'var(--color-border)' }}>
            <div style={{ color: 'var(--color-text-muted)' }}>Current pH</div>
            <div className="text-lg font-semibold" style={{ color: currentPH >= 8.2 ? '#f472b6' : 'var(--color-text)' }}>{currentPH.toFixed(3)}</div>
          </div>
          <div className="rounded-xl border p-2" style={{ borderColor: 'var(--color-border)' }}>
            <div style={{ color: 'var(--color-text-muted)' }}>Eq. volume</div>
            <div className="text-lg font-semibold" style={{ color: '#22c55e' }}>{equivalenceVolumeMl.toFixed(2)} mL</div>
          </div>
        </div>
      </section>
    </div>
  )
}
