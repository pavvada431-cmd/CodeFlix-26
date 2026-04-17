import { useRef, useState, useCallback } from 'react'

const FPS_THRESHOLD = 30
const SAMPLE_SIZE = 60
const REDUCTION_FACTOR = 0.5

export function usePerformanceMonitor() {
  const frameTimesRef = useRef([])
  const lastFrameRef = useRef(0)
  const [fps, setFps] = useState(60)
  const [isPerformanceMode, setIsPerformanceMode] = useState(false)
  const [particleMultiplier, setParticleMultiplier] = useState(1)
  
  const measureFrame = useCallback(() => {
    const now = performance.now()
    if (lastFrameRef.current === 0) {
      lastFrameRef.current = now
      return 0
    }
    const delta = now - lastFrameRef.current
    lastFrameRef.current = now
    
    frameTimesRef.current.push(delta)
    if (frameTimesRef.current.length > SAMPLE_SIZE) {
      frameTimesRef.current.shift()
    }
    
    const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
    const currentFps = Math.round(1000 / avgFrameTime)
    setFps(currentFps)
    
    if (currentFps < FPS_THRESHOLD && !isPerformanceMode) {
      setIsPerformanceMode(true)
      setParticleMultiplier(prev => Math.max(prev * REDUCTION_FACTOR, 0.25))
    } else if (currentFps > FPS_THRESHOLD * 1.2 && isPerformanceMode) {
      setIsPerformanceMode(false)
      setParticleMultiplier(prev => Math.min(prev / REDUCTION_FACTOR, 1))
    }
    
    return delta
  }, [isPerformanceMode])
  
  const resetPerformanceMode = useCallback(() => {
    setIsPerformanceMode(false)
    setParticleMultiplier(1)
    frameTimesRef.current = []
  }, [])
  
  return {
    fps,
    isPerformanceMode,
    particleMultiplier,
    measureFrame,
    resetPerformanceMode,
  }
}

export default usePerformanceMonitor
