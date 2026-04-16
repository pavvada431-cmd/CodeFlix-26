import { useMemo } from 'react'
import InclinedPlane from '../simulations/InclinedPlane'
import ProjectileMotion from '../simulations/ProjectileMotion'
import Pendulum from '../simulations/Pendulum'
import SpringMass from '../simulations/SpringMass'
import { SUPPORTED_SIMULATION_TYPES, SIMULATION_DISPLAY_NAMES } from '../hooks/useSimulation'

function SimulationNotSupported({ simulationType }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-white/10 bg-[#07111f]/80 p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(255,107,107,0.3)] bg-[rgba(255,107,107,0.1)]">
        <svg
          className="h-8 w-8 text-[#ff6b6b]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="mb-2 font-heading text-2xl font-semibold text-white">
        Simulation Not Yet Supported
      </h3>

      <p className="mb-6 max-w-md text-sm text-slate-400">
        The problem type <span className="font-mono text-[#ff6b6b]">"{simulationType}"</span> is not
        currently available. We're working on adding more physics simulations.
      </p>

      <div className="w-full max-w-sm rounded-[20px] border border-white/10 bg-[#0b1324]/80 p-4">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-slate-400">
          Currently Supported
        </p>
        <div className="space-y-2">
          {SUPPORTED_SIMULATION_TYPES.map(type => (
            <div
              key={type}
              className="flex items-center gap-3 rounded-lg border border-[rgba(0,245,255,0.15)] bg-[rgba(0,245,255,0.05)] px-3 py-2"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(0,245,255,0.3)] bg-[rgba(0,245,255,0.1)]">
                <svg
                  className="h-3 w-3 text-[#00f5ff]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span className="text-sm text-slate-200">
                {SIMULATION_DISPLAY_NAMES[type] || type}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono-display text-xs text-slate-400">
        {SUPPORTED_SIMULATION_TYPES.length} of {Object.keys(SIMULATION_DISPLAY_NAMES).length} types available
      </div>
    </div>
  )
}

function LoadingSimulation() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-white/10 bg-[#07111f]/80 p-8">
      <div className="relative mb-6 h-16 w-16">
        <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#00f5ff] border-opacity-50" />
        <div className="absolute inset-0 flex items-center justify-center rounded-full border border-[rgba(0,245,255,0.3)] bg-[rgba(0,245,255,0.1)]">
          <svg
            className="h-8 w-8 animate-spin text-[#00f5ff]"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>
      <h3 className="mb-2 font-heading text-xl font-semibold text-white">
        Initializing Simulation
      </h3>
      <p className="text-sm text-slate-400">Setting up physics engine...</p>
    </div>
  )
}

function SimulationPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-white/20 bg-[#07111f]/60 p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <svg
          className="h-8 w-8 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      </div>
      <h3 className="mb-2 font-heading text-xl font-semibold text-white">
        No Simulation Loaded
      </h3>
      <p className="max-w-sm text-sm text-slate-400">
        Parse a physics problem to generate an interactive simulation
      </p>
    </div>
  )
}

export default function SimulationRouter({
  simulationType,
  variables,
  isPlaying,
  simulationKey,
  onDataPoint,
  isLoading,
}) {
  const simulationProps = useMemo(() => {
    if (!variables) return {}

    switch (simulationType) {
      case 'inclined_plane':
        return {
          mass: variables.mass ?? 10,
          angle: variables.angle ?? 30,
          friction: variables.friction ?? 0,
          isPlaying,
        }

      case 'projectile':
        return {
          initialVelocity: variables.velocity ?? variables.initialVelocity ?? 30,
          launchAngle: variables.angle ?? 45,
          height: variables.height ?? 2,
          isPlaying,
        }

      case 'pendulum':
        return {
          length: variables.length ?? 2,
          mass: variables.mass ?? 1,
          initialAngle: variables.angle ?? 30,
          damping: variables.damping ?? 0,
          isPlaying,
        }

      case 'spring_mass':
        return {
          springConstant: variables.springConstant ?? variables.k ?? 50,
          mass: variables.mass ?? 2,
          initialDisplacement: variables.displacement ?? variables.initialDisplacement ?? 0.5,
          damping: variables.damping ?? 0,
          isPlaying,
        }

      default:
        return {}
    }
  }, [simulationType, variables, isPlaying])

  if (isLoading) {
    return <LoadingSimulation />
  }

  if (!simulationType) {
    return <SimulationPlaceholder />
  }

  if (!SUPPORTED_SIMULATION_TYPES.includes(simulationType)) {
    return <SimulationNotSupported simulationType={simulationType} />
  }

  const commonProps = {
    key: simulationKey,
    onDataPoint: (simulationType === 'pendulum' || simulationType === 'spring_mass') ? onDataPoint : undefined,
  }

  switch (simulationType) {
    case 'inclined_plane':
      return <InclinedPlane {...simulationProps} {...commonProps} />

    case 'projectile':
      return <ProjectileMotion {...simulationProps} {...commonProps} />

    case 'pendulum':
      return <Pendulum {...simulationProps} {...commonProps} />

    case 'spring_mass':
      return <SpringMass {...simulationProps} {...commonProps} />

    default:
      return <SimulationNotSupported simulationType={simulationType} />
  }
}

SimulationRouter.SUPPORTED_TYPES = SUPPORTED_SIMULATION_TYPES
SimulationRouter.DISPLAY_NAMES = SIMULATION_DISPLAY_NAMES
