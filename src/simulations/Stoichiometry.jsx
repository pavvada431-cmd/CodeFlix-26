import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'

const AVOGADRO = 6.022e23

const REACTIONS = {
  water_formation: {
    key: 'water_formation',
    equation: '2H₂ + O₂ → 2H₂O',
    reactants: [
      { formula: 'H2', coefficient: 2, molarMass: 2.016, label: 'Hydrogen' },
      { formula: 'O2', coefficient: 1, molarMass: 31.998, label: 'Oxygen' },
    ],
    products: [
      { formula: 'H2O', coefficient: 2, molarMass: 18.015, label: 'Water' },
    ],
  },
  methane_combustion: {
    key: 'methane_combustion',
    equation: 'CH₄ + 2O₂ → CO₂ + 2H₂O',
    reactants: [
      { formula: 'CH4', coefficient: 1, molarMass: 16.043, label: 'Methane' },
      { formula: 'O2', coefficient: 2, molarMass: 31.998, label: 'Oxygen' },
    ],
    products: [
      { formula: 'CO2', coefficient: 1, molarMass: 44.009, label: 'Carbon dioxide' },
      { formula: 'H2O', coefficient: 2, molarMass: 18.015, label: 'Water' },
    ],
  },
  iron_hcl: {
    key: 'iron_hcl',
    equation: 'Fe + 2HCl → FeCl₂ + H₂',
    reactants: [
      { formula: 'Fe', coefficient: 1, molarMass: 55.845, label: 'Iron' },
      { formula: 'HCl', coefficient: 2, molarMass: 36.458, label: 'Hydrochloric acid' },
    ],
    products: [
      { formula: 'FeCl2', coefficient: 1, molarMass: 126.751, label: 'Iron(II) chloride' },
      { formula: 'H2', coefficient: 1, molarMass: 2.016, label: 'Hydrogen gas' },
    ],
  },
  sodium_water: {
    key: 'sodium_water',
    equation: '2Na + 2H₂O → 2NaOH + H₂',
    reactants: [
      { formula: 'Na', coefficient: 2, molarMass: 22.99, label: 'Sodium' },
      { formula: 'H2O', coefficient: 2, molarMass: 18.015, label: 'Water' },
    ],
    products: [
      { formula: 'NaOH', coefficient: 2, molarMass: 39.997, label: 'Sodium hydroxide' },
      { formula: 'H2', coefficient: 1, molarMass: 2.016, label: 'Hydrogen gas' },
    ],
  },
}

const ATOM_COLORS = {
  H: '#dbeafe',
  O: '#ef4444',
  C: '#374151',
  Fe: '#f59e0b',
  Cl: '#22d3ee',
  Na: '#f97316',
}

const MOLECULE_MODELS = {
  H2: { atoms: [{ e: 'H', p: [-0.22, 0, 0] }, { e: 'H', p: [0.22, 0, 0] }], bonds: [[0, 1]] },
  O2: { atoms: [{ e: 'O', p: [-0.28, 0, 0] }, { e: 'O', p: [0.28, 0, 0] }], bonds: [[0, 1]] },
  H2O: {
    atoms: [{ e: 'O', p: [0, 0, 0] }, { e: 'H', p: [-0.34, 0.25, 0] }, { e: 'H', p: [0.34, 0.25, 0] }],
    bonds: [[0, 1], [0, 2]],
  },
  CH4: {
    atoms: [{ e: 'C', p: [0, 0, 0] }, { e: 'H', p: [0.42, 0.42, 0] }, { e: 'H', p: [-0.42, 0.42, 0] }, { e: 'H', p: [0, -0.45, 0] }, { e: 'H', p: [0, 0, 0.55] }],
    bonds: [[0, 1], [0, 2], [0, 3], [0, 4]],
  },
  CO2: {
    atoms: [{ e: 'O', p: [-0.55, 0, 0] }, { e: 'C', p: [0, 0, 0] }, { e: 'O', p: [0.55, 0, 0] }],
    bonds: [[0, 1], [1, 2]],
  },
  Fe: { atoms: [{ e: 'Fe', p: [0, 0, 0] }], bonds: [] },
  HCl: { atoms: [{ e: 'H', p: [-0.28, 0, 0] }, { e: 'Cl', p: [0.28, 0, 0] }], bonds: [[0, 1]] },
  FeCl2: { atoms: [{ e: 'Fe', p: [0, 0, 0] }, { e: 'Cl', p: [-0.52, 0.22, 0] }, { e: 'Cl', p: [0.52, 0.22, 0] }], bonds: [[0, 1], [0, 2]] },
  Na: { atoms: [{ e: 'Na', p: [0, 0, 0] }], bonds: [] },
  NaOH: { atoms: [{ e: 'Na', p: [-0.48, 0, 0] }, { e: 'O', p: [0, 0, 0] }, { e: 'H', p: [0.42, 0.23, 0] }], bonds: [[0, 1], [1, 2]] },
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num))
}

