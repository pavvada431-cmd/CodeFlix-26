/**
 * Multi-concept problem parsing and pipeline orchestration.
 */

import { SimulationPipeline, StageTransition } from './simulationPipeline.js'
import { createStage } from './simulationStages.js'

const STAGE_DISPLAY_NAMES = {
  inclined_plane: 'Inclined Plane',
  projectile: 'Projectile Motion',
  free_fall: 'Free Fall',
  collisions: 'Collision',
  spring_launch: 'Spring Launch',
}

function normalizeTransition(transition, index, stageCount) {
  const from = Number.isFinite(transition?.from) ? transition.from : index
  const to = Number.isFinite(transition?.to) ? transition.to : index + 1
  const condition = transition?.condition || transition?.type || 'stage_complete'
  const value = transition?.value ?? transition?.conditionValue ?? 0

  if (from < 0 || to < 0 || from >= stageCount || to >= stageCount) {
    return null
  }

  return {
    from,
    to,
    condition,
    value,
    label: transition?.label || `Stage ${from + 1} → ${to + 1}`,
  }
}

function normalizeStage(stage, fallbackType) {
  if (!stage || typeof stage !== 'object') {
    return null
  }
  const type = stage.type || fallbackType
  if (!type) return null
  return {
    type,
    variables: typeof stage.variables === 'object' && stage.variables ? { ...stage.variables } : {},
    units: typeof stage.units === 'object' && stage.units ? { ...stage.units } : {},
  }
}

function detectPatternsFromText(parsedResponse) {
  const chunks = [
    parsedResponse?.problemText,
    parsedResponse?.prompt,
    parsedResponse?.formula,
    parsedResponse?.answer?.explanation,
    ...(Array.isArray(parsedResponse?.steps) ? parsedResponse.steps : []),
  ]
  const text = chunks.filter(Boolean).join(' ').toLowerCase()
  const variables = typeof parsedResponse?.variables === 'object' && parsedResponse.variables
    ? parsedResponse.variables
    : {}

  // Inclined plane → projectile
  if (/(ramp|incline|inclined plane).*(projectile|flies|launched|air)/.test(text)) {
    return {
      isMultiConcept: true,
      stages: [
        { type: 'inclined_plane', variables: { ...variables } },
        { type: 'projectile', variables: { ...variables, angle: variables.angle ?? 0 } },
      ],
      transitions: [{ from: 0, to: 1, condition: 'position_threshold', value: 0 }],
    }
  }

  // Free fall → collision
  if (/(free fall|falls|dropped).*(collid|hits|impact)/.test(text)) {
    return {
      isMultiConcept: true,
      stages: [
        { type: 'free_fall', variables: { ...variables } },
        { type: 'collisions', variables: { ...variables } },
      ],
      transitions: [{ from: 0, to: 1, condition: 'position_threshold', value: 0 }],
    }
  }

  // Spring → projectile
  if (/(spring).*(projectile|launch|launched)/.test(text)) {
    return {
      isMultiConcept: true,
      stages: [
        { type: 'spring_launch', variables: { ...variables } },
        { type: 'projectile', variables: { ...variables } },
      ],
      transitions: [{ from: 0, to: 1, condition: 'velocity_change', value: 0 }],
    }
  }

  // Inclined plane → free fall
  if (/(ramp|incline|inclined plane).*(edge|table|off).*(fall|free fall)/.test(text)) {
    return {
      isMultiConcept: true,
      stages: [
        { type: 'inclined_plane', variables: { ...variables } },
        { type: 'free_fall', variables: { ...variables } },
      ],
      transitions: [{ from: 0, to: 1, condition: 'position_threshold', value: 0 }],
    }
  }

  return null
}

export class MultiConceptProblemHandler {
  constructor() {
    this.problem = null
    this.pipeline = null
    this.isMultiConcept = false
    this.stages = []
    this.transitions = []
  }

