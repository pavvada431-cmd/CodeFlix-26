import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { SUPPORTED_SIMULATION_TYPES, SIMULATION_DISPLAY_NAMES } from '../hooks/useSimulation'
import { MultiConceptProblemHandler, MultiConceptExecutor } from '../engine/multiConceptProblem'

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
const OrganicChemistry = lazy(() => import('../simulations/OrganicChemistry'))
const Stoichiometry = lazy(() => import('../simulations/Stoichiometry'))
const Titration = lazy(() => import('../simulations/Titration'))
const AtomicStructure = lazy(() => import('../simulations/AtomicStructure'))
const GasLaws = lazy(() => import('../simulations/GasLaws'))
const ChemicalBonding = lazy(() => import('../simulations/ChemicalBonding'))

function LoadingSimulation() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-white/10 bg-[#07111f]/80 p-8">
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
    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-white/10 bg-[#07111f]/80 p-8 text-center">
      <h3 className="mb-2 font-heading text-2xl font-semibold text-white">Simulation Not Yet Supported</h3>
      <p className="mb-6 max-w-md text-sm text-slate-400">
        The problem type <span className="font-mono text-[#ff6b6b]">"{simulationType}"</span> is not currently available.
      </p>
      <div className="w-full max-w-sm rounded-[20px] border border-white/10 bg-[#0b1324]/80 p-4">
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

  switch (simulationType) {
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
    case 'organic_chemistry':
      return {
        compound: resolvedVariables.compound ?? 'methane',
        reactionType: resolvedVariables.reactionType ?? 'combustion',
        variables: resolvedVariables,
        isPlaying,
      }
    case 'stoichiometry':
      return {
        reaction: resolvedVariables.reaction ?? 'water_formation',
        reactantAmount: resolvedVariables.reactantAmount ?? 4,
        secondaryAmount: resolvedVariables.secondaryAmount ?? 3,
        variables: resolvedVariables,
        isPlaying,
      }
    case 'titration':
      return {
        acidConcentration: resolvedVariables.acidConcentration ?? 0.1,
        baseConcentration: resolvedVariables.baseConcentration ?? 0.1,
        volume: resolvedVariables.volume ?? 25,
        mode: resolvedVariables.mode ?? 'strong_acid_strong_base',
        variables: resolvedVariables,
        isPlaying,
      }
    case 'atomic_structure':
      return {
        atomicNumber: resolvedVariables.atomicNumber ?? resolvedVariables.protons ?? 8,
        mode: resolvedVariables.mode ?? 'bohr',
        variables: resolvedVariables,
        isPlaying,
      }
    case 'gas_laws':
      return {
        pressure: resolvedVariables.pressure ?? 1,
        volume: resolvedVariables.volume ?? 12,
        temperature: resolvedVariables.temperature ?? 300,
        moles: resolvedVariables.moles ?? resolvedVariables.n ?? 1,
        mode: resolvedVariables.mode ?? 'boyle',
        variables: resolvedVariables,
        isPlaying,
      }
    case 'chemical_bonding':
      return {
        mode: resolvedVariables.mode ?? 'ionic',
        molecule: resolvedVariables.molecule ?? 'H2O',
        variables: resolvedVariables,
        isPlaying,
      }
    default:
      return {}
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

  useEffect(() => {
    const handler = new MultiConceptProblemHandler()
    handler.parseProblems(parsedData)
    const pipeline = handler.buildPipeline()
    handlerRef.current = handler
    const syncId = requestAnimationFrame(() => {
      setPipelineInfo(handler.getPipelineInfo())
    })

    pipeline.on('stageChange', ({ currentIndex }) => {
      setCurrentStageIndex(currentIndex)
      setProgress(pipeline.getProgress())
    })

    pipeline.on('update', ({ stageIndex, totalElapsed, currentStage }) => {
      const state = currentStage?.getRenderState?.() || null
      setCurrentStageIndex(stageIndex)
      setProgress(pipeline.getProgress())
      setCurrentStageState(state)
      setPipelineInfo(handler.getPipelineInfo())

      if (onDataPoint && totalElapsed - lastEmitRef.current >= 0.03) {
        onDataPoint(toTelemetry(state, totalElapsed, stageIndex))
        lastEmitRef.current = totalElapsed
      }
    })

    pipeline.on('complete', () => {
      setProgress(1)
      setPipelineInfo(handler.getPipelineInfo())
    })

    const executor = new MultiConceptExecutor(pipeline)
    executorRef.current = executor

    // Initialize stage 1 even when paused.
    pipeline.start()
    pipeline.pause()
    requestAnimationFrame(() => {
      setCurrentStageState(pipeline.getCurrentState().stageState)
    })

    return () => {
      cancelAnimationFrame(syncId)
      executor.stop()
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
          {renderSingleSimulation(rendererType, simulationProps, commonProps)}
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
        {renderSingleSimulation(resolvedSimulationType, simulationProps, commonProps)}
      </Suspense>
    </div>
  )
}

SimulationRouter.SUPPORTED_TYPES = SUPPORTED_SIMULATION_TYPES
SimulationRouter.DISPLAY_NAMES = SIMULATION_DISPLAY_NAMES
