import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { SUPPORTED_SIMULATION_TYPES, SIMULATION_DISPLAY_NAMES } from '../hooks/useSimulation'
import { MultiConceptProblemHandler, MultiConceptExecutor } from '../engine/multiConceptProblem'
import { SimulationErrorBoundary } from './SimulationErrorBoundary'
import { SimulationError } from './SimulationError'

const InclinedPlane = lazy(() => import(/* webpackChunkName: "sim-inclined-plane" */ '../simulations/InclinedPlane2D'))
const ProjectileMotion = lazy(() => import(/* webpackChunkName: "sim-projectile-motion" */ '../simulations/ProjectileMotion2D'))
const Pendulum = lazy(() => import(/* webpackChunkName: "sim-pendulum" */ '../simulations/Pendulum2D'))
const SpringMass = lazy(() => import(/* webpackChunkName: "sim-spring-mass" */ '../simulations/SpringMass2D'))
const CircularMotion = lazy(() => import(/* webpackChunkName: "sim-circular-motion" */ '../simulations/CircularMotion2D'))
const Collisions = lazy(() => import(/* webpackChunkName: "sim-collisions" */ '../simulations/Collisions2D'))
const WaveMotion = lazy(() => import(/* webpackChunkName: "sim-wave-motion" */ '../simulations/WaveMotion2D'))
const RotationalMechanics = lazy(() => import(/* webpackChunkName: "sim-rotational-mechanics" */ '../simulations/RotationalMechanics2D'))
const GravitationalOrbits = lazy(() => import(/* webpackChunkName: "sim-gravitational-orbits" */ '../simulations/GravitationalOrbits2D'))
const FluidMechanics = lazy(() => import(/* webpackChunkName: "sim-fluid-mechanics" */ '../simulations/FluidMechanics2D'))
const Thermodynamics = lazy(() => import(/* webpackChunkName: "sim-thermodynamics" */ '../simulations/Thermodynamics2D'))
const ElectricFields = lazy(() => import(/* webpackChunkName: "sim-electric-fields" */ '../simulations/ElectricFields2D'))
const Optics = lazy(() => import(/* webpackChunkName: "sim-optics" */ '../simulations/Optics2D'))
const RadioactiveDecay = lazy(() => import(/* webpackChunkName: "sim-radioactive-decay" */ '../simulations/RadioactiveDecay2D'))
const MagneticFields = lazy(() => import(/* webpackChunkName: "sim-magnetic-fields" */ '../simulations/MagneticFields2D'))
const OrganicChemistry = lazy(() => import(/* webpackChunkName: "sim-organic-chemistry" */ '../simulations/OrganicChemistry2D'))
const Stoichiometry = lazy(() => import(/* webpackChunkName: "sim-stoichiometry" */ '../simulations/Stoichiometry2D'))
const Titration = lazy(() => import(/* webpackChunkName: "sim-titration" */ '../simulations/Titration2D'))
const AtomicStructure = lazy(() => import(/* webpackChunkName: "sim-atomic-structure" */ '../simulations/AtomicStructure2D'))
const GasLaws = lazy(() => import(/* webpackChunkName: "sim-gas-laws" */ '../simulations/GasLaws2D'))
const ChemicalBonding = lazy(() => import(/* webpackChunkName: "sim-chemical-bonding" */ '../simulations/ChemicalBonding'))

function LoadingSimulation() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-white/10 bg-[var(--color-bg)]/80 p-8">
      <div className="relative mb-6 h-16 w-16">
        <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#00f5ff] border-opacity-50" />
        <div className="absolute inset-0 flex items-center justify-center rounded-full border border-[rgba(0,245,255,0.3)] bg-[rgba(0,245,255,0.1)]">
          <svg className="h-8 w-8 animate-spin text-[#00f5ff]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>
      <h3 className="mb-2 font-heading text-xl font-semibold text-white">Loading Simulation</h3>
      <p className="text-sm text-slate-400">Setting up physics engine...</p>
    </div>
  )
}

