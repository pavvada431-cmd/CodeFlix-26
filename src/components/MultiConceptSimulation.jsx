import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MultiConceptProblemHandler, MultiConceptExecutor } from '../engine/multiConceptProblem'
import { formatNumber } from '../utils/formatters'

const STAGE_DISPLAY_NAMES = {
  inclined_plane: 'Inclined Plane',
  projectile: 'Projectile Motion',
  free_fall: 'Free Fall',
  collisions: 'Collision',
  spring_launch: 'Spring Launch',
}

/**
 * MultiConceptSimulation - Component for visualizing multi-stage physics problems
 */
export default function MultiConceptSimulation({ parsedProblem, onClose }) {
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentStage, setCurrentStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [pipelineInfo, setPipelineInfo] = useState(null)
  const [isHandlerReady, setIsHandlerReady] = useState(false)
  const [isMultiConcept, setIsMultiConcept] = useState(false)

  const executorRef = useRef(null)
  const canvasRef = useRef(null)
  const handlerRef = useRef(null)

  // Initialize pipeline
  useEffect(() => {
    const resetId = setTimeout(() => {
      setPipelineInfo(null)
      setIsHandlerReady(false)
      setIsMultiConcept(false)
    }, 0)

    const handler = new MultiConceptProblemHandler()
    handler.parseProblems(parsedProblem)
    handler.buildPipeline()

    handlerRef.current = handler
    setPipelineInfo(handlerRef.current.getPipelineInfo())
    setIsMultiConcept(handlerRef.current.isMultiConcept)
    setIsHandlerReady(true)

    // Setup callbacks
    handler.pipeline.on('stageChange', (data) => {
      setCurrentStage(data.currentIndex)
      console.log(`Transitioned to stage ${data.currentIndex}: ${data.stage.type}`)
    })

    handler.pipeline.on('transition', (data) => {
      console.log(`Stage transition: ${data.transition.label}`)
    })

    handler.pipeline.on('update', (data) => {
      setProgress(handler.pipeline.getProgress())
      setTimeElapsed(data.totalElapsed)
    })

    handler.pipeline.on('complete', (data) => {
      console.log('Pipeline complete', data)
      setIsRunning(false)
    })

    return () => {
      clearTimeout(resetId)
      handler.pipeline.stop()
    }
  }, [parsedProblem])

  // Start/stop simulation
  const handleStart = useCallback(() => {
    if (!executorRef.current && handlerRef.current) {
      const executor = new MultiConceptExecutor(handlerRef.current.pipeline)
      executorRef.current = executor
      executor.start()
      setIsRunning(true)
      setIsPaused(false)
    } else if (executorRef.current) {
      if (isPaused) {
        executorRef.current.resume()
        setIsPaused(false)
      } else {
        executorRef.current.start()
      }
      setIsRunning(true)
    }
  }, [isPaused])

  const handlePause = useCallback(() => {
    if (executorRef.current) {
      executorRef.current.pause()
      setIsPaused(true)
    }
  }, [])

  const handleReset = useCallback(() => {
    if (executorRef.current) {
      executorRef.current.reset()
      setIsRunning(false)
      setIsPaused(false)
      setCurrentStage(0)
      setProgress(0)
      setTimeElapsed(0)
    }
  }, [])

  const handleJumpToStage = useCallback((stageIndex) => {
    if (executorRef.current) {
      executorRef.current.jumpToStage(stageIndex)
      setCurrentStage(stageIndex)
    }
  }, [])

  if (!isHandlerReady || !pipelineInfo) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#00f5ff] border-t-transparent" />
      </div>
    )
  }

  const currentStageInfo = pipelineInfo.stages[currentStage]
  const stageName = STAGE_DISPLAY_NAMES[currentStageInfo?.type] || currentStageInfo?.type || 'Unknown Stage'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2 border-b border-white/10 pb-4">
        <h3 className="text-lg font-semibold text-white">
          {isMultiConcept ? 'Multi-Concept Simulation' : 'Single-Concept Simulation'}
        </h3>
        <p className="text-sm text-slate-400">
          {pipelineInfo.stageCount} stage{pipelineInfo.stageCount > 1 ? 's' : ''}
          {isMultiConcept && ` • ${pipelineInfo.transitions.length} transition${pipelineInfo.transitions.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Stage Indicator */}
      <div className="bg-[var(--color-bg)]/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-mono text-slate-400">Current Stage</span>
          <span className="text-lg font-semibold text-[#00f5ff]">
            {currentStage + 1} / {pipelineInfo.stageCount}
          </span>
        </div>

        <div className="text-base font-semibold text-white">
          {stageName}
        </div>

        <div className="flex gap-2 flex-wrap">
          {pipelineInfo.stages.map((stage, idx) => (
            <button
              key={idx}
              onClick={() => handleJumpToStage(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                idx === currentStage
                  ? 'bg-[#00f5ff] text-[#0a1421] font-semibold'
                  : idx < currentStage
                    ? 'bg-green-900/30 text-green-300 border border-green-700/50'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Stage Variables */}
      <div className="bg-[var(--color-bg)]/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Variables</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(currentStageInfo?.variables || {}).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-slate-400">{key}:</span>
              <span className="text-[#00f5ff] font-mono">
                {typeof value === 'number' ? formatNumber(value, 3) : value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas for Visualization */}
      <div className="relative bg-[var(--color-bg)] rounded-lg overflow-hidden" style={{ height: '300px' }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          className="w-full h-full"
          style={{ background: 'linear-gradient(135deg, #0a1421 0%, #131d2f 100%)' }}
        />
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Progress</span>
          <span className="text-[#00f5ff] font-mono">{formatNumber(progress * 100, 1)}%</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-[#00f5ff] to-[#4ecdc4] transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Time Display */}
      <div className="bg-[var(--color-bg)]/50 rounded-lg p-3 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-sm font-mono text-slate-400">Elapsed Time</span>
          <span className="text-lg font-mono text-[#00f5ff]">{formatNumber(timeElapsed, 2)}s</span>
        </div>
      </div>

      {/* Transitions Info */}
      {isMultiConcept && pipelineInfo.transitions.length > 0 && (
        <div className="bg-[var(--color-bg)]/50 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-semibold text-slate-300">Transitions</h4>
          <div className="space-y-1 text-xs text-slate-400">
            {pipelineInfo.transitions.map((t, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span>→</span>
                <span>
                  Stage {t.from + 1} to {t.to + 1}
                </span>
                <span className="text-slate-500">({t.condition})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={handleStart}
          disabled={isRunning && !isPaused}
          className="flex-1 px-4 py-2 rounded-lg bg-[#00f5ff] text-[#0a1421] font-semibold hover:bg-[#00dce8] disabled:opacity-50 transition"
        >
          {isRunning && !isPaused ? 'Running...' : isPaused ? 'Resume' : 'Start'}
        </button>

        <button
          onClick={handlePause}
          disabled={!isRunning}
          className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 disabled:opacity-50 transition"
        >
          Pause
        </button>

        <button
          onClick={handleReset}
          className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition"
        >
          Reset
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition"
          >
            Close
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
        <p className="text-xs text-blue-200">
          💡 This simulation combines multiple physics concepts. Each stage transitions to the next when
          its completion condition is met. Use stage buttons to jump between stages.
        </p>
      </div>
    </div>
  )
}
