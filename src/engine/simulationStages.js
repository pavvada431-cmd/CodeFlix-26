/**
 * Multi-concept simulation stage implementations.
 * Each stage is self-contained and can pass output into the next stage.
 */

const EPSILON = 1e-6
const GRAVITY = 9.81

function toNumber(value, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback
}

function toRadians(degrees) {
  return (toNumber(degrees, 0) * Math.PI) / 180
}

function toDegrees(radians) {
  return (toNumber(radians, 0) * 180) / Math.PI
}

function magnitude2D(vector = { x: 0, y: 0 }) {
  return Math.hypot(toNumber(vector.x, 0), toNumber(vector.y, 0))
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state))
}

export class BaseSimulationStage {
  constructor(type, variables = {}) {
    this.type = type
    this.baseVariables = { ...variables }
    this.variables = { ...variables }
    this.state = this._createInitialState()
    this.initialState = cloneState(this.state)
    this.isInitialized = false
    this.isComplete = false
    this.elapsedTime = 0
    this.totalTime = 0
    this.lastOutput = null
  }

  _createInitialState() {
    return {
      t: 0,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      metrics: {},
      complete: false,
    }
  }

  initialize(variableOverrides = {}, inheritedOutput = null) {
    this.variables = { ...this.baseVariables, ...variableOverrides }
    this.state = this._createInitialState()
    this.initialState = cloneState(this.state)
    this.isInitialized = true
    this.isComplete = false
    this.elapsedTime = 0
    this.totalTime = 0
    this.lastOutput = null
    this.setupPhysics(inheritedOutput)
    return this
  }

  // To be implemented by subclasses
  setupPhysics() {}
  updatePhysics() {}

  update(deltaTime) {
    if (!this.isInitialized) {
      this.initialize()
    }
    if (this.isComplete) {
      return this.getRenderState()
    }

    const dt = Math.max(0, toNumber(deltaTime, 0))
    this.elapsedTime += dt
    this.state.t = this.elapsedTime

    this.updatePhysics(dt)
    this.state.complete = this.isComplete
    this.lastOutput = this.getOutputState()
    return this.getRenderState()
  }

  checkTransitionCondition(transition = {}) {
    const condition = transition.condition || transition.type || 'stage_complete'
    const value = transition.value ?? transition.conditionValue

    if (condition === 'stage_complete') {
      return this.isComplete
    }

    if (condition === 'time_based') {
      return this.elapsedTime >= toNumber(value, 0)
    }

    if (condition === 'position_threshold') {
      if (typeof value === 'object' && value !== null) {
        if (Number.isFinite(value.x) && this.state.position.x >= value.x) return true
        if (Number.isFinite(value.y) && this.state.position.y <= value.y) return true
        return false
      }
      // Default to y-threshold for gravity-driven transitions.
      return this.state.position.y <= toNumber(value, 0)
    }

    if (condition === 'velocity_change') {
      const speed = magnitude2D(this.state.velocity)
      return speed <= Math.max(toNumber(value, 0), EPSILON)
    }

    return this.isComplete
  }

  getOutputState() {
    const speed = magnitude2D(this.state.velocity)
    return {
      type: this.type,
      elapsed: this.elapsedTime,
      position: { ...this.state.position },
      velocity: { ...this.state.velocity },
      acceleration: { ...this.state.acceleration },
      velocityMagnitude: speed,
      angle: toDegrees(Math.atan2(this.state.velocity.y, this.state.velocity.x)),
      metrics: { ...this.state.metrics },
    }
  }

  getRenderState() {
    return {
      type: this.type,
      elapsed: this.elapsedTime,
      complete: this.isComplete,
      variables: { ...this.variables },
      ...this.getOutputState(),
    }
  }

  reset() {
    this.variables = { ...this.baseVariables }
    this.state = cloneState(this.initialState)
    this.isInitialized = false
    this.isComplete = false
    this.elapsedTime = 0
    this.totalTime = 0
    this.lastOutput = null
    return this
  }
}

export class InclinedPlaneStage extends BaseSimulationStage {
  constructor(variables = {}) {
    super('inclined_plane', variables)
  }

