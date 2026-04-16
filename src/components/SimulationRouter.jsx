import { Suspense, lazy, useMemo } from 'react'
import { SUPPORTED_SIMULATION_TYPES, SIMULATION_DISPLAY_NAMES } from '../hooks/useSimulation'

const InclinedPlane = lazy(() => import('../simulations/InclinedPlane'))
const ProjectileMotion = lazy(() => import('../simulations/ProjectileMotion'))
const Pendulum = lazy(() => import('../simulations/Pendulum'))
const SpringMass = lazy(() => import('../simulations/SpringMass'))
const CircularMotion = lazy(() => import('../simulations/CircularMotion'))
const Collisions = lazy(() => import('../simulations/Collisions'))
const WaveMotion = lazy(() => import('../simulations/WaveMotion'))
const RotationalMechanics = lazy(() => import('../simulations/RotationalMechanics'))
const GravitationalOrbits = lazy(() => import('../simulations/GravitationalOrbits'))
const FluidMechanics = lazy(() => import('../simulations/FluidMechanics'))
const Thermodynamics = lazy(() => import('../simulations/Thermodynamics'))
const ElectricFields = lazy(() => import('../simulations/ElectricFields'))
const Optics = lazy(() => import('../simulations/Optics'))
const RadioactiveDecay = lazy(() => import('../simulations/RadioactiveDecay'))
const MagneticFields = lazy(() => import('../simulations/MagneticFields'))

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
        Loading Simulation
      </h3>
      <p className="text-sm text-slate-400">Setting up physics engine...</p>
    </div>
  )
}