function formatScientific(value) {
  if (!Number.isFinite(value) || value <= 0) return '0'
  return value.toExponential(3)
}

function Molecule({ formula, position, scale = 1, label }) {
  const model = MOLECULE_MODELS[formula] || MOLECULE_MODELS.H2
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {model.bonds.map((bond, index) => {
        const a = model.atoms[bond[0]].p
        const b = model.atoms[bond[1]].p
        const center = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
        const dx = b[0] - a[0]
        const dy = b[1] - a[1]
        const dz = b[2] - a[2]
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
        return (
          <mesh key={`bond-${formula}-${index}`} position={center} rotation={[0, 0, Math.atan2(dx, dy)]}>
            <cylinderGeometry args={[0.04, 0.04, length, 12]} />
            <meshStandardMaterial color="#9ca3af" />
          </mesh>
        )
      })}
      {model.atoms.map((atom, index) => (
        <mesh key={`atom-${formula}-${index}`} position={atom.p}>
          <sphereGeometry args={[atom.e === 'H' ? 0.12 : 0.2, 24, 24]} />
          <meshStandardMaterial color={ATOM_COLORS[atom.e] || '#a855f7'} emissive={ATOM_COLORS[atom.e] || '#a855f7'} emissiveIntensity={0.15} />
        </mesh>
      ))}
      <Html position={[0, -0.55, 0]} center>
        <div className="rounded-full border px-2 py-1 text-[10px] font-semibold" style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          {label || formula}
        </div>
      </Html>
    </group>
  )
}

function ReactionScene({ reaction, progress }) {
  const reactantX = -2.5 + progress * 1.6
  const productX = 2.5 - (1 - progress) * 1.6
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={1.1} color="#22d3ee" />
      <pointLight position={[-4, 4, 4]} intensity={0.8} color="#f97316" />
      {reaction.reactants.map((reactant, index) => (
        <Molecule
          key={`reactant-${reactant.formula}`}
          formula={reactant.formula}
          position={[reactantX, 0.9 - index * 1.5, 0]}
          label={`${reactant.coefficient}${reactant.formula}`}
          scale={1.05 - progress * 0.2}
        />
      ))}
      {reaction.products.map((product, index) => (
        <Molecule
          key={`product-${product.formula}`}
          formula={product.formula}
          position={[productX, 0.9 - index * 1.5, 0]}
          label={`${product.coefficient}${product.formula}`}
          scale={0.85 + progress * 0.2}
        />
      ))}
      <OrbitControls enablePan={false} minDistance={4} maxDistance={8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]}>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </>
  )
}

function ratioBar(numerator, denominator) {
  if (denominator <= 0) return 0
  return clamp(numerator / denominator, 0, 1)
}