  setupPhysics(inheritedOutput) {
    this.mass = Math.max(toNumber(this.variables.mass, 1), EPSILON)
    this.angleDeg = toNumber(this.variables.angle, 30)
    this.angle = toRadians(this.angleDeg)
    this.friction = Math.max(toNumber(this.variables.friction, 0), 0)

    const inputHeight = toNumber(this.variables.height, NaN)
    const inputLength = toNumber(this.variables.length, NaN)
    if (Number.isFinite(inputLength) && inputLength > EPSILON) {
      this.length = inputLength
      this.height = Number.isFinite(inputHeight) ? inputHeight : this.length * Math.sin(Math.abs(this.angle))
    } else {
      this.height = Number.isFinite(inputHeight) && inputHeight > EPSILON ? inputHeight : 5
      const denom = Math.max(Math.abs(Math.sin(this.angle)), 0.01)
      this.length = this.height / denom
    }

    const inheritedPos = inheritedOutput?.position || {}
    const startX = toNumber(this.variables.startX, toNumber(inheritedPos.x, 0))
    const baseY = toNumber(this.variables.baseY, 0)
    this.topY = baseY + this.height
    this.startX = startX
    this.distanceAlong = 0

    const slopeUnit = { x: Math.cos(this.angle), y: -Math.sin(this.angle) }
    const inheritedVelocity = inheritedOutput?.velocity || { x: 0, y: 0 }
    const inheritedAlongSpeed = inheritedVelocity.x * slopeUnit.x + inheritedVelocity.y * slopeUnit.y
    const initialSpeed = Math.max(toNumber(this.variables.initialSpeed, inheritedAlongSpeed), 0)

    this.speedAlong = initialSpeed
    this.accAlong = Math.max(GRAVITY * (Math.sin(this.angle) - this.friction * Math.cos(this.angle)), 0)

    this.state.position.x = this.startX
    this.state.position.y = this.topY
    this.state.velocity.x = this.speedAlong * slopeUnit.x
    this.state.velocity.y = this.speedAlong * slopeUnit.y
    this.state.acceleration.x = this.accAlong * slopeUnit.x
    this.state.acceleration.y = this.accAlong * slopeUnit.y
    this.state.metrics = {
      distance: 0,
      speed: this.speedAlong,
      inclineLength: this.length,
      angle: this.angleDeg,
    }
  }

  updatePhysics(dt) {
    this.speedAlong += this.accAlong * dt
    this.distanceAlong += this.speedAlong * dt
    if (this.distanceAlong >= this.length) {
      this.distanceAlong = this.length
      this.isComplete = true
    }

    const ux = Math.cos(this.angle)
    const uy = -Math.sin(this.angle)
    this.state.position.x = this.startX + this.distanceAlong * ux
    this.state.position.y = this.topY + this.distanceAlong * uy
    this.state.velocity.x = this.speedAlong * ux
    this.state.velocity.y = this.speedAlong * uy
    this.state.acceleration.x = this.accAlong * ux
    this.state.acceleration.y = this.accAlong * uy
    this.state.metrics = {
      distance: this.distanceAlong,
      speed: this.speedAlong,
      inclineLength: this.length,
      angle: this.angleDeg,
      progress: this.length > EPSILON ? this.distanceAlong / this.length : 1,
    }
  }

  getOutputState() {
    const base = super.getOutputState()
    const speed = this.speedAlong
    return {
      ...base,
      velocityMagnitude: speed,
      angle: toNumber(this.variables.exitAngle, this.angleDeg * -1),
      metrics: {
        ...base.metrics,
        bottomVelocity: speed,
      },
    }
  }
}

export class ProjectileStage extends BaseSimulationStage {
  constructor(variables = {}) {
    super('projectile', variables)
  }

  setupPhysics(inheritedOutput) {
    const inheritedPos = inheritedOutput?.position || {}
    const inheritedVel = inheritedOutput?.velocity || {}

    this.originX = toNumber(this.variables.position?.x, toNumber(inheritedPos.x, 0))
    this.originY = toNumber(this.variables.position?.y, toNumber(this.variables.height, toNumber(inheritedPos.y, 0)))
    this.groundY = toNumber(this.variables.groundY, 0)
    this.gravity = Math.abs(toNumber(this.variables.gravity, GRAVITY))

    const providedSpeed = toNumber(this.variables.velocity, NaN)
    const speed = Number.isFinite(providedSpeed) ? providedSpeed : magnitude2D(inheritedVel)
    const angleDeg = toNumber(this.variables.angle, Number.isFinite(inheritedOutput?.angle) ? inheritedOutput.angle : 45)
    const angle = toRadians(angleDeg)

    const useInheritedVector = Number.isFinite(inheritedVel.x) || Number.isFinite(inheritedVel.y)
    const vx = useInheritedVector && !Number.isFinite(providedSpeed) ? toNumber(inheritedVel.x, 0) : speed * Math.cos(angle)
    const vy = useInheritedVector && !Number.isFinite(providedSpeed) ? toNumber(inheritedVel.y, 0) : speed * Math.sin(angle)

    this.maxHeight = this.originY

    this.state.position.x = this.originX
    this.state.position.y = this.originY
    this.state.velocity.x = vx
    this.state.velocity.y = vy
    this.state.acceleration.x = 0
    this.state.acceleration.y = -this.gravity
    this.state.metrics = {
      range: 0,
      maxHeight: this.originY,
      speed: magnitude2D(this.state.velocity),
    }
  }

