import { Code2, BookOpen, Plus, Minus, Circle, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

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

export default function FormulasPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f1e] via-[#111827] to-[#0a0f1e] pt-20 pb-16">
      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 mb-12">
        <Link to="/" className="mb-8 inline-flex items-center text-[#22d3ee] hover:text-white transition-colors">
          <Code2 className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
        
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center">
            <BookOpen className="mr-4 h-10 w-10 text-[#22d3ee]" />
            Physics Formulas Reference
          </h1>
          <p className="text-lg text-[var(--color-text-muted)]">
            Complete collection of physics formulas organized by topic
          </p>
        </div>
      </div>

      {/* Formulas Grid */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.entries(FORMULAS_BY_TOPIC).map(([topic, formulas]) => (
            <div
              key={topic}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur p-6 hover:border-[#22d3ee]/30 transition-colors"
            >
              {/* Topic Header */}
              <h2 className="text-xl font-bold text-[#22d3ee] mb-6 flex items-center">
                <Zap className="mr-2 h-5 w-5" />
                {topic}
              </h2>

              {/* Formulas List */}
              <div className="space-y-4">
                {formulas.map((formula, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-[var(--color-border)]/50 border border-[var(--color-border)] hover:border-[#22d3ee]/20 transition-all"
                  >
                    <h3 className="text-sm font-semibold text-white mb-2">
                      {formula.name}
                    </h3>
                    <div className="bg-[var(--color-bg)] p-3 rounded border border-[var(--color-border)] mb-2 font-mono text-sm text-[#4ade80]">
                      {formula.formula}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formula.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Constants Section */}
      <div className="mx-auto max-w-6xl px-4 mt-12">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur p-6">
          <h2 className="text-2xl font-bold text-[#22d3ee] mb-6">Physical Constants</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: 'Gravity', symbol: 'g', value: '9.81 m/s²' },
              { name: 'Speed of Light', symbol: 'c', value: '3×10⁸ m/s' },
              { name: 'Coulomb Constant', symbol: 'k', value: '8.99×10⁹ N·m²/C²' },
              { name: 'Planck Constant', symbol: 'h', value: '6.626×10⁻³⁴ J·s' },
              { name: 'Gas Constant', symbol: 'R', value: '8.314 J/(mol·K)' },
              { name: 'Gravitational Constant', symbol: 'G', value: '6.674×10⁻¹¹ N·m²/kg²' },
            ].map((constant) => (
              <div
                key={constant.symbol}
                className="p-4 rounded-lg bg-[var(--color-border)]/50 border border-[var(--color-border)]"
              >
                <p className="text-xs text-[var(--color-text-muted)] mb-1">{constant.name}</p>
                <p className="font-mono text-sm text-[#4ade80] mb-1">
                  {constant.symbol}
                </p>
                <p className="text-sm text-white font-semibold">{constant.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto max-w-6xl px-4 mt-12 text-center">
        <Link
          to="/app"
          className="inline-flex items-center justify-center rounded-lg border border-[#22d3ee] bg-gradient-to-r from-[#22d3ee] to-[#06b6d4] px-8 py-3 font-semibold text-[#0b0f17] hover:shadow-lg hover:shadow-[#22d3ee]/25 transition-all"
        >
          <Code2 className="mr-2 h-5 w-5" />
          Try an Interactive Simulation
        </Link>
      </div>
    </div>
  )
}
