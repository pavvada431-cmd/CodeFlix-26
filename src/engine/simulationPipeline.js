/**
 * Simulation Pipeline - Execute multi-stage physics problems
 * Orchestrates sequential execution of different physics concepts
 */

/**
 * Stage - Individual physics simulation step
 */
export class SimulationStage {
  constructor(id, type, variables, index) {
    this.id = id
    this.type = type
    this.variables = { ...variables }
    this.index = index
    this.state = {
      startTime: 0,
      currentTime: 0,
      elapsed: 0,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      complete: false,
      data: [], // Timeline data points
    }
    this.initialState = null
    this.physicsEngine = null
    this.bodies = []
  }

  /**
   * Initialize stage with optional state from previous stage
   */
  initialize(inheritedState = null) {
    this.startTime = performance.now()
    this.state.startTime = this.startTime
    this.state.elapsed = 0

    // Inherit state from previous stage if available
    if (inheritedState) {
      this.state.position = { ...inheritedState.position }
      this.state.velocity = { ...inheritedState.velocity }
      this.state.acceleration = inheritedState.acceleration ? { ...inheritedState.acceleration } : { x: 0, y: 0, z: 0 }
    }

    // Store initial state for reset capability
    this.initialState = JSON.parse(JSON.stringify(this.state))

    return this
  }

  /**
   * Update stage physics by delta time
   */
  update(deltaTime) {
    this.state.currentTime = performance.now()
    this.state.elapsed = (this.state.currentTime - this.startTime) / 1000

    // Stage-specific update logic (implemented by subclasses)
    this.updatePhysics(deltaTime)

    return this.state
  }

  /**
   * Override in subclasses - implement stage-specific physics
   */
  updatePhysics(deltaTime) {
    // Default: no movement
  }

  /**
   * Check if stage transition condition is met
   */
  checkTransitionCondition(condition = {}) {
    // Default: check various condition types
    if (condition.type === 'time' && condition.value) {
      return this.state.elapsed >= condition.value
    }

    if (condition.type === 'position' && condition.threshold) {
      const threshold = condition.threshold
      if (condition.axis === 'y') {
        return this.state.position.y >= threshold.y || this.state.position.y <= threshold.y
      }
      if (condition.axis === 'x') {
        return this.state.position.x >= threshold.x || this.state.position.x <= threshold.x
      }
    }

    if (condition.type === 'velocity' && condition.threshold) {
      const vx = this.state.velocity.x
      const vy = this.state.velocity.y
      const speed = Math.hypot(vx, vy)
      return speed >= condition.threshold
    }

    return false
  }

  /**
   * Get stage state for transfer to next stage
   */
  getTransferState() {
    return {
      position: { ...this.state.position },
      velocity: { ...this.state.velocity },
      acceleration: { ...this.state.acceleration },
      energy: this.calculateEnergy(),
      momentum: this.calculateMomentum(),
      time: this.state.elapsed,
      data: [...this.state.data],
    }
  }

  /**
   * Calculate kinetic energy
   */
  calculateEnergy() {
    const mass = this.variables.mass || 1
    const speed = Math.hypot(this.state.velocity.x, this.state.velocity.y, this.state.velocity.z)
    return 0.5 * mass * speed * speed
  }

  /**
   * Calculate momentum
   */
  calculateMomentum() {
    const mass = this.variables.mass || 1
    return {
      x: mass * this.state.velocity.x,
      y: mass * this.state.velocity.y,
      z: mass * this.state.velocity.z,
    }
  }

  /**
   * Record data point for graphing
   */
  recordDataPoint(x, y) {
    this.state.data.push({ x, y, time: this.state.elapsed })
  }

  /**
   * Reset stage to initial state
   */
  reset() {
    if (this.initialState) {
      this.state = JSON.parse(JSON.stringify(this.initialState))
    }
    this.state.complete = false
  }

  /**
   * Mark stage as complete
   */
  complete() {
    this.state.complete = true
  }
}

/**
 * Transition between stages
 */
export class StageTransition {
  constructor(fromIndex, toIndex, condition = {}, label = '') {
    this.fromIndex = fromIndex
    this.toIndex = toIndex
    this.condition = condition // { type: 'time|position|velocity', value?: number, threshold?: object }
    this.label = label || `Transition from stage ${fromIndex} to ${toIndex}`
    this.triggered = false
    this.triggerTime = null
  }

  /**
   * Check if transition should occur
   */
  check(currentStage) {
    if (this.triggered) {
      return true
    }

    if (currentStage.checkTransitionCondition(this.condition)) {
      this.triggered = true
      this.triggerTime = currentStage.state.elapsed
      return true
    }

    return false
  }

  /**
   * Reset transition state
   */
  reset() {
    this.triggered = false
    this.triggerTime = null
  }
}

/**
 * Simulation Pipeline - Manages multi-stage simulations
 */
export class SimulationPipeline {
  constructor() {
    this.stages = [] // Array of SimulationStage
    this.transitions = [] // Array of StageTransition
    this.currentStageIndex = 0
    this.isRunning = false
    this.isPaused = false
    this.startTime = 0
    this.totalElapsed = 0
    this.history = [] // Complete timeline of all stages
    this.callbacks = {
      onStageChange: null,
      onTransition: null,
      onComplete: null,
      onUpdate: null,
    }
  }

  /**
   * Add a stage to the pipeline
   */
  addStage(stage) {
    stage.index = this.stages.length
    this.stages.push(stage)
    return this
  }

