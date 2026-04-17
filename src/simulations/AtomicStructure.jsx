import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'

const ELEMENTS = [
  ['H', 'Hydrogen', 1.008], ['He', 'Helium', 4.003], ['Li', 'Lithium', 6.94], ['Be', 'Beryllium', 9.012],
  ['B', 'Boron', 10.81], ['C', 'Carbon', 12.011], ['N', 'Nitrogen', 14.007], ['O', 'Oxygen', 15.999],
  ['F', 'Fluorine', 18.998], ['Ne', 'Neon', 20.18], ['Na', 'Sodium', 22.99], ['Mg', 'Magnesium', 24.305],
  ['Al', 'Aluminum', 26.982], ['Si', 'Silicon', 28.085], ['P', 'Phosphorus', 30.974], ['S', 'Sulfur', 32.06],
  ['Cl', 'Chlorine', 35.45], ['Ar', 'Argon', 39.948], ['K', 'Potassium', 39.098], ['Ca', 'Calcium', 40.078],
]

const SHELL_CAPACITIES = [2, 8, 8, 2]
const SUBSHELLS = [
  ['1s', 2], ['2s', 2], ['2p', 6], ['3s', 2], ['3p', 6], ['4s', 2],
]

function fillShells(electrons) {
  const shells = []
  let remaining = electrons
  for (const capacity of SHELL_CAPACITIES) {
    const used = Math.min(remaining, capacity)
    shells.push(used)
    remaining -= used
    if (remaining <= 0) break
  }
  return shells
}

function electronConfiguration(electrons) {
  let remaining = electrons
  const parts = []
  for (const [subshell, cap] of SUBSHELLS) {
    if (remaining <= 0) break
    const used = Math.min(remaining, cap)
    parts.push(`${subshell}${used}`)
    remaining -= used
  }
  return parts.join(' ')
}

function seededRandom(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function BohrOrCloudScene({ shells, mode, onElectronPick, selectedShell }) {
  const cloudPoints = useMemo(() => {
    const points = []
    shells.forEach((count, shellIndex) => {
      const radius = 1 + shellIndex * 0.8
      for (let i = 0; i < Math.max(12, count * 24); i += 1) {
        const seedBase = shellIndex * 1000 + i + 1
        const theta = seededRandom(seedBase) * Math.PI * 2
        const phi = Math.acos(2 * seededRandom(seedBase + 17) - 1)
        const jitter = radius * (0.6 + seededRandom(seedBase + 41) * 0.7)
        points.push([
          jitter * Math.sin(phi) * Math.cos(theta),
          jitter * Math.sin(phi) * Math.sin(theta),
          jitter * Math.cos(phi),
        ])
      }
    })
    return points
  }, [shells])

  const cloudRef = useRef(null)
  useFrame((state) => {
    if (cloudRef.current) {
      cloudRef.current.rotation.y = state.clock.elapsedTime * 0.15
      cloudRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.2
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 4]} intensity={0.9} color="#22d3ee" />
      <pointLight position={[-4, 2, -4]} intensity={0.65} color="#8b5cf6" />
      <mesh>
        <sphereGeometry args={[0.32, 28, 28]} />
        <meshStandardMaterial color="#f97316" emissive="#ef4444" emissiveIntensity={0.35} />
      </mesh>
      <Html center>
        <div className="rounded-full border px-2 py-1 text-[10px] font-semibold" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}>
          nucleus
        </div>
      </Html>

      {mode === 'bohr' ? shells.map((count, shellIndex) => {
        const radius = 1 + shellIndex * 0.8
        return (
          <group key={`shell-${shellIndex}`}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[radius, 0.02, 12, 80]} />
              <meshStandardMaterial color={selectedShell === shellIndex + 1 ? '#f472b6' : '#60a5fa'} emissive="#38bdf8" emissiveIntensity={0.25} />
            </mesh>
            {Array.from({ length: count }).map((_, electronIndex) => (
              <Electron
                key={`electron-${shellIndex}-${electronIndex}`}
                shellIndex={shellIndex}
                electronIndex={electronIndex}
                radius={radius}
                count={count}
                isValence={shellIndex === shells.length - 1}
                onPick={onElectronPick}
              />
            ))}
          </group>
        )
      }) : (
        <group ref={cloudRef}>
          {cloudPoints.map((point, index) => (
            <mesh key={`cloud-point-${index}`} position={point}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshStandardMaterial color="#60a5fa" emissive="#22d3ee" emissiveIntensity={0.4} transparent opacity={0.32} />
            </mesh>
          ))}
        </group>
      )}
      <OrbitControls enablePan={false} minDistance={3.5} maxDistance={9} />
    </>
  )
}

