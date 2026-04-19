import { useMemo } from 'react'
import {
  SIMULATION_DISPLAY_NAMES,
  SIMULATION_ICONS,
  SIMULATION_CATEGORIES,
  SIMULATION_COLORS,
} from '../hooks/useSimulation'

const SIMULATION_THUMBNAILS = {
  inclined_plane: {
    description: 'Objects sliding down inclined surfaces with friction',
    icon: '📐',
  },
  projectile: {
    description: 'Ballistic trajectories under gravity',
    icon: '🎯',
  },
  pendulum: {
    description: 'Simple harmonic motion with damping',
    icon: '⏱️',
  },
  spring_mass: {
    description: 'Hooke\'s law and spring oscillations',
    icon: '🔄',
  },
  circular_motion: {
    description: 'Centripetal force and orbital dynamics',
    icon: '🔵',
  },
  collisions: {
    description: 'Elastic and inelastic collisions',
    icon: '💥',
  },
  wave_motion: {
    description: 'Transverse, longitudinal, and standing waves',
    icon: '🌊',
  },
  rotational_mechanics: {
    description: 'Torque, angular momentum, and moment of inertia',
    icon: '⚙️',
  },
  orbital: {
    description: 'Gravitational orbits and escape velocity',
    icon: '🪐',
  },
  buoyancy: {
    description: 'Archimedes principle and Bernoulli effect',
    icon: '🫧',
  },
  ideal_gas: {
    description: 'Maxwell-Boltzmann distribution and PV diagrams',
    icon: '🌡️',
  },
  electric_field: {
    description: 'Coulomb force and equipotential lines',
    icon: '⚡',
  },
  optics_lens: {
    description: 'Lens equations and ray diagrams',
    icon: '🔍',
  },
  optics_mirror: {
    description: 'Mirror reflections and image formation',
    icon: '🪞',
  },
  radioactive_decay: {
    description: 'Exponential decay and half-life',
    icon: '☢️',
  },
  electromagnetic: {
    description: 'Lorentz force and magnetic fields',
    icon: '🧲',
  },
}

function SimulationCard({ type, onClick }) {
  const info = SIMULATION_THUMBNAILS[type] || {}
  const color = SIMULATION_COLORS[type] || '#00f5ff'
  const icon = SIMULATION_ICONS[type] || '⚛️'

  return (
    <button
      onClick={() => onClick(type)}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 text-left transition-all hover:border-white/20 hover:shadow-lg hover:shadow-[#00f5ff]/10"
    >
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-5"
        style={{ background: `radial-gradient(circle at center, ${color}, transparent)` }}
      />

      <div className="mb-3 flex items-center justify-between">
        <span className="text-3xl">{icon}</span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20"
          style={{ backgroundColor: `${color}20` }}
        >
          <svg
            className="h-4 w-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      <h3 className="mb-1 font-heading text-sm font-semibold text-white">
        {SIMULATION_DISPLAY_NAMES[type] || type}
      </h3>

      <p className="text-xs leading-relaxed text-slate-500">
        {info.description || 'Physics simulation'}
      </p>

      <div
        className="absolute bottom-0 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full"
        style={{ backgroundColor: color }}
      />
    </button>
  )
}

export default function PhysicsLibrary({ isOpen, onClose, onSelectSimulation }) {
  const categories = useMemo(() => {
    return Object.entries(SIMULATION_CATEGORIES).map(([category, types]) => ({
      name: category,
      types,
    }))
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-[#1a1a2e] to-[#0d1117] shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[var(--color-bg)]/95 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold text-white">
                Physics Library
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Choose a simulation to explore
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(SIMULATION_CATEGORIES).map(([category, types]) => (
              <span
                key={category}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono-display text-[10px] uppercase tracking-wider text-slate-400"
              >
                {category} ({types.length})
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          <div className="space-y-8">
            {categories.map(({ name: category, types }) => (
              <div key={category}>
                <h3 className="mb-4 flex items-center gap-2 font-mono-display text-xs uppercase tracking-wider text-slate-400">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                  {category}
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                </h3>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {types.map(type => (
                    <SimulationCard
                      key={type}
                      type={type}
                      onClick={onSelectSimulation}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-white/10 bg-[var(--color-bg)]/95 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {Object.values(SIMULATION_CATEGORIES).flat().length} simulations available
            </p>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-mono-display text-xs text-slate-300 transition-all hover:border-white/20 hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