  /**
   * Add a transition between stages
   */
  addTransition(transition) {
    this.transitions.push(transition)
    return this
  }

  /**
   * Set callback for events
   */
  on(eventName, callback) {
    if (this.callbacks.hasOwnProperty(`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`)) {
      this.callbacks[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = callback
    }
    return this
  }

  /**
   * Start the simulation pipeline
   */
  start() {
    if (this.stages.length === 0) {
      throw new Error('Pipeline has no stages to execute')
    }

    this.isRunning = true
    this.isPaused = false
    this.startTime = performance.now()
    this.totalElapsed = 0
    this.currentStageIndex = 0

    // Initialize first stage
    this.stages[0].initialize()

    if (this.callbacks.onStageChange) {
      this.callbacks.onStageChange({
        previousIndex: -1,
        currentIndex: 0,
        stage: this.stages[0],
      })
    }

    return this
  }

  /**
   * Update pipeline
   */
  update(deltaTime) {
    if (!this.isRunning || this.isPaused) {
      return
    }

    const currentStage = this.stages[this.currentStageIndex]

    // Update current stage
    const stageState = currentStage.update(deltaTime)

    this.totalElapsed += deltaTime

    // Check for stage transition
    const transition = this.transitions.find((t) => t.fromIndex === this.currentStageIndex)

    if (transition && transition.check(currentStage)) {
      this._transitionToNextStage(transition)
    }

    // Record history
    this.history.push({
      time: this.totalElapsed,
      stageIndex: this.currentStageIndex,
      state: JSON.parse(JSON.stringify(stageState)),
    })

    // Callback
    if (this.callbacks.onUpdate) {
      this.callbacks.onUpdate({
        currentStage,
        stageIndex: this.currentStageIndex,
        totalElapsed: this.totalElapsed,
        isComplete: this._isComplete(),
      })
    }

    // Check if all stages complete
    if (this._isComplete()) {
      this.isRunning = false
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete({
          totalTime: this.totalElapsed,
          stages: this.stages,
          history: this.history,
        })
      }
    }
  }

  /**
   * Transition to next stage
   */
  _transitionToNextStage(transition) {
    const currentStage = this.stages[this.currentStageIndex]
    const nextStage = this.stages[transition.toIndex]

    if (!nextStage) {
      currentStage.complete()
      return
    }

    // Transfer state to next stage
    const transferState = currentStage.getTransferState()
    nextStage.initialize(transferState)

    const previousIndex = this.currentStageIndex
    this.currentStageIndex = transition.toIndex

    if (this.callbacks.onTransition) {
      this.callbacks.onTransition({
        transition,
        fromStage: currentStage,
        toStage: nextStage,
        transferredState: transferState,
      })
    }

    if (this.callbacks.onStageChange) {
      this.callbacks.onStageChange({
        previousIndex,
        currentIndex: this.currentStageIndex,
        stage: nextStage,
      })
    }
  }

  /**
   * Check if pipeline is complete
   */
  _isComplete() {
    if (this.currentStageIndex >= this.stages.length) {
      return true
    }

    // Check if last stage is complete
    const lastStage = this.stages[this.stages.length - 1]
    if (this.currentStageIndex === this.stages.length - 1) {
      return lastStage.state.complete
    }

    return false
  }

  /**
   * Pause simulation
   */
  pause() {
    this.isPaused = true
    return this
  }

  /**
   * Resume simulation
   */
  resume() {
    this.isPaused = false
    return this
  }

  /**
   * Stop simulation
   */
  stop() {
    this.isRunning = false
    this.isPaused = false
    return this
  }

  /**
   * Reset simulation to start
   */
  reset() {
    this.stages.forEach((stage) => stage.reset())
    this.transitions.forEach((transition) => transition.reset())
    this.currentStageIndex = 0
    this.totalElapsed = 0
    this.history = []
    this.isRunning = false
    this.isPaused = false
    return this
  }

  /**
   * Get current stage
   */
  getCurrentStage() {
    return this.stages[this.currentStageIndex] || null
  }

  /**
   * Get all stages
   */
  getStages() {
    return [...this.stages]
  }

  /**
   * Get pipeline state
   */
  getState() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentStageIndex: this.currentStageIndex,
      totalElapsed: this.totalElapsed,
      currentStage: this.getCurrentStage()?.state || null,
      stageCount: this.stages.length,
      completedStages: this.stages.filter((s) => s.state.complete).length,
    }
  }

  /**
   * Get complete history
   */
  getHistory() {
    return [...this.history]
  }

  /**
   * Jump to specific stage
   */
  jumpToStage(stageIndex) {
    if (stageIndex < 0 || stageIndex >= this.stages.length) {
      throw new Error(`Invalid stage index: ${stageIndex}`)
    }

    // Reset all stages up to target
    this.stages.forEach((stage, idx) => {
      if (idx <= stageIndex) {
        stage.reset()
      }
    })

    this.currentStageIndex = stageIndex
    const stage = this.stages[stageIndex]
    stage.initialize()

    if (this.callbacks.onStageChange) {
      this.callbacks.onStageChange({
        previousIndex: -1,
        currentIndex: stageIndex,
        stage,
      })
    }

    return this
  }

  /**
   * Get stage progress (0-1)
   */
  getProgress() {
    if (this.stages.length === 0) return 0
    return this.currentStageIndex / this.stages.length
  }
}

export default SimulationPipeline
