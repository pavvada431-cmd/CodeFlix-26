import { useState, useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const SIMULATION_FORMULAS = {
  'Inclined Plane': [
    { name: 'Component of Weight', formula: 'W_{\\parallel} = mg\\sin\\theta' },
    { name: 'Normal Force', formula: 'N = mg\\cos\\theta' },
    { name: 'Acceleration', formula: 'a = g(\\sin\\theta - \\mu\\cos\\theta)' },
    { name: 'Friction Force', formula: 'f = \\mu N = \\mu mg\\cos\\theta' },
  ],
  'Projectile Motion': [
    { name: 'Horizontal Range', formula: 'R = \\frac{v_0^2\\sin(2\\theta)}{g}' },
    { name: 'Max Height', formula: 'H = \\frac{v_0^2\\sin^2\\theta}{2g}' },
    { name: 'Time of Flight', formula: 'T = \\frac{2v_0\\sin\\theta}{g}' },
    { name: 'Position x(t)', formula: 'x = v_0\\cos\\theta \\cdot t' },
    { name: 'Position y(t)', formula: 'y = v_0\\sin\\theta \\cdot t - \\frac{1}{2}gt^2' },
  ],
  'Simple Pendulum': [
    { name: 'Period', formula: 'T = 2\\pi\\sqrt{\\frac{L}{g}}' },
    { name: 'Angular Frequency', formula: '\\omega = \\sqrt{\\frac{g}{L}}' },
    { name: 'Velocity', formula: 'v = \\sqrt{2gL(\\cos\\theta - \\cos\\theta_0)}' },
    { name: 'PE', formula: 'PE = mgh = mgL(1 - \\cos\\theta)' },
  ],
  'Spring-Mass System': [
    { name: 'Hooke\'s Law', formula: 'F = -kx' },
    { name: 'Period', formula: 'T = 2\\pi\\sqrt{\\frac{m}{k}}' },
    { name: 'Angular Frequency', formula: '\\omega = \\sqrt{\\frac{k}{m}}' },
    { name: 'PE (Spring)', formula: 'PE = \\frac{1}{2}kx^2' },
    { name: 'Damped Oscillation', formula: 'x = A_0e^{-\\beta t}\\cos(\\omega t + \\phi)' },
  ],
  'Circular Motion': [
    { name: 'Centripetal Force', formula: 'F_c = \\frac{mv^2}{r} = m\\omega^2r' },
    { name: 'Centripetal Accel', formula: 'a_c = \\frac{v^2}{r} = \\omega^2r' },
    { name: 'Tangential Speed', formula: 'v = \\omega r' },
    { name: 'Period', formula: 'T = \\frac{2\\pi r}{v} = \\frac{2\\pi}{\\omega}' },
    { name: 'Conical Pendulum', formula: '\\tan\\theta = \\frac{v^2}{rg}' },
  ],
  'Collisions': [
    { name: 'Momentum', formula: 'p = mv' },
    { name: 'Elastic Collision', formula: 'v_1\' = \\frac{(m_1-m_2)v_1 + 2m_2v_2}{m_1+m_2}' },
    { name: 'KE Conservation (elastic)', formula: '\\frac{1}{2}m_1v_1^2 + \\frac{1}{2}m_2v_2^2 = const' },
    { name: 'Coefficient of Restitution', formula: 'e = \\frac{v_2\' - v_1\'}{v_1 - v_2}' },
  ],
  'Wave Motion': [
    { name: 'Wave Equation', formula: 'y = A\\sin(kx - \\omega t + \\phi)' },
    { name: 'Wave Speed', formula: 'v = f\\lambda = \\frac{\\omega}{k}' },
    { name: 'Wave Number', formula: 'k = \\frac{2\\pi}{\\lambda}' },
    { name: 'Angular Frequency', formula: '\\omega = 2\\pi f' },
    { name: 'Standing Wave', formula: 'y = 2A\\sin(kx)\\cos(\\omega t)' },
  ],
  'Rotational Mechanics': [
    { name: 'Torque', formula: '\\tau = r \\times F = rF\\sin\\theta' },
    { name: 'Moment of Inertia (disk)', formula: 'I = \\frac{1}{2}MR^2' },
    { name: 'Angular Momentum', formula: 'L = I\\omega' },
    { name: 'Rotational KE', formula: 'KE_{rot} = \\frac{1}{2}I\\omega^2' },
    { name: 'Angular Acceleration', formula: '\\alpha = \\frac{\\tau_{net}}{I}' },
  ],
  'Gravitational Orbits': [
    { name: 'Gravitational Force', formula: 'F = G\\frac{Mm}{r^2}' },
    { name: 'Orbital Velocity', formula: 'v = \\sqrt{\\frac{GM}{r}}' },
    { name: 'Escape Velocity', formula: 'v_e = \\sqrt{\\frac{2GM}{r}}' },
    { name: 'Orbital Period', formula: 'T = 2\\pi\\sqrt{\\frac{r^3}{GM}}' },
    { name: 'Kepler\'s 3rd Law', formula: 'T^2 \\propto r^3' },
  ],
  'Buoyancy & Fluids': [
    { name: 'Archimedes\' Principle', formula: 'F_b = \\rho_{fluid}V_{displaced}g' },
    { name: 'Buoyant Force', formula: 'F_b = (\\rho_{fluid} - \\rho_{object})Vg' },
    { name: 'Bernoulli\'s Equation', formula: 'P + \\frac{1}{2}\\rho v^2 + \\rho gh = const' },
    { name: 'Continuity Equation', formula: 'A_1v_1 = A_2v_2' },
    { name: 'Pressure', formula: 'P = \\frac{F}{A}' },
  ],
  'Thermodynamics': [
    { name: 'Ideal Gas Law', formula: 'PV = nRT' },
    { name: 'Internal Energy (mono)', formula: 'U = \\frac{3}{2}nRT' },
    { name: 'First Law', formula: '\\Delta U = Q - W' },
    { name: 'Heat Transfer', formula: 'Q = mc\\Delta T' },
    { name: 'Efficiency (Carnot)', formula: '\\eta = 1 - \\frac{T_C}{T_H}' },
  ],
  'Electric Fields': [
    { name: 'Coulomb\'s Law', formula: 'F = k\\frac{q_1q_2}{r^2}' },
    { name: 'Electric Field', formula: 'E = \\frac{F}{q} = k\\frac{Q}{r^2}' },
    { name: 'Field Potential', formula: 'V = k\\frac{Q}{r}' },
    { name: 'Capacitance', formula: 'C = \\frac{Q}{V}' },
    { name: 'Capacitor Energy', formula: 'U = \\frac{1}{2}CV^2 = \\frac{Q^2}{2C}' },
  ],
  'Optics': [
    { name: 'Lens Equation', formula: '\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i}' },
    { name: 'Magnification', formula: 'm = -\\frac{d_i}{d_o} = \\frac{h_i}{h_o}' },
    { name: 'Snell\'s Law', formula: 'n_1\\sin\\theta_1 = n_2\\sin\\theta_2' },
    { name: 'Critical Angle', formula: '\\sin\\theta_c = \\frac{n_2}{n_1}' },
    { name: 'Mirror Equation', formula: '\\frac{1}{f} = \\frac{1}{d_o} + \\frac{1}{d_i}' },
  ],
  'Radioactive Decay': [
    { name: 'Decay Law', formula: 'N = N_0 e^{-\\lambda t}' },
    { name: 'Half-Life', formula: 't_{1/2} = \\frac{\\ln 2}{\\lambda}' },
    { name: 'Activity', formula: 'A = \\lambda N = A_0 e^{-\\lambda t}' },
    { name: 'Mean Lifetime', formula: '\\tau = \\frac{1}{\\lambda}' },
  ],
  'Magnetic Fields': [
    { name: 'Lorentz Force', formula: 'F = qvB\\sin\\theta' },
    { name: 'Radius (circular)', formula: 'r = \\frac{mv}{qB}' },
    { name: 'Period (cyclotron)', formula: 'T = \\frac{2\\pi m}{qB}' },
    { name: 'Magnetic Field (wire)', formula: 'B = \\frac{\\mu_0 I}{2\\pi r}' },
    { name: 'Force on Wire', formula: 'F = BIL\\sin\\theta' },
  ],
}

function FormulaCard({ name, formula, color }) {
  const renderedFormula = useMemo(() => {
    try {
      return katex.renderToString(formula, {
        throwOnError: false,
        displayMode: true,
      })
    } catch {
      return `<span style="color: #ff4444">${formula}</span>`
    }
  }, [formula])

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="mb-2 font-mono-display text-xs text-slate-400">{name}</div>
      <div 
        className="formula-content text-lg"
        dangerouslySetInnerHTML={{ __html: renderedFormula }}
        style={{ color }}
      />
    </div>
  )
}