  parseProblems(parsedResponse) {
    this.problem = parsedResponse || {}

    // Explicit multi-concept format from parser.
    if (this.problem?.isMultiConcept === true && Array.isArray(this.problem?.stages) && this.problem.stages.length > 0) {
      const normalizedStages = this.problem.stages
        .map((stage) => normalizeStage(stage, this.problem?.type))
        .filter(Boolean)

      this.isMultiConcept = normalizedStages.length > 1
      this.stages = normalizedStages
      this.transitions = (Array.isArray(this.problem.transitions) ? this.problem.transitions : [])
        .map((transition, index) => normalizeTransition(transition, index, this.stages.length))
        .filter(Boolean)
      return this
    }

    const detected = detectPatternsFromText(this.problem)
    if (detected) {
      this.isMultiConcept = true
      this.stages = detected.stages.map((stage) => normalizeStage(stage)).filter(Boolean)
      this.transitions = detected.transitions
      return this
    }

    // Fallback single stage
    const fallbackStage = normalizeStage(
      {
        type: this.problem?.type,
        variables: this.problem?.variables,
        units: this.problem?.units,
      },
      this.problem?.type,
    )

    this.isMultiConcept = false
    this.stages = fallbackStage ? [fallbackStage] : []
    this.transitions = []
    return this
  }

  buildPipeline() {
    if (!this.stages.length) {
      throw new Error('No valid stages available for pipeline construction')
    }

    const pipeline = new SimulationPipeline()
    this.stages.forEach((stageConfig) => {
      pipeline.addStage(createStage(stageConfig.type, stageConfig.variables))
    })

    if (this.transitions.length > 0) {
      this.transitions.forEach((transition) => {
        pipeline.addTransition(
          new StageTransition(
            transition.from,
            transition.to,
            transition.condition,
            transition.value,
            transition.label,
          ),
        )
      })
    } else {
      for (let index = 0; index < this.stages.length - 1; index += 1) {
        pipeline.addTransition(new StageTransition(index, index + 1, 'stage_complete', 0))
      }
    }

    this.pipeline = pipeline
    return pipeline
  }

  getPipelineInfo() {
    if (!this.pipeline) return null
    return {
      isMultiConcept: this.isMultiConcept,
      stageCount: this.stages.length,
      stages: this.stages.map((stage, index) => ({
        index,
        type: stage.type,
        variables: stage.variables,
        units: stage.units,
      })),
      transitions: this.transitions,
      currentState: this.pipeline.getCurrentState(),
    }
  }

  getStageDisplayName(stageType) {
    return STAGE_DISPLAY_NAMES[stageType] || stageType
  }
}

export class MultiConceptExecutor {
  constructor(pipeline) {
    this.pipeline = pipeline
    this.animationFrameId = null
    this.running = false
    this.lastFrameTime = 0
    this.frameStats = {
      fps: 0,
      frameTimeMs: 0,
    }
  }

  start() {
    if (!this.pipeline) return this
    this.pipeline.start()
    this.running = true
    this.lastFrameTime = performance.now()
    this._animate()
    return this
  }

  stop() {
    this.running = false
    this.pipeline?.stop()
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    return this
  }

  pause() {
    this.pipeline?.pause()
    return this
  }

  resume() {
    this.pipeline?.resume()
    if (!this.running) {
      this.running = true
      this.lastFrameTime = performance.now()
      this._animate()
    }
    return this
  }

  reset() {
    this.stop()
    this.pipeline?.reset()
    return this
  }

  _animate = () => {
    if (!this.running || !this.pipeline) return

    const now = performance.now()
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05)
    this.lastFrameTime = now

    const frameMs = dt * 1000
    this.frameStats.frameTimeMs = frameMs
    this.frameStats.fps = frameMs > 0 ? 1000 / frameMs : 0

    if (!this.pipeline.isPaused) {
      this.pipeline.update(dt)
    }

    if (!this.pipeline.isComplete() && this.pipeline.isRunning) {
      this.animationFrameId = requestAnimationFrame(this._animate)
    } else {
      this.running = false
      this.animationFrameId = null
    }
  }

  getState() {
    return {
      pipelineState: this.pipeline?.getCurrentState() || null,
      frameStats: this.frameStats,
    }
  }

  getHistory() {
    return this.pipeline?.getHistory() || []
  }

  jumpToStage(stageIndex) {
    this.pipeline?.jumpToStage(stageIndex)
    return this
  }

  getProgress() {
    return this.pipeline?.getProgress() || 0
  }
}

export default {
  MultiConceptProblemHandler,
  MultiConceptExecutor,
}