  updatePhysics(dt) {
    this.state.velocity.y += this.state.acceleration.y * dt
    this.state.position.x += this.state.velocity.x * dt
    this.state.position.y += this.state.velocity.y * dt

    if (this.state.position.y > this.maxHeight) {
      this.maxHeight = this.state.position.y
    }

    if (this.state.position.y <= this.groundY && this.elapsedTime > EPSILON) {
      this.state.position.y = this.groundY
      this.isComplete = true
    }

    this.state.metrics = {
      range: this.state.position.x - this.originX,
      maxHeight: this.maxHeight,
      speed: magnitude2D(this.state.velocity),
    }
  }

  getOutputState() {
    const base = super.getOutputState()
    return {
      ...base,
      range: this.state.metrics.range,
      maxHeight: this.state.metrics.maxHeight,
      timeOfFlight: this.elapsedTime,
    }
  }
}

export class FreeFallStage extends BaseSimulationStage {
  constructor(variables = {}) {
    super('free_fall', variables)
  }

  setupPhysics(inheritedOutput) {
    const inheritedPos = inheritedOutput?.position || {}
    const inheritedVel = inheritedOutput?.velocity || {}

    this.gravity = Math.abs(toNumber(this.variables.gravity, GRAVITY))
    this.groundY = toNumber(this.variables.groundY, 0)
    this.state.position.x = toNumber(this.variables.position?.x, toNumber(inheritedPos.x, 0))
    this.state.position.y = toNumber(this.variables.position?.y, toNumber(this.variables.height, toNumber(inheritedPos.y, 5)))
    this.state.velocity.x = toNumber(this.variables.initialVelocityX, toNumber(inheritedVel.x, 0))
    this.state.velocity.y = toNumber(this.variables.initialVelocityY, toNumber(inheritedVel.y, 0))
    this.state.acceleration.x = 0
    this.state.acceleration.y = -this.gravity
    this.state.metrics = {
      impactVelocity: 0,
      dropDistance: 0,
    }
    this.startY = this.state.position.y
  }

  updatePhysics(dt) {
    this.state.velocity.y += this.state.acceleration.y * dt
    this.state.position.x += this.state.velocity.x * dt
    this.state.position.y += this.state.velocity.y * dt

    if (this.state.position.y <= this.groundY) {
      this.state.position.y = this.groundY
      this.isComplete = true
    }

    this.state.metrics = {
      impactVelocity: this.isComplete ? magnitude2D(this.state.velocity) : 0,
      dropDistance: this.startY - this.state.position.y,
    }
  }

  getOutputState() {
    const base = super.getOutputState()
    return {
      ...base,
      impactVelocity: magnitude2D(this.state.velocity),
    }
  }
}

export class CollisionStage extends BaseSimulationStage {
  constructor(variables = {}) {
    super('collisions', variables)
  }

  setupPhysics(inheritedOutput) {
    this.mass1 = Math.max(toNumber(this.variables.mass1, 1), EPSILON)
    this.mass2 = Math.max(toNumber(this.variables.mass2, 1), EPSILON)
    this.restitution = Math.max(0, Math.min(1, toNumber(this.variables.elasticity ?? this.variables.restitution, 1)))

    const inheritedVelocity = inheritedOutput?.velocity || {}
    this.v1 = toNumber(this.variables.velocity1, Number.isFinite(inheritedVelocity.y) ? inheritedVelocity.y : toNumber(inheritedVelocity.x, 5))
    this.v2 = toNumber(this.variables.velocity2, 0)

    this.x1 = toNumber(this.variables.position1, -1)
    this.x2 = toNumber(this.variables.position2, 1)
    this.r1 = Math.max(toNumber(this.variables.radius1, 0.15), EPSILON)
    this.r2 = Math.max(toNumber(this.variables.radius2, 0.15), EPSILON)

    this.collided = false
    this.settleTimer = 0

    this.state.position.x = (this.x1 + this.x2) / 2
    this.state.position.y = 0
    this.state.velocity.x = this.v1
    this.state.velocity.y = 0
    this.state.metrics = {
      object1X: this.x1,
      object2X: this.x2,
      velocity1: this.v1,
      velocity2: this.v2,
      collided: false,
    }
  }

