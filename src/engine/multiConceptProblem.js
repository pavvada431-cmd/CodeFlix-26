/**
 * Multi-Concept Problem Handler
 * Manages parsing and execution of multi-stage physics problems
 */

import { SimulationPipeline, StageTransition } from './simulationPipeline.js'
import { createStage } from './physicsStages.js'

/**
 * Detects multi-concept problems and parses them
 */
export class MultiConceptProblemHandler {
  constructor() {
    this.problem = null
    this.pipeline = null
    this.isMultiConcept = false
    this.stages = []
    this.transitions = []
  }

  /**
   * Parse problem response and detect if multi-concept
   */
  parseProblems(parsedResponse) {
    this.problem = parsedResponse

    // Check if already marked as multi-concept
    if (parsedResponse.isMultiConcept === true && Array.isArray(parsedResponse.stages)) {
      this.isMultiConcept = true
      this.stages = parsedResponse.stages
      this.transitions = parsedResponse.transitions || []
      return this
    }

    // Single concept problem
    this.isMultiConcept = false
    this.stages = [
      {
        type: parsedResponse.type,
        variables: parsedResponse.variables,
        units: parsedResponse.units,
      },
    ]
    this.transitions = []

    return this
  }

  /**
   * Build simulation pipeline from parsed problem
   */
  buildPipeline() {
    const pipeline = new SimulationPipeline()

    // Add stages
    this.stages.forEach((stageConfig, index) => {
      const stage = createStage(stageConfig.type, stageConfig.variables, index)
      pipeline.addStage(stage)
    })

    // Add transitions
    if (this.isMultiConcept) {
      this.transitions.forEach((transConfig) => {
        const condition = this._parseTransitionCondition(transConfig)
        const transition = new StageTransition(
          transConfig.from,
          transConfig.to,
          condition,
          transConfig.label || `Stage ${transConfig.from} → ${transConfig.to}`
        )
        pipeline.addTransition(transition)
      })
    } else if (this.stages.length > 1) {
      // Auto-detect transitions for single-concept multi-stage
      for (let i = 0; i < this.stages.length - 1; i++) {
        const condition = this._autoDetectTransition(this.stages[i], this.stages[i + 1])
        const transition = new StageTransition(i, i + 1, condition)
        pipeline.addTransition(transition)
      }
    }

    this.pipeline = pipeline
    return pipeline
  }

  /**
   * Parse transition condition from config
   */
  _parseTransitionCondition(transConfig) {
    if (transConfig.condition === 'position_threshold') {
      return {
        type: 'position',
        threshold: { y: transConfig.conditionValue || 0 },
        axis: 'y',
      }
    }

    if (transConfig.condition === 'velocity_change') {
      return {
        type: 'velocity',
        threshold: transConfig.conditionValue || 0,
      }
    }

    if (transConfig.condition === 'time_based') {
      return {
        type: 'time',
        value: transConfig.conditionValue || 1,
      }
    }

    // Default: use position threshold at y=0
    return {
      type: 'position',
      threshold: { y: 0 },
      axis: 'y',
    }
  }

  /**
   * Auto-detect transition between two stages
   */
  _autoDetectTransition(fromStage, toStage) {
    // From inclined plane to projectile: detect velocity becomes horizontal
    if (fromStage.type === 'inclined_plane' && toStage.type === 'projectile') {
      return {
        type: 'position',
        axis: 'distance',
        description: 'Block reaches bottom of incline',
      }
    }

    // From projectile to anything: detect landing (y=0)
    if (fromStage.type === 'projectile') {
      return {
        type: 'position',
        threshold: { y: 0 },
        axis: 'y',
        description: 'Projectile reaches ground',
      }
    }

    // From pendulum to projectile: detect max angle
    if (fromStage.type === 'pendulum' && toStage.type === 'projectile') {
      return {
        type: 'velocity',
        threshold: 1,
        description: 'Pendulum reaches launch point with velocity',
      }
    }

    // Default: time-based after 2 seconds
    return {
      type: 'time',
      value: 2,
      description: 'Time-based transition',
    }
  }

  /**
   * Get pipeline state info
   */
  getPipelineInfo() {
    if (!this.pipeline) {
      return null
    }

    return {
      isMultiConcept: this.isMultiConcept,
      stageCount: this.stages.length,
      stages: this.stages.map((s, idx) => ({
        index: idx,
        type: s.type,
        variables: s.variables,
      })),
      transitions: this.transitions,
      currentState: this.pipeline.getState(),
    }
  }

  /**
   * Format for UI display
   */
  getStageDisplayName(stageType) {
    const displayNames = {
      inclined_plane: 'Inclined Plane',
      projectile: 'Projectile Motion',
      pendulum: 'Pendulum',
      spring_mass: 'Spring-Mass System',
      collisions: 'Collision',
      circular_motion: 'Circular Motion',
      wave_motion: 'Wave Motion',
      rotational_mechanics: 'Rotational Mechanics',
      orbital: 'Orbital Motion',
      buoyancy: 'Buoyancy',
    }
    return displayNames[stageType] || stageType
  }
}

/**
 * Multi-Concept Problem Executor
 */
export class MultiConceptExecutor {
  constructor(pipeline) {
    this.pipeline = pipeline
    this.animationFrameId = null
    this.lastFrameTime = performance.now()
    this.frameStats = {
      fps: 0,
      frameTime: 0,
    }
  }

  /**
   * Start execution
   */
  start() {
    this.pipeline.start()
    this.lastFrameTime = performance.now()
    this._animate()
    return this
  }

  /**
   * Stop execution
   */
  stop() {
    this.pipeline.stop()
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    return this
  }

  /**
   * Pause execution
   */
  pause() {
    this.pipeline.pause()
    return this
  }

  /**
   * Resume execution
   */
  resume() {
    this.pipeline.resume()
    return this
  }

  /**
   * Reset execution
   */
  reset() {
    this.stop()
    this.pipeline.reset()
    return this
  }

  /**
   * Animation loop
   */
  _animate = () => {
    const now = performance.now()
    const deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.016) // Cap at 16ms
    this.lastFrameTime = now

    // Update frame stats
    this.frameStats.frameTime = (now - this.lastFrameTime) * 1000
    this.frameStats.fps = this.frameStats.frameTime > 0 ? 1000 / this.frameStats.frameTime : 0

    // Update pipeline
    this.pipeline.update(deltaTime)

    // Continue animation if still running
    if (this.pipeline.isRunning) {
      this.animationFrameId = requestAnimationFrame(this._animate)
    }
  }

  /**
   * Get current execution state
   */
  getState() {
    return {
      pipelineState: this.pipeline.getState(),
      frameStats: this.frameStats,
    }
  }

  /**
   * Get history data for graphing
   */
  getHistory() {
    const history = this.pipeline.getHistory()
    const stageData = {}

    history.forEach((entry) => {
      const stageType = this.pipeline.stages[entry.stageIndex].type
      if (!stageData[stageType]) {
        stageData[stageType] = []
      }
      stageData[stageType].push(entry.state)
    })

    return stageData
  }

  /**
   * Jump to specific stage
   */
  jumpToStage(stageIndex) {
    this.pipeline.jumpToStage(stageIndex)
    return this
  }

  /**
   * Get progress (0-1)
   */
  getProgress() {
    return this.pipeline.getProgress()
  }
}

export default {
  MultiConceptProblemHandler,
  MultiConceptExecutor,
}
