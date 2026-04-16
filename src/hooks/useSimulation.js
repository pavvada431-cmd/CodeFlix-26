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

  const solve = useCallback(async (problemText) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await parseProblem(problemText)

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
]

export const SIMULATION_DISPLAY_NAMES = {
  inclined_plane: 'Inclined Plane',
  projectile: 'Projectile Motion',
  pendulum: 'Simple Pendulum',
  spring_mass: 'Spring-Mass System',
  circular_motion: 'Circular Motion',
  circuit: 'Electric Circuit',
  titration: 'Titration',
  combustion: 'Combustion',
}
