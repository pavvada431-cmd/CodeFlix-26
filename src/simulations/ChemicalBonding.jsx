import { useEffect, useMemo, useRef, useState } from 'react'

const ELECTRONEGATIVITY = {
  H: 2.2,
  O: 3.44,
  C: 2.55,
  Na: 0.93,
  Cl: 3.16,
  Cu: 1.9,
}

const COVALENT_MOLECULES = {
  H2: {
    atoms: [{ element: 'H', x: 95, y: 110 }, { element: 'H', x: 245, y: 110 }],
    bonds: [{ a: 0, b: 1, order: 1, length: 0.74, energy: 436 }],
  },
  O2: {
    atoms: [{ element: 'O', x: 95, y: 110 }, { element: 'O', x: 245, y: 110 }],
    bonds: [{ a: 0, b: 1, order: 2, length: 1.21, energy: 498 }],
  },
  H2O: {
    atoms: [{ element: 'O', x: 170, y: 95 }, { element: 'H', x: 90, y: 175 }, { element: 'H', x: 250, y: 175 }],
    bonds: [{ a: 0, b: 1, order: 1, length: 0.96, energy: 463 }, { a: 0, b: 2, order: 1, length: 0.96, energy: 463 }],
  },
  CO2: {
    atoms: [{ element: 'O', x: 80, y: 110 }, { element: 'C', x: 170, y: 110 }, { element: 'O', x: 260, y: 110 }],
    bonds: [{ a: 0, b: 1, order: 2, length: 1.16, energy: 799 }, { a: 1, b: 2, order: 2, length: 1.16, energy: 799 }],
  },
}

const BONDING_INFO = {
  ionic: {
    pair: ['Na', 'Cl'],
    bondLength: 2.36,
    bondEnergy: 411,
    polarity: 'Strongly polar',
  },
  metallic: {
    pair: ['Cu', 'Cu'],
    bondLength: 2.56,
    bondEnergy: 337,
    polarity: 'Nonpolar metallic lattice',
  },
}

function atomColor(symbol) {
  if (symbol === 'O') return '#ef4444'
  if (symbol === 'H') return '#93c5fd'
  if (symbol === 'C') return '#4b5563'
  if (symbol === 'Na') return '#fb923c'
  if (symbol === 'Cl') return '#22d3ee'
  return '#c084fc'
}

function bondDecision(diff, mode) {
  if (mode === 'metallic') return 'Metallic'
  if (diff >= 1.7) return 'Ionic'
  return 'Covalent'
}

function IonicScene({ phase }) {
  const electronX = 110 + phase * 130
  return (
    <svg viewBox="0 0 340 220" className="h-full w-full">
      <rect x="0" y="0" width="340" height="220" fill="#0f172a" />
      <circle cx="85" cy="110" r="40" fill={atomColor('Na')} opacity="0.9" />
      <circle cx="255" cy="110" r="44" fill={atomColor('Cl')} opacity="0.9" />
      <text x="85" y="116" textAnchor="middle" fill="#111827" fontWeight="700">Na</text>
      <text x="255" y="116" textAnchor="middle" fill="#0f172a" fontWeight="700">Cl</text>
      <line x1="125" y1="110" x2="212" y2="110" stroke="#94a3b8" strokeDasharray="6 5" strokeWidth="2" />
      <circle cx={electronX} cy={95} r="7" fill="#fef08a" />
      <text x="170" y="194" textAnchor="middle" fill="#cbd5e1" fontSize="12">Electron transfer: Na → Cl</text>
    </svg>
  )
}