export default function Stoichiometry({
  variables,
  isPlaying = false,
  onDataUpdate,
  onDataPoint,
  reaction,
  reactantAmount,
  secondaryAmount,
}) {
  const emit = onDataUpdate || onDataPoint
  const values = variables && typeof variables === 'object' ? variables : {}
  const selectedReactionKey = values.reaction || reaction || 'water_formation'

  const defaultPrimary = Number(values.reactantAmount ?? reactantAmount ?? 4)
  const defaultSecondary = Number(values.secondaryAmount ?? secondaryAmount ?? 3)
  const [primaryMoles, setPrimaryMoles] = useState(Number.isFinite(defaultPrimary) && defaultPrimary > 0 ? defaultPrimary : 4)
  const [secondaryMoles, setSecondaryMoles] = useState(Number.isFinite(defaultSecondary) && defaultSecondary > 0 ? defaultSecondary : 3)
  const [currentReactionKey, setCurrentReactionKey] = useState(selectedReactionKey)
  const [progress, setProgress] = useState(0)
  const timeRef = useRef(0)

  useEffect(() => {
    let rafId = 0
    let previous = performance.now()
    const animate = (now) => {
      const dt = (now - previous) / 1000
      previous = now
      if (isPlaying) {
        timeRef.current += dt
        setProgress(prev => {
          const next = prev + dt * 0.18
          return next > 1 ? 0 : next
        })
      }
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [isPlaying])

  const activeReaction = REACTIONS[currentReactionKey] || REACTIONS.water_formation
  const [reactantA, reactantB] = activeReaction.reactants

  const chemistry = useMemo(() => {
    const extentFromA = primaryMoles / reactantA.coefficient
    const extentFromB = secondaryMoles / reactantB.coefficient
    const reactionExtent = Math.max(0, Math.min(extentFromA, extentFromB))
    const limiting = extentFromA <= extentFromB ? reactantA : reactantB
    const excess = extentFromA > extentFromB ? reactantA : reactantB
    const excessMoles = excess === reactantA
      ? primaryMoles - reactionExtent * reactantA.coefficient
      : secondaryMoles - reactionExtent * reactantB.coefficient

    const products = activeReaction.products.map(product => {
      const moles = reactionExtent * product.coefficient
      return {
        ...product,
        moles,
        grams: moles * product.molarMass,
        particles: moles * AVOGADRO,
      }
    })

    return {
      extent: reactionExtent,
      limiting,
      excess,
      excessMoles: Math.max(0, excessMoles),
      products,
      primaryReactantRatio: ratioBar(primaryMoles / reactantA.coefficient, reactionExtent || 1),
      secondaryReactantRatio: ratioBar(secondaryMoles / reactantB.coefficient, reactionExtent || 1),
    }
  }, [activeReaction.products, primaryMoles, reactantA, reactantB, secondaryMoles])

  useEffect(() => {
    if (!emit) return
    const interval = setInterval(() => {
      emit({
        t: timeRef.current,
        reactionProgress: progress,
        extent: chemistry.extent,
        limitingCoefficient: chemistry.limiting.coefficient,
        excessMoles: chemistry.excessMoles,
        theoreticalYieldMoles: chemistry.products[0]?.moles || 0,
        theoreticalYieldGrams: chemistry.products[0]?.grams || 0,
      })
    }, 60)
    return () => clearInterval(interval)
  }, [chemistry, emit, progress])

  return (
    <div className="grid h-full min-h-[620px] w-full gap-4 p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]" style={{ background: 'var(--color-bg)' }}>
      <section className="relative h-[56vh] min-h-[360px] overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <Canvas camera={{ position: [0, 0.8, 5.8], fov: 48 }}>
          <ReactionScene reaction={activeReaction} progress={progress} />
        </Canvas>
        <div className="pointer-events-none absolute left-4 top-4 rounded-xl border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', backgroundColor: 'var(--color-surface)' }}>
          Balanced: {activeReaction.equation}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Reaction
          <select value={currentReactionKey} onChange={(event) => {
            setCurrentReactionKey(event.target.value)
            setProgress(0)
          }} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
            {Object.values(REACTIONS).map(item => <option key={item.key} value={item.key}>{item.equation}</option>)}
          </select>
        </label>

        <label className="block text-sm" style={{ color: 'var(--color-text)' }}>
          {reactantA.label} ({reactantA.formula}) amount: <strong>{primaryMoles.toFixed(2)} mol</strong>
          <input type="range" min={0.1} max={12} step={0.1} value={primaryMoles} onChange={(event) => setPrimaryMoles(Number(event.target.value))} className="mt-2 w-full" />
        </label>
        <label className="block text-sm" style={{ color: 'var(--color-text)' }}>
          {reactantB.label} ({reactantB.formula}) amount: <strong>{secondaryMoles.toFixed(2)} mol</strong>
          <input type="range" min={0.1} max={12} step={0.1} value={secondaryMoles} onChange={(event) => setSecondaryMoles(Number(event.target.value))} className="mt-2 w-full" />
        </label>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border p-2" style={{ borderColor: 'var(--color-border)' }}>
            <div style={{ color: 'var(--color-text-muted)' }}>Limiting reagent</div>
            <div className="mt-1 font-semibold" style={{ color: 'var(--color-text)' }}>{chemistry.limiting.formula}</div>
          </div>
          <div className="rounded-xl border p-2" style={{ borderColor: 'var(--color-border)' }}>
            <div style={{ color: 'var(--color-text-muted)' }}>Excess reagent</div>
            <div className="mt-1 font-semibold" style={{ color: 'var(--color-text)' }}>{chemistry.excess.formula} ({chemistry.excessMoles.toFixed(2)} mol)</div>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border p-2 text-xs" style={{ borderColor: 'var(--color-border)' }}>
          <div style={{ color: 'var(--color-text-muted)' }}>Mole ratio usage</div>
          <div>
            <div className="mb-1 flex justify-between" style={{ color: 'var(--color-text)' }}>
              <span>{reactantA.formula}</span>
              <span>{(primaryMoles / reactantA.coefficient).toFixed(2)} reaction units</span>
            </div>
            <div className="h-2 rounded bg-slate-700/40">
              <div className="h-2 rounded bg-cyan-400" style={{ width: `${clamp(chemistry.primaryReactantRatio * 100, 5, 100)}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between" style={{ color: 'var(--color-text)' }}>
              <span>{reactantB.formula}</span>
              <span>{(secondaryMoles / reactantB.coefficient).toFixed(2)} reaction units</span>
            </div>
            <div className="h-2 rounded bg-slate-700/40">
              <div className="h-2 rounded bg-orange-400" style={{ width: `${clamp(chemistry.secondaryReactantRatio * 100, 5, 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          {chemistry.products.map(product => (
            <div key={product.formula} className="rounded-xl border p-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="font-semibold" style={{ color: 'var(--color-text)' }}>{product.formula} theoretical yield</div>
              <div style={{ color: 'var(--color-text-muted)' }}>
                {product.moles.toFixed(3)} mol • {product.grams.toFixed(2)} g • {formatScientific(product.particles)} particles
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