  updatePhysics(dt) {
    if (!this.collided) {
      this.x1 += this.v1 * dt
      this.x2 += this.v2 * dt
      if (this.x1 + this.r1 >= this.x2 - this.r2) {
        this.collided = true
        const u1 = this.v1
        const u2 = this.v2
        this.v1 = (
          (this.mass1 * u1 + this.mass2 * u2 - this.mass2 * this.restitution * (u1 - u2)) /
          (this.mass1 + this.mass2)
        )
        this.v2 = (
          (this.mass1 * u1 + this.mass2 * u2 + this.mass1 * this.restitution * (u1 - u2)) /
          (this.mass1 + this.mass2)
        )
      }
    } else {
      this.x1 += this.v1 * dt
      this.x2 += this.v2 * dt
      this.settleTimer += dt
      if (this.settleTimer >= 0.6) {
        this.isComplete = true
      }
    }

    this.state.position.x = (this.x1 + this.x2) / 2
    this.state.velocity.x = this.v1
    this.state.metrics = {
      object1X: this.x1,
      object2X: this.x2,
      velocity1: this.v1,
      velocity2: this.v2,
      collided: this.collided,
    }
  }

  getOutputState() {
    const base = super.getOutputState()
    return {
      ...base,
      postCollisionVelocity1: this.v1,
      postCollisionVelocity2: this.v2,
      velocity: { x: this.v1, y: 0, z: 0 },
    }
  }
}

export class SpringLaunchStage extends BaseSimulationStage {
  constructor(variables = {}) {
    super('spring_launch', variables)
  }

  setupPhysics(inheritedOutput) {
    this.k = Math.max(toNumber(this.variables.k ?? this.variables.springConstant, 100), EPSILON)
    this.mass = Math.max(toNumber(this.variables.mass, 1), EPSILON)
    this.damping = Math.max(toNumber(this.variables.damping, 0), 0)
    this.compression = Math.max(toNumber(this.variables.compression ?? this.variables.displacement, 0.25), 0)
    this.launchAngle = toNumber(this.variables.launchAngle, 45)

    if (inheritedOutput?.velocity) {
      const inheritedSpeed = magnitude2D(inheritedOutput.velocity)
      if (inheritedSpeed > EPSILON) {
        this.compression = Math.max(this.compression, inheritedSpeed / 20)
      }
    }

    this.x = this.compression
    this.v = 0
    this.launchVelocity = 0

    this.state.position.x = this.x
    this.state.position.y = 0
    this.state.velocity.x = 0
    this.state.velocity.y = 0
    this.state.metrics = {
      compression: this.x,
      springEnergy: 0.5 * this.k * this.x * this.x,
      launchVelocity: 0,
    }
  }

  updatePhysics(dt) {
    // m x'' + b x' + kx = 0
    const acceleration = (-(this.k / this.mass) * this.x) - ((this.damping / this.mass) * this.v)
    this.v += acceleration * dt
    this.x += this.v * dt

    if (this.x <= 0) {
      this.launchVelocity = Math.max(this.v, 0)
      this.x = 0
      this.isComplete = true
    }

    this.state.position.x = this.x
    this.state.velocity.x = this.v
    this.state.metrics = {
      compression: this.x,
      springEnergy: 0.5 * this.k * this.x * this.x,
      launchVelocity: this.launchVelocity,
    }
  }

  getOutputState() {
    const base = super.getOutputState()
    const speed = this.launchVelocity > EPSILON ? this.launchVelocity : Math.max(this.v, 0)
    const launchAngleRad = toRadians(this.launchAngle)
    return {
      ...base,
      velocityMagnitude: speed,
      angle: this.launchAngle,
      velocity: {
        x: speed * Math.cos(launchAngleRad),
        y: speed * Math.sin(launchAngleRad),
        z: 0,
      },
      launchVelocity: speed,
    }
  }
}

export function createStage(type, variables = {}) {
  switch (type) {
    case 'inclined_plane':
      return new InclinedPlaneStage(variables)
    case 'projectile':
      return new ProjectileStage(variables)
    case 'free_fall':
      return new FreeFallStage(variables)
    case 'collisions':
      return new CollisionStage(variables)
    case 'spring_launch':
    case 'spring_mass':
      return new SpringLaunchStage(variables)
    default:
      throw new Error(`Unknown multi-concept stage type: ${type}`)
  }
}

export default {
  BaseSimulationStage,
  InclinedPlaneStage,
  ProjectileStage,
  FreeFallStage,
  CollisionStage,
  SpringLaunchStage,
  createStage,
}