export default function SimulationRouter({
  parsedData,
  simulationType,
  variables,
  isPlaying,
  simulationKey,
  onDataPoint,
  isLoading,
  particleMultiplier = 1,
  accentColor = '#00f5ff',
}) {
  console.log('Simulation type:', parsedData?.type)

  const resolvedSimulationType = parsedData?.type ?? simulationType
  const resolvedVariables = variables ?? parsedData?.variables

  const simulationProps = useMemo(() => {
    if (!resolvedVariables) return {}

    switch (resolvedSimulationType) {
      case 'inclined_plane':
        return {
          mass: resolvedVariables.mass ?? 10,
          angle: resolvedVariables.angle ?? 30,
          friction: resolvedVariables.friction ?? 0,
          isPlaying,
        }

      case 'projectile':
        return {
          initialVelocity: resolvedVariables.velocity ?? resolvedVariables.initialVelocity ?? 30,
          launchAngle: resolvedVariables.angle ?? 45,
          height: resolvedVariables.height ?? 2,
          isPlaying,
        }

      case 'pendulum':
        return {
          length: resolvedVariables.length ?? 2,
          mass: resolvedVariables.mass ?? 1,
          initialAngle: resolvedVariables.angle ?? 30,
          damping: resolvedVariables.damping ?? 0,
          isPlaying,
        }

      case 'spring_mass':
        return {
          springConstant: resolvedVariables.springConstant ?? resolvedVariables.k ?? 50,
          mass: resolvedVariables.mass ?? 2,
          initialDisplacement: resolvedVariables.displacement ?? resolvedVariables.initialDisplacement ?? 0.5,
          damping: resolvedVariables.damping ?? 0,
          isPlaying,
        }

      case 'circular_motion':
        return {
          radius: resolvedVariables.radius ?? 2,
          mass: resolvedVariables.mass ?? 1,
          angularVelocity: resolvedVariables.angularVelocity ?? resolvedVariables.omega ?? 2,
          isPlaying,
        }

      case 'collisions':
        return {
          mass1: resolvedVariables.mass1 ?? 1,
          mass2: resolvedVariables.mass2 ?? 1,
          velocity1: resolvedVariables.velocity1 ?? 5,
          velocity2: resolvedVariables.velocity2 ?? -5,
          collisionType: resolvedVariables.collisionType ?? 'elastic',
          isPlaying,
        }

      case 'wave_motion':
        return {
          amplitude: resolvedVariables.amplitude ?? 0.5,
          frequency: resolvedVariables.frequency ?? 1,
          wavelength: resolvedVariables.wavelength ?? 2,
          waveType: resolvedVariables.waveType ?? 'transverse',
          isPlaying,
        }

      case 'rotational_mechanics':
        return {
          objectType: resolvedVariables.objectType ?? 'disk',
          mass: resolvedVariables.mass ?? 2,
          radius: resolvedVariables.radius ?? 1,
          appliedForce: resolvedVariables.force ?? resolvedVariables.appliedForce ?? 10,
          forcePosition: resolvedVariables.forcePosition ?? 90,
          isPlaying,
        }

      case 'orbital':
        return {
          centralMass: resolvedVariables.centralMass ?? 100,
          orbitingMass: resolvedVariables.orbitingMass ?? 1,
          initialDistance: resolvedVariables.distance ?? resolvedVariables.initialDistance ?? 5,
          initialVelocity: resolvedVariables.velocity ?? resolvedVariables.initialVelocity ?? 1,
          isPlaying,
        }

      case 'buoyancy':
        return {
          fluidDensity: resolvedVariables.fluidDensity ?? 1000,
          objectDensity: resolvedVariables.objectDensity ?? 800,
          objectVolume: resolvedVariables.volume ?? 0.125,
          objectShape: resolvedVariables.objectShape ?? 'sphere',
          isPlaying,
        }

      case 'ideal_gas':
        return {
          numParticles: resolvedVariables.numParticles ?? 50,
          temperature: resolvedVariables.temperature ?? 300,
          volume: resolvedVariables.volume ?? 8,
          isPlaying,
        }

      case 'electric_field':
        return {
          charges: resolvedVariables.charges ?? [{ x: -1, y: 0, q: 1e-6 }, { x: 1, y: 0, q: -1e-6 }],
          isPlaying,
        }

      case 'optics_lens':
        return {
          lensType: resolvedVariables.lensType ?? 'convex',
          focalLength: resolvedVariables.focalLength ?? 2,
          objectDistance: resolvedVariables.objectDistance ?? 4,
          objectHeight: resolvedVariables.objectHeight ?? 1,
          isPlaying,
        }

      case 'optics_mirror':
        return {
          lensType: 'mirror',
          focalLength: resolvedVariables.focalLength ?? 2,
          objectDistance: resolvedVariables.objectDistance ?? 4,
          objectHeight: resolvedVariables.objectHeight ?? 1,
          isPlaying,
        }

      case 'radioactive_decay':
        return {
          initialAtoms: resolvedVariables.initialAtoms ?? 100,
          halfLife: resolvedVariables.halfLife ?? 5,
          decayType: resolvedVariables.decayType ?? 'alpha',
          isPlaying,
        }

      case 'electromagnetic':
        return {
          charge: resolvedVariables.charge ?? 1.6e-19,
          velocity: resolvedVariables.velocity ?? 1e6,
          magneticField: resolvedVariables.magneticField ?? 0.5,
          electricField: resolvedVariables.electricField ?? 0,
          isPlaying,
        }

      default:
        return {}
    }
  }, [resolvedSimulationType, resolvedVariables, isPlaying])

  if (isLoading) {
    return <LoadingSimulation />
  }

  if (!parsedData || !parsedData.type) {
    return <div style={{ color: 'red' }}>No simulation data available</div>
  }

  if (!SUPPORTED_SIMULATION_TYPES.includes(resolvedSimulationType)) {
    return <SimulationNotSupported simulationType={resolvedSimulationType} />
  }

  const commonProps = {
    key: simulationKey,
    onDataPoint,
    particleMultiplier,
    accentColor,
  }

  const renderSimulation = () => {
    switch (resolvedSimulationType) {
      case 'inclined_plane':
        return <InclinedPlane {...simulationProps} {...commonProps} />
      case 'projectile':
        return <ProjectileMotion {...simulationProps} {...commonProps} />
      case 'pendulum':
        return <Pendulum {...simulationProps} {...commonProps} />
      case 'spring_mass':
        return <SpringMass {...simulationProps} {...commonProps} />
      case 'circular_motion':
        return <CircularMotion {...simulationProps} {...commonProps} />
      case 'collisions':
        return <Collisions {...simulationProps} {...commonProps} />
      case 'wave_motion':
        return <WaveMotion {...simulationProps} {...commonProps} />
      case 'rotational_mechanics':
        return <RotationalMechanics {...simulationProps} {...commonProps} />
      case 'orbital':
        return <GravitationalOrbits {...simulationProps} {...commonProps} />
      case 'buoyancy':
        return <FluidMechanics {...simulationProps} {...commonProps} />
      case 'ideal_gas':
        return <Thermodynamics {...simulationProps} {...commonProps} />
      case 'electric_field':
        return <ElectricFields {...simulationProps} {...commonProps} />
      case 'optics_lens':
      case 'optics_mirror':
        return <Optics {...simulationProps} {...commonProps} />
      case 'radioactive_decay':
        return <RadioactiveDecay {...simulationProps} {...commonProps} />
      case 'electromagnetic':
        return <MagneticFields {...simulationProps} {...commonProps} />
      default:
        return <SimulationNotSupported simulationType={resolvedSimulationType} />
    }
  }

  return (
    <div className="relative h-full">
      <div style={{ position: 'absolute', top: 10, left: 10 }}>
        Active Simulation: {resolvedSimulationType}
      </div>
      <Suspense fallback={<LoadingSimulation />}>
        {renderSimulation()}
      </Suspense>
    </div>
  )
}

SimulationRouter.SUPPORTED_TYPES = SUPPORTED_SIMULATION_TYPES
SimulationRouter.DISPLAY_NAMES = SIMULATION_DISPLAY_NAMES
