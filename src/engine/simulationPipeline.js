/**
 * Multi-stage simulation pipeline.
 * Handles stage execution, transitions, output-to-input mapping, and timeline continuity.
 */

const EPSILON = 1e-6

function toNumber(value, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback
}

function speedFromVector(velocity = { x: 0, y: 0 }) {
  return Math.hypot(toNumber(velocity.x, 0), toNumber(velocity.y, 0))
}

function angleFromVelocity(velocity = { x: 0, y: 0 }) {
  return (Math.atan2(toNumber(velocity.y, 0), toNumber(velocity.x, 0)) * 180) / Math.PI
}

function normalizeTransition(transition) {
  if (transition instanceof StageTransition) {
    return {
      from: transition.from,
      to: transition.to,
      condition: transition.condition,
      value: transition.value,
      label: transition.label,
      _instance: transition,
    }
  }

  if (!transition || typeof transition !== 'object') {
    return null
  }

  return {
    from: toNumber(transition.from, 0),
    to: Number.isFinite(transition.to) ? transition.to : toNumber(transition.from, 0) + 1,
    condition: transition.condition || transition.type || 'stage_complete',
    value: transition.value ?? transition.conditionValue ?? 0,
    label: transition.label || '',
    _instance: null,
  }
}

export class StageTransition {
  constructor(from, to, condition = 'stage_complete', value = 0, label = '') {
    this.from = toNumber(from, 0)
    this.to = toNumber(to, this.from + 1)
    this.condition = condition || 'stage_complete'
    this.value = value
    this.label = label || `Stage ${this.from + 1} → ${this.to + 1}`
    this.triggered = false
    this.triggerTime = 0
  }

  check(stage) {
    if (!stage || this.triggered) return this.triggered
    this.triggered = stage.checkTransitionCondition({
      condition: this.condition,
      value: this.value,
    })
    if (this.triggered) {
      this.triggerTime = stage.elapsedTime || 0
    }
    return this.triggered
  }

  reset() {
    this.triggered = false
    this.triggerTime = 0
  }
}

export class SimulationPipeline {
  constructor() {
    this.stages = []
    this.transitions = []
    this.currentStageIndex = 0
    this.totalElapsed = 0
    this.isRunning = false
    this.isPaused = false
    this.history = []
    this.callbacks = {
      onStageChange: null,
      onTransition: null,
      onUpdate: null,
      onComplete: null,
    }
  }

  addStage(stage) {
    if (!stage || typeof stage.initialize !== 'function' || typeof stage.update !== 'function') {
      throw new Error('Stage must implement initialize() and update() methods')
    }
    this.stages.push(stage)
    return this
  }

  addTransition(transition) {
    const normalized = normalizeTransition(transition)
    if (!normalized) {
      throw new Error('Transition must be an object or StageTransition instance')
    }
    this.transitions.push(normalized)
    return this
  }

