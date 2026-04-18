import { useState, useCallback, useRef, useEffect } from 'react'
import { parseProblem } from '../utils/problemParser'

const DEFAULT_PLAYBACK_SPEED = 1
const MAX_DATA_STREAM_LENGTH = 1000

export default function useSimulation() {
  const [parsedData, setParsedData] = useState(null)
  const [currentVariables, setCurrentVariables] = useState({})
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeedState] = useState(DEFAULT_PLAYBACK_SPEED)
  const [dataStream, setDataStream] = useState([])
  const [activeSimulation, setActiveSimulation] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const simulationKeyRef = useRef(0)
  const lastDataTimeRef = useRef(0)
  const circularBufferRef = useRef(new Array(MAX_DATA_STREAM_LENGTH))
  const circularBufferIndexRef = useRef(0)
  const isBufferFullRef = useRef(false)

  const solve = useCallback(async (problemInput, provider = 'openai') => {
    setIsLoading(true)
    setError(null)

    try {
      const result = typeof problemInput === 'string'
        ? await parseProblem(problemInput, provider)
        : problemInput

      const isMultiConcept = result?.isMultiConcept === true && Array.isArray(result?.stages) && result.stages.length > 0
      const nextVariables = result?.variables || (isMultiConcept ? result.stages[0]?.variables : {}) || {}

      setParsedData(result)
      setCurrentVariables(nextVariables)
      setActiveSimulation(isMultiConcept ? 'multi_concept' : result.type)
      setDataStream([])
      circularBufferIndexRef.current = 0
      isBufferFullRef.current = false
      simulationKeyRef.current += 1
      setIsPlaying(false)

      return result
    } catch (err) {
      const errorMessage = err.message || 'Failed to parse problem'
      setError(errorMessage)
      setParsedData(null)
      setActiveSimulation(null)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateVariable = useCallback((key, value) => {
    const stageMatch = /^stage:(\d+):(.+)$/.exec(String(key))
    if (stageMatch) {
      const stageIndex = Number(stageMatch[1])
      const stageKey = stageMatch[2]

      setParsedData((prev) => {
        if (!prev?.isMultiConcept || !Array.isArray(prev?.stages)) return prev
        const nextStages = prev.stages.map((stage, idx) => {
          if (idx !== stageIndex) return stage
          return {
            ...stage,
            variables: {
              ...(stage.variables || {}),
              [stageKey]: value,
            },
          }
        })

        return {
          ...prev,
          stages: nextStages,
          variables: stageIndex === 0
            ? {
              ...(prev.variables || {}),
              [stageKey]: value,
            }
            : prev.variables,
        }
      })

      if (stageIndex === 0) {
        setCurrentVariables(prev => ({
          ...prev,
          [stageKey]: value,
        }))
      }
      
      if (isPlaying) {
        setIsPlaying(false)
        setDataStream([])
        circularBufferIndexRef.current = 0
        setTimeout(() => {
          setIsPlaying(true)
        }, 100)
      }
      return
    }

    setCurrentVariables(prev => ({
      ...prev,
      [key]: value,
    }))
    
    if (isPlaying) {
      setIsPlaying(false)
      setDataStream([])
      circularBufferIndexRef.current = 0
      setTimeout(() => {
        setIsPlaying(true)
      }, 100)
    }
  }, [isPlaying])

  const play = useCallback(() => {
    if (!activeSimulation) return
    setIsPlaying(true)
  }, [activeSimulation])

  const pause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const reset = useCallback(() => {
    setIsPlaying(false)
    setDataStream([])
    circularBufferIndexRef.current = 0
    isBufferFullRef.current = false
    lastDataTimeRef.current = 0
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const setSpeed = useCallback((speed) => {
    setPlaybackSpeedState(Math.max(0.1, Math.min(10, speed)))
  }, [])

  const handleSimulationDataPoint = useCallback((dataPoint) => {
    if (!isPlaying) return

    const currentTime = Date.now() / 1000
    const minInterval = 0.1 / playbackSpeed

    if (currentTime - lastDataTimeRef.current >= minInterval) {
      const buffer = circularBufferRef.current
      const index = circularBufferIndexRef.current
      buffer[index] = dataPoint
      circularBufferIndexRef.current = (index + 1) % MAX_DATA_STREAM_LENGTH
      if (circularBufferIndexRef.current === 0) {
        isBufferFullRef.current = true
      }

      const dataToShow = isBufferFullRef.current ? buffer : buffer.slice(0, circularBufferIndexRef.current)
      setDataStream(dataToShow.filter(d => d !== undefined))
      lastDataTimeRef.current = currentTime
    }
  }, [isPlaying, playbackSpeed])

  useEffect(() => {
    if (!isPlaying) {
      // Data stream is cleared via circular buffer management
    }
  }, [isPlaying])

  return {
    parsedData,
    currentVariables,
    isPlaying,
    playbackSpeed,
    dataStream,
    activeSimulation,
    isLoading,
    error,
    simulationKey: simulationKeyRef.current,
    solve,
    updateVariable,
    play,
    pause,
    reset,
    setSpeed,
    clearError,
    onDataPoint: handleSimulationDataPoint,
  }
}

export const SUPPORTED_SIMULATION_TYPES = [
  'multi_concept',
  'inclined_plane',
  'projectile',
  'pendulum',
  'spring_mass',
  'circular_motion',
  'collisions',
  'wave_motion',
  'rotational_mechanics',
  'orbital',
  'buoyancy',
  'ideal_gas',
  'electric_field',
  'optics_lens',
  'optics_mirror',
  'radioactive_decay',
  'electromagnetic',
  'organic_chemistry',
  'stoichiometry',
  'titration',
  'atomic_structure',
  'gas_laws',
  'chemical_bonding',
]

export const SIMULATION_DISPLAY_NAMES = {
  multi_concept: 'Multi-Concept Pipeline',
  inclined_plane: 'Inclined Plane',
  projectile: 'Projectile Motion',
  pendulum: 'Simple Pendulum',
  spring_mass: 'Spring-Mass System',
  circular_motion: 'Circular Motion',
  collisions: 'Collision Simulation',
  wave_motion: 'Wave Motion',
  rotational_mechanics: 'Rotational Mechanics',
  orbital: 'Gravitational Orbits',
  buoyancy: 'Buoyancy & Fluids',
  ideal_gas: 'Ideal Gas / Thermodynamics',
  electric_field: 'Electric Fields',
  optics_lens: 'Optics - Lenses',
  optics_mirror: 'Optics - Mirrors',
  radioactive_decay: 'Radioactive Decay',
  electromagnetic: 'Electromagnetic',
  circuit: 'Electric Circuit',
  titration: 'Titration',
  combustion: 'Combustion',
  organic_chemistry: 'Organic Chemistry',
  stoichiometry: 'Stoichiometry',
  atomic_structure: 'Atomic Structure',
  gas_laws: 'Gas Laws',
  chemical_bonding: 'Chemical Bonding',
}

export const SIMULATION_ICONS = {
  multi_concept: '🧩',
  inclined_plane: '📐',
  projectile: '🎯',
  pendulum: '⏱️',
  spring_mass: '🔄',
  circular_motion: '🔵',
  collisions: '💥',
  wave_motion: '🌊',
  rotational_mechanics: '⚙️',
  orbital: '🪐',
  buoyancy: '🫧',
  ideal_gas: '🌡️',
  electric_field: '⚡',
  optics_lens: '🔍',
  optics_mirror: '🪞',
  radioactive_decay: '☢️',
  electromagnetic: '🧲',
  organic_chemistry: '🧪',
  stoichiometry: '⚖️',
  titration: '🧫',
  atomic_structure: '⚛️',
  gas_laws: '🫙',
  chemical_bonding: '🔗',
}

export const SIMULATION_CATEGORIES = {
  'Multi-Concept': ['multi_concept'],
  'Mechanics': ['inclined_plane', 'projectile', 'pendulum', 'circular_motion', 'collisions', 'rotational_mechanics'],
  'Energy & Springs': ['spring_mass', 'orbital'],
  'Waves': ['wave_motion'],
  'Fluids & Thermodynamics': ['buoyancy', 'ideal_gas'],
  'Electricity & Magnetism': ['electric_field', 'electromagnetic'],
  'Optics': ['optics_lens', 'optics_mirror'],
  'Nuclear': ['radioactive_decay'],
  'Chemistry': ['organic_chemistry', 'stoichiometry', 'titration', 'atomic_structure', 'gas_laws', 'chemical_bonding', 'combustion'],
}

export const SIMULATION_COLORS = {
  multi_concept: '#60a5fa',
  inclined_plane: '#00f5ff',
  projectile: '#ff8800',
  pendulum: '#88ff88',
  spring_mass: '#ff88ff',
  circular_motion: '#ffff00',
  collisions: '#ff4444',
  wave_motion: '#00ffff',
  rotational_mechanics: '#ff6b35',
  orbital: '#4488ff',
  buoyancy: '#0088ff',
  ideal_gas: '#ff4400',
  electric_field: '#ffff00',
  optics_lens: '#ff00ff',
  optics_mirror: '#c0c0c0',
  radioactive_decay: '#00ff00',
  electromagnetic: '#ff0088',
  organic_chemistry: '#a855f7',
  stoichiometry: '#f97316',
  titration: '#ec4899',
  atomic_structure: '#6366f1',
  gas_laws: '#06b6d4',
  chemical_bonding: '#8b5cf6',
}