function CovalentScene({ molecule, phase }) {
  return (
    <svg viewBox="0 0 340 220" className="h-full w-full">
      <rect x="0" y="0" width="340" height="220" fill="#0f172a" />
      {molecule.bonds.map((bond, index) => {
        const a = molecule.atoms[bond.a]
        const b = molecule.atoms[bond.b]
        const offset = bond.order === 2 ? 4 : 0
        return (
          <g key={`bond-${index}`}>
            <line x1={a.x} y1={a.y - offset} x2={b.x} y2={b.y - offset} stroke="#94a3b8" strokeWidth="3" />
            {bond.order === 2 ? (
              <line x1={a.x} y1={a.y + offset} x2={b.x} y2={b.y + offset} stroke="#94a3b8" strokeWidth="3" />
            ) : null}
            <circle
              cx={(a.x + b.x) / 2 + Math.sin(phase * Math.PI * 2) * 4}
              cy={(a.y + b.y) / 2 + Math.cos(phase * Math.PI * 2) * 4}
              r="5.5"
              fill="#fef08a"
            />
          </g>
        )
      })}
      {molecule.atoms.map((atom, index) => (
        <g key={`atom-${index}`}>
          <circle cx={atom.x} cy={atom.y} r="31" fill={atomColor(atom.element)} />
          <text x={atom.x} y={atom.y + 6} textAnchor="middle" fill="#0f172a" fontWeight="700">{atom.element}</text>
        </g>
      ))}
      <text x="170" y="196" textAnchor="middle" fill="#cbd5e1" fontSize="12">Electron sharing in covalent bond</text>
    </svg>
  )
}

function MetallicScene({ phase }) {
  const electrons = Array.from({ length: 16 }).map((_, index) => {
    const row = Math.floor(index / 4)
    const col = index % 4
    return {
      x: 48 + col * 82 + Math.sin(phase * Math.PI * 2 + index) * 12,
      y: 52 + row * 42 + Math.cos(phase * Math.PI * 1.6 + index) * 10,
    }
  })
  return (
    <svg viewBox="0 0 340 220" className="h-full w-full">
      <rect x="0" y="0" width="340" height="220" fill="#0f172a" />
      {Array.from({ length: 3 }).map((_, row) => (
        Array.from({ length: 4 }).map((__, col) => (
          <g key={`metal-${row}-${col}`}>
            <circle cx={72 + col * 70} cy={64 + row * 54} r="22" fill="#9ca3af" />
            <text x={72 + col * 70} y={70 + row * 54} textAnchor="middle" fill="#111827" fontWeight="700">M⁺</text>
          </g>
        ))
      ))}
      {electrons.map((electron, index) => <circle key={`electron-${index}`} cx={electron.x} cy={electron.y} r="5" fill="#22d3ee" opacity="0.9" />)}
      <text x="170" y="205" textAnchor="middle" fill="#cbd5e1" fontSize="12">Delocalized electron sea around metallic cations</text>
    </svg>
  )
}

