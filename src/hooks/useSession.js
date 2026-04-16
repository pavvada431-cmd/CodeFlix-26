import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'simusolve_session'

function getTimestamp() {
  return new Date().toISOString()
}

function getDuration(start, end) {
  const ms = new Date(end) - new Date(start)
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
}

export function useSession() {
  const [sessionData, setSessionData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : { startTime: getTimestamp(), simulations: [], problems: [] }
    } catch {
      return { startTime: getTimestamp(), simulations: [], problems: [] }
    }
  })
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData))
  }, [sessionData])

  const logSimulation = useCallback((type, displayName, variables = {}) => {
    if (!isActive) return
    setSessionData(prev => ({
      ...prev,
      simulations: [...prev.simulations, {
        type,
        displayName,
        variables,
        timestamp: getTimestamp(),
      }],
    }))
  }, [isActive])

  const logProblem = useCallback((problemText, parsedResult) => {
    if (!isActive) return
    setSessionData(prev => ({
      ...prev,
      problems: [...prev.problems, {
        text: problemText.substring(0, 100),
        simulationType: parsedResult?.type,
        variables: parsedResult?.variables,
        timestamp: getTimestamp(),
      }],
    }))
  }, [isActive])

  const getSummary = useCallback(() => {
    const endTime = getTimestamp()
    const simCount = {}
    const typeCount = {}
    
    sessionData.simulations.forEach(sim => {
      simCount[sim.displayName] = (simCount[sim.displayName] || 0) + 1
      typeCount[sim.type] = (typeCount[sim.type] || 0) + 1
    })
    
    return {
      duration: getDuration(sessionData.startTime, endTime),
      totalSimulations: sessionData.simulations.length,
      totalProblems: sessionData.problems.length,
      uniqueTypes: Object.keys(typeCount).length,
      simulationCounts: simCount,
      typeCounts: typeCount,
      startTime: sessionData.startTime,
      endTime,
    }
  }, [sessionData])

  const clearSession = useCallback(() => {
    setSessionData({ startTime: getTimestamp(), simulations: [], problems: [] })
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const pauseSession = useCallback(() => setIsActive(false), [])
  const resumeSession = useCallback(() => setIsActive(true), [])

  return {
    sessionData,
    logSimulation,
    logProblem,
    getSummary,
    clearSession,
    pauseSession,
    resumeSession,
    isActive,
  }
}

export default useSession