export default function FormulaSheet({ isOpen, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('All')
  
  const categories = ['All', ...Object.keys(SIMULATION_FORMULAS)]
  
  const filteredFormulas = useMemo(() => {
    if (selectedCategory === 'All') {
      return SIMULATION_FORMULAS
    }
    return { [selectedCategory]: SIMULATION_FORMULAS[selectedCategory] }
  }, [selectedCategory])

  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 z-50 h-full w-[480px] overflow-hidden border-l border-white/10 bg-[#0a0f1e] shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <h2 className="font-heading text-xl font-semibold text-white">
              Physics Formula Sheet
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/20 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="border-b border-white/10 p-4">
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full border px-3 py-1 font-mono-display text-xs transition ${
                    selectedCategory === cat
                      ? 'border-[rgba(0,245,255,0.5)] bg-[rgba(0,245,255,0.2)] text-[#00f5ff]'
                      : 'border-white/20 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {Object.entries(filteredFormulas).map(([category, formulas]) => (
                <div key={category}>
                  <h3 className="mb-3 font-heading text-lg font-semibold text-white">
                    {category}
                  </h3>
                  <div className="grid gap-3">
                    {formulas.map((f, i) => (
                      <FormulaCard 
                        key={i} 
                        name={f.name} 
                        formula={f.formula}
                        color="#00f5ff"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{Object.values(SIMULATION_FORMULAS).flat().length} formulas</span>
              <span>{Object.keys(SIMULATION_FORMULAS).length} topics</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