function SimulationNotSupported({ simulationType }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-white/10 bg-[var(--color-bg)]/80 p-8 text-center">
      <h3 className="mb-2 font-heading text-2xl font-semibold text-white">Simulation Not Yet Supported</h3>
      <p className="mb-6 max-w-md text-sm text-slate-400">
        The problem type <span className="font-mono text-[#ff6b6b]">"{simulationType}"</span> is not currently available.
      </p>
      <div className="w-full max-w-sm rounded-[20px] border border-white/10 bg-[var(--color-bg)]/80 p-4">
        <p className="mb-3 font-mono-display text-xs uppercase tracking-[0.24em] text-slate-400">Currently Supported</p>
        <div className="space-y-2">
          {SUPPORTED_SIMULATION_TYPES.map((type) => (
            <div key={type} className="rounded-lg border border-[rgba(0,245,255,0.15)] bg-[rgba(0,245,255,0.05)] px-3 py-2 text-sm text-slate-200">
              {SIMULATION_DISPLAY_NAMES[type] || type}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function detectWebGLAvailability() {
  if (typeof document === 'undefined') return true
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2', { alpha: true }) ||
      canvas.getContext('webgl', { alpha: true }) ||
      canvas.getContext('experimental-webgl', { alpha: true })
    const isAvailable = Boolean(gl)

    const loseContext = gl?.getExtension?.('WEBGL_lose_context')
    loseContext?.loseContext?.()

    return isAvailable
  } catch {
    return false
  }
}

function WebGLUnavailable({ parsedData }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto rounded-[24px] border border-amber-400/20 bg-[var(--color-bg)]/80 p-8">
      <h3 className="mb-2 font-heading text-xl font-semibold text-white">WebGL Context Unavailable</h3>
      <p className="mb-6 max-w-md text-sm text-slate-400">
        Your browser could not create a stable 3D context right now. Here's the solution instead:
      </p>

      {/* Solution steps */}
      {parsedData?.steps && parsedData.steps.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-semibold text-cyan-400">Steps:</h4>
          <ol className="space-y-2">
            {parsedData.steps.map((step, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-slate-300">
                <span className="flex-shrink-0 font-semibold text-cyan-400">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Formula */}
      {parsedData?.formula && (
        <div className="mb-6">
          <h4 className="mb-2 text-sm font-semibold text-cyan-400">Formula:</h4>
          <code className="block overflow-x-auto rounded border border-cyan-400/30 bg-slate-900 p-3 text-xs text-cyan-300">
            {parsedData.formula}
          </code>
        </div>
      )}

      {/* Answer */}
      {parsedData?.answer && (
        <div className="rounded border border-green-400/30 bg-green-900/20 p-4">
          <h4 className="mb-2 text-sm font-semibold text-green-400">Answer:</h4>
          <div className="text-lg font-bold text-white">
            {parsedData.answer.value} {parsedData.answer.unit}
          </div>
          {parsedData.answer.explanation && (
            <p className="mt-2 text-xs text-green-300">{parsedData.answer.explanation}</p>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-500">
        Try closing other heavy tabs/apps and reloading.
      </p>
    </div>
  )
}

function toTelemetry(state, totalTime, stageIndex) {
  const position = state?.position || {}
  const velocity = state?.velocity || {}
  const metrics = state?.metrics || {}
  const payload = {
    t: totalTime,
    stageIndex,
    positionX: Number(position.x || 0),
    positionY: Number(position.y || 0),
    velocityX: Number(velocity.x || 0),
    velocityY: Number(velocity.y || 0),
    speed: Math.hypot(Number(velocity.x || 0), Number(velocity.y || 0)),
  }

  Object.entries(metrics).forEach(([key, value]) => {
    if (Number.isFinite(value)) {
      payload[key] = value
    }
  })

  return payload
}

function getSingleSimulationProps(simulationType, variables, isPlaying) {
  const resolvedVariables = variables || {}
  
  const safeNum = (value, fallback) => {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }
  
  const defaultProps = {
    isPlaying,
  }

  switch (simulationType) {
case 'inclined_plane':
        return {
          ...defaultProps,
          mass: safeNum(resolvedVariables.mass, 10),
          angle: safeNum(resolvedVariables.angle, 30),
          friction: safeNum(resolvedVariables.friction, 0),
        }
case 'projectile':
        return {
          ...defaultProps,
          initialVelocity: safeNum(resolvedVariables.velocity ?? resolvedVariables.initialVelocity, 30),
          launchAngle: safeNum(resolvedVariables.angle, 45),
          height: safeNum(resolvedVariables.height, 2),
        }
case 'pendulum':
        return {
          ...defaultProps,
          length: safeNum(resolvedVariables.length, 2),
          mass: safeNum(resolvedVariables.mass, 1),
          initialAngle: safeNum(resolvedVariables.angle, 30),
          damping: safeNum(resolvedVariables.damping, 0),
        }
case 'spring_mass':
        return {
          ...defaultProps,
          springConstant: safeNum(resolvedVariables.springConstant ?? resolvedVariables.k, 50),
          mass: safeNum(resolvedVariables.mass, 2),
          initialDisplacement: safeNum(resolvedVariables.displacement ?? resolvedVariables.initialDisplacement, 0.5),
          damping: safeNum(resolvedVariables.damping, 0),
        }
case 'circular_motion':
        return {
          ...defaultProps,
          radius: safeNum(resolvedVariables.radius, 2),
          mass: safeNum(resolvedVariables.mass, 1),
          angularVelocity: safeNum(resolvedVariables.angularVelocity ?? resolvedVariables.omega, 2),
        }
case 'collisions':
        return {
          ...defaultProps,
          mass1: safeNum(resolvedVariables.mass1, 1),
          mass2: safeNum(resolvedVariables.mass2, 1),
          velocity1: safeNum(resolvedVariables.velocity1, 5),
          velocity2: safeNum(resolvedVariables.velocity2, -5),
          collisionType: resolvedVariables.collisionType ?? 'elastic',
        }
case 'wave_motion':
        return {
          ...defaultProps,
          amplitude: safeNum(resolvedVariables.amplitude, 0.5),
          frequency: safeNum(resolvedVariables.frequency, 1),
          wavelength: safeNum(resolvedVariables.wavelength, 2),
          waveType: resolvedVariables.waveType ?? 'transverse',
        }
    case 'rotational_mechanics':
      return {
        ...defaultProps,
        objectType: resolvedVariables.objectType ?? 'disk',
        mass: resolvedVariables.mass ?? 2,
        radius: resolvedVariables.radius ?? 1,
        appliedForce: resolvedVariables.force ?? resolvedVariables.appliedForce ?? 10,
        forcePosition: resolvedVariables.forcePosition ?? 90,
      }
case 'orbital':
        return {
          ...defaultProps,
          centralMass: safeNum(resolvedVariables.centralMass, 100),
          orbitingMass: safeNum(resolvedVariables.orbitingMass, 1),
          initialDistance: safeNum(resolvedVariables.distance ?? resolvedVariables.initialDistance, 5),
          initialVelocity: safeNum(resolvedVariables.velocity ?? resolvedVariables.initialVelocity, 1),
        }
case 'buoyancy':
        return {
          ...defaultProps,
          fluidDensity: safeNum(resolvedVariables.fluidDensity, 1000),
          objectDensity: safeNum(resolvedVariables.objectDensity, 800),
          objectVolume: safeNum(resolvedVariables.volume, 0.125),
          objectShape: resolvedVariables.objectShape ?? 'sphere',
        }
case 'ideal_gas':
        return {
          ...defaultProps,
          numParticles: safeNum(resolvedVariables.numParticles, 50),
          temperature: safeNum(resolvedVariables.temperature, 300),
          volume: safeNum(resolvedVariables.volume, 8),
        }
case 'electric_field': {
        const charge1 = safeNum(resolvedVariables.charge1, 1e-6)
        const charge2 = safeNum(resolvedVariables.charge2, -1e-6)
        const distance = safeNum(resolvedVariables.distance, 2)
        return {
          ...defaultProps,
          charges: [
            { x: -(distance / 2), y: 0, q: charge1 },
            { x: distance / 2, y: 0, q: charge2 }
          ],
        }
      }
case 'optics_lens':
        return {
          ...defaultProps,
          lensType: resolvedVariables.lensType ?? 'convex',
          focalLength: safeNum(resolvedVariables.focalLength, 2),
          objectDistance: safeNum(resolvedVariables.objectDistance, 4),
          objectHeight: safeNum(resolvedVariables.objectHeight, 1),
        }
case 'optics_mirror':
        return {
          ...defaultProps,
          lensType: 'mirror',
          focalLength: safeNum(resolvedVariables.focalLength, 2),
          objectDistance: safeNum(resolvedVariables.objectDistance, 4),
          objectHeight: safeNum(resolvedVariables.objectHeight, 1),
        }
case 'radioactive_decay':
        return {
          ...defaultProps,
          initialAtoms: safeNum(resolvedVariables.initialAtoms, 100),
          halfLife: safeNum(resolvedVariables.halfLife, 5),
          decayType: resolvedVariables.decayType ?? 'alpha',
        }
case 'electromagnetic':
        return {
          ...defaultProps,
          charge: safeNum(resolvedVariables.charge, 1.6e-19),
          velocity: safeNum(resolvedVariables.velocity, 1e6),
          magneticField: safeNum(resolvedVariables.magneticField, 0.5),
          electricField: safeNum(resolvedVariables.electricField, 0),
        }
    case 'organic_chemistry':
      return {
        ...defaultProps,
        compound: resolvedVariables.compound ?? 'methane',
        reactionType: resolvedVariables.reactionType ?? 'combustion',
        variables: resolvedVariables,
      }
case 'stoichiometry':
        return {
          ...defaultProps,
          reaction: resolvedVariables.reaction ?? 'water_formation',
          reactantAmount: safeNum(resolvedVariables.reactantAmount, 4),
          secondaryAmount: safeNum(resolvedVariables.secondaryAmount, 3),
          variables: resolvedVariables,
        }
case 'titration':
        return {
          ...defaultProps,
          acidConcentration: safeNum(resolvedVariables.acidConcentration, 0.1),
          baseConcentration: safeNum(resolvedVariables.baseConcentration, 0.1),
          volume: safeNum(resolvedVariables.volume, 25),
          mode: resolvedVariables.mode ?? 'strong_acid_strong_base',
          variables: resolvedVariables,
        }
case 'atomic_structure':
        return {
          ...defaultProps,
          atomicNumber: safeNum(resolvedVariables.atomicNumber ?? resolvedVariables.protons, 8),
          mode: resolvedVariables.mode ?? 'bohr',
          variables: resolvedVariables,
        }
case 'gas_laws':
        return {
          ...defaultProps,
          pressure: safeNum(resolvedVariables.pressure, 1),
          volume: safeNum(resolvedVariables.volume, 12),
          temperature: safeNum(resolvedVariables.temperature, 300),
          moles: safeNum(resolvedVariables.moles ?? resolvedVariables.n, 1),
          mode: resolvedVariables.mode ?? 'boyle',
          variables: resolvedVariables,
        }
    case 'chemical_bonding':
      return {
        ...defaultProps,
        mode: resolvedVariables.mode ?? 'ionic',
        molecule: resolvedVariables.molecule ?? 'H2O',
        variables: resolvedVariables,
      }
    default:
      return {
        ...defaultProps,
        variables: resolvedVariables,
      }
  }
}

function renderSingleSimulation(simulationType, simulationProps, commonProps) {
  switch (simulationType) {
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
    case 'organic_chemistry':
      return <OrganicChemistry {...simulationProps} {...commonProps} />
    case 'stoichiometry':
      return <Stoichiometry {...simulationProps} {...commonProps} />
    case 'titration':
      return <Titration {...simulationProps} {...commonProps} />
    case 'atomic_structure':
      return <AtomicStructure {...simulationProps} {...commonProps} />
    case 'gas_laws':
      return <GasLaws {...simulationProps} {...commonProps} />
    case 'chemical_bonding':
      return <ChemicalBonding {...simulationProps} {...commonProps} />
    default:
      return <SimulationNotSupported simulationType={simulationType} />
  }
}

function mapStageTypeForRenderer(stageType) {
  if (stageType === 'spring_launch') return 'spring_mass'
  if (stageType === 'free_fall') return 'projectile'
  return stageType
}

function MultiConceptView({
  parsedData,
  isPlaying,
  simulationKey,
  onDataPoint,
  particleMultiplier,
  accentColor,
}) {
  const handlerRef = useRef(null)
  const executorRef = useRef(null)
  const lastEmitRef = useRef(-Infinity)
  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [pipelineInfo, setPipelineInfo] = useState(null)
  const [currentStageState, setCurrentStageState] = useState(null)
  const [pipelineError, setPipelineError] = useState(null)

  useEffect(() => {
    let isCancelled = false
    let resetTimeoutId = 0
    let pipelineErrorTimeoutId = 0
    let syncId = 0

    const clearTimeouts = () => {
      if (resetTimeoutId) clearTimeout(resetTimeoutId)
      if (pipelineErrorTimeoutId) clearTimeout(pipelineErrorTimeoutId)
      if (syncId) cancelAnimationFrame(syncId)
    }

    const runEffect = () => {
      try {
        const handler = new MultiConceptProblemHandler()
        handler.parseProblems(parsedData)
        const pipeline = handler.buildPipeline()
        handlerRef.current = handler
        
        // Reset state with timeout to avoid synchronous setState in effect
        resetTimeoutId = setTimeout(() => {
          if (!isCancelled) {
            setPipelineError(null)
            setPipelineInfo(handler.getPipelineInfo())
            setCurrentStageIndex(0)
            setProgress(0)
            setCurrentStageState(null)
          }
        }, 0)
        
        syncId = requestAnimationFrame(() => {
          // Additional sync if needed
        })

        pipeline.on('stageChange', ({ currentIndex }) => {
          if (!isCancelled) {
            setCurrentStageIndex(currentIndex)
            setProgress(pipeline.getProgress())
          }
        })

        pipeline.on('update', ({ stageIndex, totalElapsed, currentStage }) => {
          const state = currentStage?.getRenderState?.() || null
          if (!isCancelled) {
            setCurrentStageIndex(stageIndex)
            setProgress(pipeline.getProgress())
            setCurrentStageState(state)
            setPipelineInfo(handler.getPipelineInfo())
          }

          if (onDataPoint && totalElapsed - lastEmitRef.current >= 0.03) {
            onDataPoint(toTelemetry(state, totalElapsed, stageIndex))
            lastEmitRef.current = totalElapsed
          }
        })

        pipeline.on('complete', () => {
          if (!isCancelled) {
            pipelineErrorTimeoutId = setTimeout(() => {
              setProgress(1)
              setPipelineInfo(handler.getPipelineInfo())
            }, 0)
          }
        })

        const executor = new MultiConceptExecutor(pipeline)
        executorRef.current = executor

        // Initialize stage 1 even when paused.
        pipeline.start()
        pipeline.pause()
        requestAnimationFrame(() => {
          if (!isCancelled) setCurrentStageState(pipeline.getCurrentState().stageState)
        })

        return () => {
          clearTimeouts()
          cancelAnimationFrame(syncId)
          executor.stop()
        }
      } catch (err) {
        console.error('Failed to build multi-concept pipeline:', err)
        pipelineErrorTimeoutId = setTimeout(() => {
          if (!isCancelled) setPipelineError(err.message || 'Unknown error')
        }, 0)
      }
    }

    const innerCleanup = runEffect()

    return () => {
      isCancelled = true
      if (innerCleanup) {
        innerCleanup()
      } else {
        clearTimeouts()
      }
    }
  }, [onDataPoint, parsedData, simulationKey])

  useEffect(() => {
    const executor = executorRef.current
    const pipeline = handlerRef.current?.pipeline
    if (!executor || !pipeline) return

    if (isPlaying) {
      if (pipeline.isComplete()) {
        pipeline.reset()
        pipeline.start()
      }
      executor.resume()
    } else {
      executor.pause()
    }
  }, [isPlaying])

  if (pipelineError) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-red-400/20 bg-[var(--color-bg)]/80 p-8 text-center">
        <h3 className="mb-2 font-heading text-xl font-semibold text-white">Pipeline Error</h3>
        <p className="mb-4 max-w-md text-sm text-slate-400">{pipelineError}</p>
        <p className="text-xs text-slate-500">Try a simpler single-concept problem, or refresh the page.</p>
      </div>
    )
  }

  if (!pipelineInfo || !Array.isArray(parsedData?.stages) || !parsedData.stages.length) {
    return <LoadingSimulation />
  }

  const activeStageConfig = parsedData.stages[currentStageIndex] || parsedData.stages[0]
  const activeStageType = activeStageConfig?.type || 'projectile'
  const rendererType = mapStageTypeForRenderer(activeStageType)
  const stageVariables = {
    ...(activeStageConfig?.variables || {}),
    ...(currentStageState?.variables || {}),
  }

  // Approximate free-fall renderer with vertical projectile visuals.
  if (activeStageType === 'free_fall') {
    stageVariables.velocity = stageVariables.initialVelocityY ?? 0
    stageVariables.angle = -90
    stageVariables.height = stageVariables.height ?? stageVariables.position?.y ?? 5
  }

  const simulationProps = getSingleSimulationProps(rendererType, stageVariables, isPlaying)
  const commonProps = {
    key: `multi-stage-${simulationKey}-${currentStageIndex}`,
    onDataPoint: undefined,
    particleMultiplier,
    accentColor,
  }

  return (
    <div className="relative h-full">
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 rounded-xl border border-white/15 bg-[#07111fcc] p-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            Multi-Concept Pipeline
          </div>
          <div className="text-xs text-slate-400">
            Stage {currentStageIndex + 1} / {pipelineInfo.stageCount}
          </div>
        </div>

        <div className="mb-3 h-1.5 w-full overflow-hidden rounded bg-white/10">
          <div
            className="h-full rounded bg-gradient-to-r from-cyan-400 to-violet-400 transition-all duration-300"
            style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
          />
        </div>

        <div className="pointer-events-auto flex flex-wrap gap-2">
          {pipelineInfo.stages.map((stage, index) => (
            <button
              key={`${stage.type}-${index}`}
              onClick={() => {
                executorRef.current?.jumpToStage(index)
                setCurrentStageIndex(index)
                setProgress(Math.max(0, Math.min(1, index / pipelineInfo.stageCount)))
              }}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                index === currentStageIndex
                  ? 'border-cyan-300 bg-cyan-400/20 text-cyan-200'
                  : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {index + 1}. {stage.type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="h-full pt-[92px]">
        <Suspense fallback={<LoadingSimulation />}>
          <SimulationErrorBoundary>
            {renderSingleSimulation(rendererType, simulationProps, commonProps)}
          </SimulationErrorBoundary>
        </Suspense>
      </div>
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
  const [webglAvailable] = useState(detectWebGLAvailability)
  const resolvedSimulationType = parsedData?.type ?? simulationType
  const resolvedVariables = variables ?? parsedData?.variables

  const simulationProps = useMemo(
    () => getSingleSimulationProps(resolvedSimulationType, resolvedVariables, isPlaying),
    [isPlaying, resolvedSimulationType, resolvedVariables],
  )

  if (isLoading) {
    return <LoadingSimulation />
  }

  if (!parsedData) {
    return <div style={{ color: 'red' }}>No simulation data available</div>
  }

  if (!webglAvailable) {
    return <WebGLUnavailable parsedData={parsedData} />
  }

  if (parsedData.isMultiConcept === true && Array.isArray(parsedData.stages) && parsedData.stages.length > 0) {
    return (
      <MultiConceptView
        parsedData={parsedData}
        isPlaying={isPlaying}
        simulationKey={simulationKey}
        onDataPoint={onDataPoint}
        particleMultiplier={particleMultiplier}
        accentColor={accentColor}
      />
    )
  }

  if (!resolvedSimulationType) {
    return <div style={{ color: 'red' }}>No simulation type available</div>
  }

  if (!SUPPORTED_SIMULATION_TYPES.includes(resolvedSimulationType)) {
    return <SimulationNotSupported simulationType={resolvedSimulationType} />
  }

  const commonProps = {
    onDataPoint,
    particleMultiplier,
    accentColor,
  }

  return (
    <div className="relative h-full">
      <Suspense fallback={<LoadingSimulation />}>
        <SimulationErrorBoundary>
          {renderSingleSimulation(resolvedSimulationType, simulationProps, commonProps)}
        </SimulationErrorBoundary>
      </Suspense>
    </div>
  )
}

SimulationRouter.SUPPORTED_TYPES = SUPPORTED_SIMULATION_TYPES
SimulationRouter.DISPLAY_NAMES = SIMULATION_DISPLAY_NAMES