function Electron({ shellIndex, electronIndex, radius, count, isValence, onPick }) {
  const ref = useRef(null)
  useFrame((state) => {
    if (!ref.current) return
    const baseAngle = (electronIndex / Math.max(count, 1)) * Math.PI * 2
    const speed = 0.45 + shellIndex * 0.1
    const angle = baseAngle + state.clock.elapsedTime * speed
    ref.current.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.25, Math.sin(angle) * radius)
  })
  return (
    <mesh
      ref={ref}
      onClick={() => onPick({ shell: shellIndex + 1, electronIndex: electronIndex + 1, energyLevel: shellIndex + 1 })}
    >
      <sphereGeometry args={[0.08, 18, 18]} />
      <meshStandardMaterial color={isValence ? '#f472b6' : '#a5f3fc'} emissive={isValence ? '#ec4899' : '#22d3ee'} emissiveIntensity={0.45} />
    </mesh>
  )
}

export default function AtomicStructure({
  variables,
  isPlaying = false,
  onDataUpdate,
  onDataPoint,
  atomicNumber,
  mode,
}) {
  const emit = onDataUpdate || onDataPoint
  const values = variables && typeof variables === 'object' ? variables : {}
  const defaultAtomicNumber = Number(values.atomicNumber ?? atomicNumber ?? 8)
  const defaultMode = values.mode || mode || 'bohr'

  const [selectedAtomicNumber, setSelectedAtomicNumber] = useState(Math.max(1, Math.min(20, Number.isFinite(defaultAtomicNumber) ? Math.round(defaultAtomicNumber) : 8)))
  const [renderMode, setRenderMode] = useState(defaultMode)
  const [selectedElectron, setSelectedElectron] = useState(null)
  const [time, setTime] = useState(0)

  useEffect(() => {
    let rafId = 0
    let previous = performance.now()
    const tick = (now) => {
      const dt = (now - previous) / 1000
      previous = now
      if (isPlaying) {
        setTime(prev => prev + dt)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [isPlaying])

  const element = ELEMENTS[selectedAtomicNumber - 1]
  const [symbol, name, atomicMass] = element
  const protons = selectedAtomicNumber
  const electrons = selectedAtomicNumber
  const neutrons = Math.max(0, Math.round(atomicMass) - protons)
  const shells = fillShells(electrons)
  const valence = shells[shells.length - 1] || 0
  const config = electronConfiguration(electrons)

  useEffect(() => {
    if (!emit) return
    const interval = setInterval(() => {
      emit({
        t: time,
        atomicNumber: selectedAtomicNumber,
        protons,
        neutrons,
        electrons,
        valenceElectrons: valence,
        shellCount: shells.length,
      })
    }, 65)
    return () => clearInterval(interval)
  }, [electrons, emit, neutrons, protons, selectedAtomicNumber, shells.length, time, valence])

  return (
    <div className="grid h-full min-h-[620px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_340px]" style={{ background: 'var(--color-bg)' }}>
      <section className="h-[58vh] min-h-[360px] overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <Canvas camera={{ position: [0, 2.2, 5.6], fov: 50 }}>
          <BohrOrCloudScene shells={shells} mode={renderMode} selectedShell={selectedElectron?.shell} onElectronPick={setSelectedElectron} />
        </Canvas>
      </section>

      <section className="space-y-3 rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Element
          <select value={selectedAtomicNumber} onChange={(event) => setSelectedAtomicNumber(Number(event.target.value))} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
            {ELEMENTS.map((item, index) => (
              <option key={item[0]} value={index + 1}>{index + 1} • {item[1]} ({item[0]})</option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Model mode
          <select value={renderMode} onChange={(event) => setRenderMode(event.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
            <option value="bohr">Bohr orbit model</option>
            <option value="quantum">Quantum probability cloud</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <Stat label="Element" value={`${name} (${symbol})`} />
          <Stat label="Atomic #" value={protons} />
          <Stat label="Protons" value={protons} />
          <Stat label="Neutrons" value={neutrons} />
          <Stat label="Electrons" value={electrons} />
          <Stat label="Valence e⁻" value={valence} />
        </div>

        <div className="rounded-xl border p-2 text-xs" style={{ borderColor: 'var(--color-border)' }}>
          <div style={{ color: 'var(--color-text-muted)' }}>Shell filling (2, 8, 8, 2...)</div>
          <div className="mt-1 font-mono" style={{ color: 'var(--color-text)' }}>
            {shells.map((count, index) => `n=${index + 1}: ${count}`).join('  •  ')}
          </div>
        </div>

        <div className="rounded-xl border p-2 text-xs" style={{ borderColor: 'var(--color-border)' }}>
          <div style={{ color: 'var(--color-text-muted)' }}>Electron configuration</div>
          <div className="mt-1 font-mono" style={{ color: '#22d3ee' }}>{config}</div>
        </div>

        <div className="rounded-xl border p-2 text-xs" style={{ borderColor: 'var(--color-border)' }}>
          <div style={{ color: 'var(--color-text-muted)' }}>Electron inspector</div>
          <div className="mt-1" style={{ color: 'var(--color-text)' }}>
            {selectedElectron
              ? `Shell n=${selectedElectron.shell}, electron #${selectedElectron.electronIndex}, energy level ${selectedElectron.energyLevel}`
              : 'Click an electron to inspect shell and energy level.'}
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border p-2" style={{ borderColor: 'var(--color-border)' }}>
      <div style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="mt-1 font-semibold" style={{ color: 'var(--color-text)' }}>{value}</div>
    </div>
  )
}