  on(eventName, callback) {
    const callbackName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`
    if (Object.prototype.hasOwnProperty.call(this.callbacks, callbackName)) {
      this.callbacks[callbackName] = callback
    }
    return this
  }

  start() {
    if (!this.stages.length) {
      throw new Error('Cannot start pipeline with no stages')
    }

    this.reset()
    this.isRunning = true
    this.isPaused = false
    this.currentStageIndex = 0
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

  update(deltaTime) {
    if (!this.isRunning || this.isPaused || this.isComplete()) {
      return
    }

    const dt = Math.max(toNumber(deltaTime, 0), 0)
    const stage = this.stages[this.currentStageIndex]
    if (!stage) return

    stage.update(dt)
    this.totalElapsed += dt

    const renderState = stage.getRenderState()
    this.history.push({
      t: this.totalElapsed,
      stageIndex: this.currentStageIndex,
      stageType: stage.type,
      state: JSON.parse(JSON.stringify(renderState)),
    })

    const transition = this._findTransition(this.currentStageIndex)
    const shouldTransition = transition
      ? stage.checkTransitionCondition(transition)
      : stage.checkTransitionCondition({ condition: 'stage_complete' })

    if (shouldTransition) {
      this._advance(transition)
    }

    if (this.callbacks.onUpdate) {
      this.callbacks.onUpdate({
        stageIndex: this.currentStageIndex,
        totalElapsed: this.totalElapsed,
        currentStage: this.stages[this.currentStageIndex] || null,
        isComplete: this.isComplete(),
      })
    }

    if (this.isComplete()) {
      this.isRunning = false
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete({
          totalTime: this.totalElapsed,
          history: this.getHistory(),
          stages: this.stages,
        })
      }
    }
  }

  getCurrentState() {
    const currentIndex = Math.min(this.currentStageIndex, Math.max(this.stages.length - 1, 0))
    const stage = this.stages[currentIndex] || null
    const completed = this.stages.filter((item) => item?.isComplete).length
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      stageIndex: currentIndex,
      stageType: stage?.type || null,
      stageState: stage?.getRenderState?.() || null,
      stageCount: this.stages.length,
      completedStages: completed,
      totalElapsed: this.totalElapsed,
      progress: this.getProgress(),
      isComplete: this.isComplete(),
    }
  }

  getState() {
    return this.getCurrentState()
  }

  reset() {
    this.stages.forEach((stage) => stage.reset?.())
    this.transitions.forEach((transition) => {
      transition._instance?.reset?.()
      if (transition._instance == null && transition.triggered) {
        transition.triggered = false
      }
    })
    this.currentStageIndex = 0
    this.totalElapsed = 0
    this.isRunning = false
    this.isPaused = false
    this.history = []
    return this
  }

  pause() {
    this.isPaused = true
    return this
  }

  resume() {
    this.isPaused = false
    this.isRunning = !this.isComplete()
    return this
  }

  stop() {
    this.isRunning = false
    this.isPaused = false
    return this
  }

  getTotalTime() {
    return this.totalElapsed
  }

  isComplete() {
    if (!this.stages.length) return true
    if (this.currentStageIndex >= this.stages.length) return true
    const stage = this.stages[this.currentStageIndex]
    return this.currentStageIndex === this.stages.length - 1 && Boolean(stage?.isComplete)
  }

  getCurrentStage() {
    return this.stages[this.currentStageIndex] || null
  }

  getStages() {
    return [...this.stages]
  }

  getHistory() {
    return [...this.history]
  }

  jumpToStage(stageIndex) {
    const index = toNumber(stageIndex, 0)
    if (index < 0 || index >= this.stages.length) {
      throw new Error(`Invalid stage index: ${stageIndex}`)
    }

    this.stages.forEach((stage) => stage.reset?.())
    this.currentStageIndex = index
    this.totalElapsed = 0
    this.history = []
    this.stages[index].initialize()

    if (this.callbacks.onStageChange) {
      this.callbacks.onStageChange({
        previousIndex: -1,
        currentIndex: index,
        stage: this.stages[index],
      })
    }

    return this
  }

  getProgress() {
    if (!this.stages.length) return 0
    const fractional = this.currentStageIndex / this.stages.length
    return Math.max(0, Math.min(1, fractional))
  }

  _findTransition(stageIndex) {
    return this.transitions.find((transition) => transition.from === stageIndex) || null
  }

  _advance(transition) {
    const currentStage = this.stages[this.currentStageIndex]
    currentStage.isComplete = true

    const output = currentStage.getOutputState()
    const nextIndex = Number.isFinite(transition?.to) ? transition.to : this.currentStageIndex + 1
    const nextStage = this.stages[nextIndex]

    if (!nextStage) {
      this.currentStageIndex = this.stages.length
      return
    }

    const mappedVariables = this._mapOutputToStageInput(output, nextStage.type, nextStage.variables)
    nextStage.initialize(mappedVariables, output)

    const previousIndex = this.currentStageIndex
    this.currentStageIndex = nextIndex

    if (this.callbacks.onTransition) {
      this.callbacks.onTransition({
        transition: transition || null,
        fromStage: currentStage,
        toStage: nextStage,
        output,
        mappedVariables,
      })
    }

    if (this.callbacks.onStageChange) {
      this.callbacks.onStageChange({
        previousIndex,
        currentIndex: nextIndex,
        stage: nextStage,
      })
    }
  }

  _mapOutputToStageInput(output, nextType, currentVariables = {}) {
    const mapped = { ...currentVariables }
    const position = output?.position || { x: 0, y: 0, z: 0 }
    const velocity = output?.velocity || { x: 0, y: 0, z: 0 }
    const speed = Number.isFinite(output?.velocityMagnitude) ? output.velocityMagnitude : speedFromVector(velocity)
    const angle = Number.isFinite(output?.angle) ? output.angle : angleFromVelocity(velocity)

    if (nextType === 'projectile') {
      mapped.velocity = speed
      mapped.angle = angle
      mapped.height = toNumber(position.y, 0)
      mapped.position = { x: toNumber(position.x, 0), y: toNumber(position.y, 0), z: 0 }
      return mapped
    }

    if (nextType === 'free_fall') {
      mapped.height = Math.max(toNumber(position.y, mapped.height || 0), 0)
      mapped.position = { x: toNumber(position.x, 0), y: toNumber(position.y, mapped.height || 0), z: 0 }
      mapped.initialVelocityX = toNumber(velocity.x, 0)
      mapped.initialVelocityY = toNumber(velocity.y, 0)
      return mapped
    }

    if (nextType === 'collisions') {
      mapped.velocity1 = Number.isFinite(mapped.velocity1) ? mapped.velocity1 : toNumber(velocity.x, toNumber(velocity.y, 0))
      mapped.position1 = Number.isFinite(mapped.position1) ? mapped.position1 : -1
      mapped.position2 = Number.isFinite(mapped.position2) ? mapped.position2 : 1
      return mapped
    }

    if (nextType === 'spring_launch' || nextType === 'spring_mass') {
      if (!Number.isFinite(mapped.compression)) {
        mapped.compression = Math.max(speed / 20, 0.1)
      }
      return mapped
    }

    if (nextType === 'inclined_plane') {
      mapped.initialSpeed = speed
      mapped.startX = toNumber(position.x, 0)
      mapped.baseY = toNumber(position.y, 0)
      return mapped
    }

    return mapped
  }
}

export default SimulationPipeline