export default function ChemicalBonding({
  variables,
  isPlaying = false,
  onDataUpdate,
  onDataPoint,
  mode,
  molecule,
}) {
  const emit = onDataUpdate || onDataPoint
  const values = variables && typeof variables === 'object' ? variables : {}
  const defaultMode = values.mode || mode || 'ionic'
  const defaultMolecule = values.molecule || molecule || 'H2O'

  const [selectedMode, setSelectedMode] = useState(defaultMode)
  const [selectedMolecule, setSelectedMolecule] = useState(defaultMolecule)
  const [phase, setPhase] = useState(0)
  const tRef = useRef(0)

  useEffect(() => {
    let rafId = 0
    let prev = performance.now()
    const tick = (now) => {
      const dt = (now - prev) / 1000
      prev = now
      if (isPlaying) {
        tRef.current += dt
        setPhase(prevPhase => {
          const next = prevPhase + dt * 0.45
          return next > 1 ? next - 1 : next
        })
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [isPlaying])

  const metrics = useMemo(() => {
    if (selectedMode === 'ionic') {
      const [a, b] = BONDING_INFO.ionic.pair
      const diff = Math.abs((ELECTRONEGATIVITY[a] || 0) - (ELECTRONEGATIVITY[b] || 0))
      return {
        pair: `${a}—${b}`,
        enDiff: diff,
        bondLength: BONDING_INFO.ionic.bondLength,
        bondEnergy: BONDING_INFO.ionic.bondEnergy,
        polarity: BONDING_INFO.ionic.polarity,
      }
    }
    if (selectedMode === 'metallic') {
      return {
        pair: 'Cu lattice',
        enDiff: 0,
        bondLength: BONDING_INFO.metallic.bondLength,
        bondEnergy: BONDING_INFO.metallic.bondEnergy,
        polarity: BONDING_INFO.metallic.polarity,
      }
    }
    const model = COVALENT_MOLECULES[selectedMolecule] || COVALENT_MOLECULES.H2O
    const firstBond = model.bonds[0]
    const atomA = model.atoms[firstBond.a].element
    const atomB = model.atoms[firstBond.b].element
    const enDiff = Math.abs((ELECTRONEGATIVITY[atomA] || 0) - (ELECTRONEGATIVITY[atomB] || 0))
    const avgLength = model.bonds.reduce((sum, bond) => sum + bond.length, 0) / model.bonds.length
    const avgEnergy = model.bonds.reduce((sum, bond) => sum + bond.energy, 0) / model.bonds.length
    return {
      pair: selectedMolecule,
      enDiff,
      bondLength: avgLength,
      bondEnergy: avgEnergy,
      polarity: enDiff > 0.4 ? 'Polar covalent' : 'Nonpolar covalent',
    }
  }, [selectedMode, selectedMolecule])

  useEffect(() => {
    if (!emit) return
    const id = setInterval(() => {
      emit({
        t: tRef.current,
        bondMode: selectedMode === 'ionic' ? 1 : selectedMode === 'covalent' ? 2 : 3,
        electronegativityDiff: metrics.enDiff,
        electronegativity_diff: metrics.enDiff,
        bondLengthA: metrics.bondLength,
        bond_length_pm: metrics.bondLength * 100,
        bondEnergyKJ: metrics.bondEnergy,
        bond_energy_kJ: metrics.bondEnergy,
        animationPhase: phase,
      })
    }, 70)
    return () => clearInterval(id)
  }, [emit, metrics.bondEnergy, metrics.bondLength, metrics.enDiff, phase, selectedMode])

  return (
    <div className="grid h-full min-h-[620px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_350px]" style={{ background: 'var(--color-bg)' }}>
      <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Bonding animation
        </div>
        <div className="h-[400px] overflow-hidden rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
          {selectedMode === 'ionic' ? <IonicScene phase={phase} /> : null}
          {selectedMode === 'covalent' ? <CovalentScene molecule={COVALENT_MOLECULES[selectedMolecule] || COVALENT_MOLECULES.H2O} phase={phase} /> : null}
          {selectedMode === 'metallic' ? <MetallicScene phase={phase} /> : null}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Bonding mode
          <select value={selectedMode} onChange={(event) => setSelectedMode(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
            <option value="ionic">Ionic (NaCl)</option>
            <option value="covalent">Covalent</option>
            <option value="metallic">Metallic (electron sea)</option>
          </select>
        </label>

        {selectedMode === 'covalent' ? (
          <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Covalent example
            <select value={selectedMolecule} onChange={(event) => setSelectedMolecule(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
              {Object.keys(COVALENT_MOLECULES).map((formula) => <option key={formula} value={formula}>{formula}</option>)}
            </select>
          </label>
        ) : null}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <Field label="System" value={metrics.pair} />
          <Field label="ΔEN" value={metrics.enDiff.toFixed(2)} />
          <Field label="Bond type" value={bondDecision(metrics.enDiff, selectedMode)} />
          <Field label="Polarity" value={metrics.polarity} />
          <Field label="Bond length" value={`${metrics.bondLength.toFixed(2)} Å`} />
          <Field label="Bond energy" value={`${metrics.bondEnergy.toFixed(0)} kJ/mol`} />
        </div>
      </section>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl border p-2" style={{ borderColor: 'var(--color-border)' }}>
      <div style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="mt-1 font-semibold" style={{ color: 'var(--color-text)' }}>{value}</div>
    </div>
  )
}
