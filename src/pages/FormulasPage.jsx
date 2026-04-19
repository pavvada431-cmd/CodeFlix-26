import { BookOpen, ArrowLeft, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'

const FORMULAS_BY_TOPIC = {
  'Kinematics': [
    { name: 'Displacement', formula: 's = ut + ½at²', description: 'where u = initial velocity, a = acceleration, t = time' },
    { name: 'Final Velocity', formula: 'v = u + at', description: 'Linear velocity after time t' },
    { name: 'Velocity-Displacement', formula: 'v² = u² + 2as', description: 'Relates velocity and displacement' },
    { name: 'Average Velocity', formula: 'v_avg = (u + v) / 2', description: 'For constant acceleration' },
  ],
  'Dynamics': [
    { name: "Newton's Second Law", formula: 'F = ma', description: 'Force equals mass times acceleration' },
    { name: 'Weight', formula: 'W = mg', description: 'Force due to gravity, g ≈ 9.81 m/s²' },
    { name: 'Friction Force', formula: 'f = μN', description: 'Friction coefficient times normal force' },
    { name: 'Momentum', formula: 'p = mv', description: 'Mass times velocity' },
    { name: 'Impulse', formula: 'J = FΔt = Δp', description: 'Force over time equals change in momentum' },
  ],
  'Circular Motion': [
    { name: 'Angular Velocity', formula: 'ω = θ / t', description: 'Angle in radians per unit time' },
    { name: 'Linear Velocity', formula: 'v = ωr', description: 'Where r is the radius' },
    { name: 'Centripetal Acceleration', formula: 'a_c = v² / r = ω²r', description: 'Always points toward center' },
    { name: 'Centripetal Force', formula: 'F_c = ma_c = mω²r', description: 'Required force for circular motion' },
    { name: 'Period', formula: 'T = 2π / ω', description: 'Time for one complete revolution' },
  ],
  'Energy & Work': [
    { name: 'Kinetic Energy', formula: 'KE = ½mv²', description: 'Energy of motion' },
    { name: 'Potential Energy', formula: 'PE = mgh', description: 'Gravitational potential energy' },
    { name: 'Work', formula: 'W = F·d·cos(θ)', description: 'Force dot product displacement' },
    { name: 'Power', formula: 'P = W / t = F·v', description: 'Work per unit time' },
    { name: 'Mechanical Energy', formula: 'E = KE + PE', description: 'Total mechanical energy (conserved)' },
  ],
  'Simple Harmonic Motion': [
    { name: 'Hooke\'s Law', formula: 'F = -kx', description: 'Restoring force in springs, k = spring constant' },
    { name: 'Period (Spring)', formula: 'T = 2π√(m/k)', description: 'Oscillation period' },
    { name: 'Period (Pendulum)', formula: 'T = 2π√(L/g)', description: 'Small angle approximation' },
    { name: 'Angular Frequency', formula: 'ω = √(k/m) or ω = √(g/L)', description: 'For springs and pendulums' },
    { name: 'Elastic PE', formula: 'PE = ½kx²', description: 'Potential energy in deformed spring' },
  ],
  'Projectile Motion': [
    { name: 'Horizontal Range', formula: 'R = (v₀² sin(2θ)) / g', description: 'Max range at 45° launch angle' },
    { name: 'Time of Flight', formula: 't = (2v₀ sin θ) / g', description: 'For level ground' },
    { name: 'Max Height', formula: 'h = (v₀² sin²θ) / (2g)', description: 'Above launch point' },
    { name: 'Horizontal Component', formula: 'v_x = v₀ cos θ', description: 'Remains constant' },
    { name: 'Vertical Component', formula: 'v_y = v₀ sin θ - gt', description: 'Changes due to gravity' },
  ],
  'Rotational Motion': [
    { name: 'Angular Acceleration', formula: 'α = τ / I', description: 'Torque divided by moment of inertia' },
    { name: 'Moment of Inertia (Rod)', formula: 'I = (1/3)ML²', description: 'About end of rod' },
    { name: 'Moment of Inertia (Disk)', formula: 'I = ½MR²', description: 'About central axis' },
    { name: 'Moment of Inertia (Sphere)', formula: 'I = (2/5)MR²', description: 'Solid sphere' },
    { name: 'Rotational KE', formula: 'KE_rot = ½Iω²', description: 'Rotational kinetic energy' },
  ],
  'Waves & Sound': [
    { name: 'Wave Speed', formula: 'v = fλ', description: 'Frequency times wavelength' },
    { name: 'Wave Equation', formula: 'v = √(T/μ)', description: 'For strings: T = tension, μ = linear mass density' },
    { name: 'Doppler Effect', formula: 'f\' = f(v ± v_observer) / (v ∓ v_source)', description: 'Frequency shift due to motion' },
    { name: 'Intensity', formula: 'I = P / A', description: 'Power per unit area' },
    { name: 'Decibel', formula: 'dB = 10 log₁₀(I/I₀)', description: 'Logarithmic intensity scale' },
  ],
  'Fluids': [
    { name: 'Pressure', formula: 'P = F / A', description: 'Force per unit area' },
    { name: 'Hydrostatic Pressure', formula: 'P = P₀ + ρgh', description: 'Pressure in fluids at depth h' },
    { name: 'Buoyant Force', formula: 'F_b = ρVg', description: 'Density times volume times gravity' },
    { name: 'Continuity Equation', formula: 'A₁v₁ = A₂v₂', description: 'Flow rate is constant' },
    { name: 'Bernoulli\'s Equation', formula: 'P + ½ρv² + ρgh = const', description: 'Energy conservation in fluids' },
  ],
  'Electric Fields': [
    { name: 'Electric Force', formula: 'F = kq₁q₂ / r²', description: 'Coulomb\'s law, k = 8.99×10⁹ N·m²/C²' },
    { name: 'Electric Field', formula: 'E = F / q', description: 'Force per unit charge' },
    { name: 'Electric Potential', formula: 'V = kQ / r', description: 'Potential energy per unit charge' },
    { name: 'Capacitance', formula: 'C = Q / V', description: 'Charge per unit voltage' },
    { name: 'Electric PE', formula: 'PE = kq₁q₂ / r', description: 'Potential energy of charge pair' },
  ],
}

const CONSTANTS = [
  { name: 'Gravity', symbol: 'g', value: '9.81 m/s²' },
  { name: 'Speed of Light', symbol: 'c', value: '3×10⁸ m/s' },
  { name: 'Coulomb Constant', symbol: 'k', value: '8.99×10⁹ N·m²/C²' },
  { name: 'Planck Constant', symbol: 'h', value: '6.626×10⁻³⁴ J·s' },
  { name: 'Gas Constant', symbol: 'R', value: '8.314 J/(mol·K)' },
  { name: 'Gravitational Constant', symbol: 'G', value: '6.674×10⁻¹¹ N·m²/kg²' },
]

export default function FormulasPage() {
  return (
    <div className="min-h-screen pt-20 pb-16" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div className="mx-auto max-w-6xl px-4">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <PageHeader
          eyebrow="Reference"
          title="Formula"
          accent="Sheet"
          subtitle="A curated reference for the core physics equations you'll encounter across the simulator."
          stats={[
            { value: Object.keys(FORMULAS_BY_TOPIC).length, label: 'topics' },
            { value: Object.values(FORMULAS_BY_TOPIC).flat().length, label: 'formulas' },
            { value: CONSTANTS.length, label: 'constants' },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Object.entries(FORMULAS_BY_TOPIC).map(([topic, formulas]) => (
            <section
              key={topic}
              className="rounded-2xl border p-5 transition-colors"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                <Zap className="h-4 w-4 text-cyan-400" />
                {topic}
              </h2>

              <div className="space-y-3">
                {formulas.map((formula) => (
                  <div
                    key={formula.name}
                    className="rounded-xl border p-3"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}
                  >
                    <h3 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {formula.name}
                    </h3>
                    <div
                      className="mt-2 rounded-md px-3 py-2 font-mono text-sm"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      {formula.formula}
                    </div>
                    <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {formula.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section
          className="mt-8 rounded-2xl border p-5"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--color-text)' }}>
            Physical Constants
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {CONSTANTS.map((c) => (
              <div
                key={c.symbol}
                className="rounded-xl border p-3"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}
              >
                <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  {c.name}
                </p>
                <p className="mt-1 font-mono text-lg font-semibold" style={{ color: 'var(--color-accent)' }}>
                  {c.symbol}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                  {c.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 flex justify-center">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
          >
            <BookOpen className="h-4 w-4" />
            Try an interactive simulation
          </Link>
        </div>
      </div>
    </div>
  )
}
