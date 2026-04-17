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
  const dataStreamIntervalRef = useRef(null)
  const lastDataTimeRef = useRef(0)

  const solve = useCallback(async (problemInput, provider = 'openai') => {
    setIsLoading(true)
    setError(null)

    try {
      const result = typeof problemInput === 'string'
        ? await parseProblem(problemInput, provider)
        : problemInput

      setParsedData(result)
      setCurrentVariables(result.variables || {})
      setActiveSimulation(result.type)
      setDataStream([])
      simulationKeyRef.current += 1
      setIsPlaying(false)

      return result
    } catch (err) {
      const errorMessage = err.message || 'Failed to parse problem'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateVariable = useCallback((key, value) => {
    setCurrentVariables(prev => ({
      ...prev,
      [key]: value,
    }))
    simulationKeyRef.current += 1
  }, [])

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
    lastDataTimeRef.current = 0
  }, [])

  const setSpeed = useCallback((speed) => {
    setPlaybackSpeedState(Math.max(0.1, Math.min(10, speed)))
  }, [])

  const handleSimulationDataPoint = useCallback((dataPoint) => {
    if (!isPlaying) return

    const currentTime = Date.now() / 1000
    const minInterval = 0.1 / playbackSpeed

    if (currentTime - lastDataTimeRef.current >= minInterval) {
      setDataStream(prev => {
        const newStream = [...prev, dataPoint]
        if (newStream.length > MAX_DATA_STREAM_LENGTH) {
          return newStream.slice(-MAX_DATA_STREAM_LENGTH)
        }
        return newStream
      })
      lastDataTimeRef.current = currentTime
    }
  }, [isPlaying, playbackSpeed])

  useEffect(() => {
    return () => {
      if (dataStreamIntervalRef.current) {
        clearInterval(dataStreamIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isPlaying) {
      if (dataStreamIntervalRef.current) {
        clearInterval(dataStreamIntervalRef.current)
        dataStreamIntervalRef.current = null
      }
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
    onDataPoint: handleSimulationDataPoint,
  }
}

export const SUPPORTED_SIMULATION_TYPES = [
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
]

export const SIMULATION_DISPLAY_NAMES = {
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
}

export const SIMULATION_ICONS = {
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
}

export const SIMULATION_CATEGORIES = {
  'Mechanics': ['inclined_plane', 'projectile', 'pendulum', 'circular_motion', 'collisions', 'rotational_mechanics'],
  'Energy & Springs': ['spring_mass', 'orbital'],
  'Waves': ['wave_motion'],
  'Fluids & Thermodynamics': ['buoyancy', 'ideal_gas'],
  'Electricity & Magnetism': ['electric_field', 'electromagnetic'],
  'Optics': ['optics_lens', 'optics_mirror'],
  'Nuclear': ['radioactive_decay'],
}

export const SIMULATION_COLORS = {
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
}
