/**
 * Physics Stage Implementations - Concrete stage types for different physics concepts
 * Each stage handles specific physics calculations and transitions
 */

import { SimulationStage } from './simulationPipeline.js'

/**
 * Inclined Plane Stage
 */
export class InclinedPlaneStage extends SimulationStage {
  constructor(variables, index) {
    super(`incline_${index}`, 'inclined_plane', variables, index)
    this.setupPhysics()
  }

  setupPhysics() {
    const angle = (this.variables.angle || 30) * (Math.PI / 180)
    const friction = this.variables.friction || 0
    const mass = this.variables.mass || 1
    const height = this.variables.height || 5

    // Calculate incline length
    this.inclineLength = height / Math.sin(angle)
    this.angle = angle
    this.friction = friction
    this.mass = mass
    this.height = height

    // Physics constants
    this.gravity = 9.81
    this.distance = 0
    this.maxDistance = this.inclineLength
  }

  updatePhysics(deltaTime) {
    if (this.state.complete) return

    // Calculate acceleration down incline
    const angle = this.angle
    const friction = this.friction
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)

    // Net acceleration: a = g(sin(θ) - μcos(θ))
    const acceleration = this.gravity * (sinAngle - friction * cosAngle)

    // Update velocity and position
    this.state.velocity.x += acceleration * deltaTime
    this.distance += this.state.velocity.x * deltaTime + 0.5 * acceleration * deltaTime * deltaTime

    // Clamp distance
    if (this.distance >= this.maxDistance) {
      this.distance = this.maxDistance
      // Position at bottom of incline
      this.state.position.x = this.maxDistance * Math.cos(angle)
      this.state.position.y = this.maxDistance * Math.sin(angle)

      // Velocity direction changes to angle of incline
      const speed = this.state.velocity.x
      this.state.velocity.x = speed * Math.cos(angle)
      this.state.velocity.y = speed * Math.sin(angle)

      this.state.complete = true
    } else {
      // Update position along incline
      this.state.position.x = this.distance * Math.cos(angle)
      this.state.position.y = this.distance * Math.sin(angle)
    }

    // Record data
    this.recordDataPoint(this.state.elapsed, this.distance)
  }

  /**
   * Check if object reached bottom
   */
  checkTransitionCondition(condition = {}) {
    if (condition.type === 'position' && condition.axis === 'distance') {
      return this.distance >= this.maxDistance
    }
    return super.checkTransitionCondition(condition)
  }
}

/**
 * Projectile Motion Stage
 */
export class ProjectileStage extends SimulationStage {
  constructor(variables, index) {
    super(`projectile_${index}`, 'projectile', variables, index)
    this.setupPhysics()
  }

  setupPhysics() {
    const velocity = this.variables.velocity || 20
    const launchAngle = (this.variables.angle || 45) * (Math.PI / 180)

    this.gravity = 9.81
    this.mass = this.variables.mass || 1

    // Initial velocity components
    this.state.velocity.x = velocity * Math.cos(launchAngle)
    this.state.velocity.y = velocity * Math.sin(launchAngle)

    this.state.acceleration.y = -this.gravity

    this.launchAngle = launchAngle
    this.initialHeight = this.variables.height || 0
    this.state.position.y = this.initialHeight
  }

  updatePhysics(deltaTime) {
    if (this.state.complete) return

    // Horizontal: constant velocity
    this.state.position.x += this.state.velocity.x * deltaTime

    // Vertical: acceleration due to gravity
    this.state.velocity.y += this.state.acceleration.y * deltaTime
    this.state.position.y += this.state.velocity.y * deltaTime + 0.5 * this.state.acceleration.y * deltaTime * deltaTime

    // Check if hit ground
    if (this.state.position.y <= 0) {
      this.state.position.y = 0
      this.state.velocity.y = 0
      this.state.complete = true
    }

    // Record data
    const range = this.state.position.x
    const height = this.state.position.y
    this.recordDataPoint(range, height)
  }
}

/**
 * Pendulum Stage
 */
export class PendulumStage extends SimulationStage {
  constructor(variables, index) {
    super(`pendulum_${index}`, 'pendulum', variables, index)
    this.setupPhysics()
  }

  setupPhysics() {
    this.length = this.variables.length || 1
    this.mass = this.variables.mass || 1
    this.gravity = 9.81
    this.damping = this.variables.damping || 0

    // Initial angle (in radians)
    this.angle = (this.variables.angle || 45) * (Math.PI / 180)
    this.angularVelocity = 0

    // Period and frequency
    this.period = 2 * Math.PI * Math.sqrt(this.length / this.gravity)
    this.frequency = 1 / this.period
  }

  updatePhysics(deltaTime) {
    if (this.state.complete) return

    // Pendulum equation: θ'' + (g/L)θ + dampingθ' = 0
    const angularAcceleration = -(this.gravity / this.length) * Math.sin(this.angle) - this.damping * this.angularVelocity

    this.angularVelocity += angularAcceleration * deltaTime
    this.angle += this.angularVelocity * deltaTime

    // Clamp angle to prevent flip-over
    if (Math.abs(this.angle) > Math.PI) {
      this.angle = Math.sign(this.angle) * Math.PI
    }

    // Position at end of pendulum
    this.state.position.x = this.length * Math.sin(this.angle)
    this.state.position.y = -this.length * Math.cos(this.angle)

    // Velocity tangent to arc
    const speed = Math.abs(this.angularVelocity) * this.length
    this.state.velocity.x = this.angularVelocity * this.length * Math.cos(this.angle)
    this.state.velocity.y = this.angularVelocity * this.length * Math.sin(this.angle)

    // Stop if damped to near-zero
    if (Math.abs(this.angle) < 0.01 && Math.abs(this.angularVelocity) < 0.01) {
      this.state.complete = true
    }

    // Record data
    this.recordDataPoint(this.state.elapsed, this.angle * (180 / Math.PI))
  }
}

/**
 * Spring-Mass Stage
 */
export class SpringMassStage extends SimulationStage {
  constructor(variables, index) {
    super(`spring_${index}`, 'spring_mass', variables, index)
    this.setupPhysics()
  }

  setupPhysics() {
    this.k = this.variables.k || 100 // Spring constant N/m
    this.mass = this.variables.mass || 1 // kg
    this.displacement = this.variables.displacement || 0.1 // initial displacement in m
    this.damping = this.variables.damping || 0

    // Natural frequency
    this.omega = Math.sqrt(this.k / this.mass)
    this.period = 2 * Math.PI / this.omega

    // Initial position and velocity
    this.state.position.x = this.displacement
    this.state.velocity.x = 0
  }

  updatePhysics(deltaTime) {
    if (this.state.complete) return

    // Spring-mass equation: x'' + (k/m)x + dampingx' = 0
    const springForce = -this.k * this.state.position.x
    const dampingForce = -this.damping * this.state.velocity.x
    const totalForce = springForce + dampingForce

    const acceleration = totalForce / this.mass

    // Update velocity and position
    this.state.velocity.x += acceleration * deltaTime
    this.state.position.x += this.state.velocity.x * deltaTime

    // Stop if damped to rest
    const maxDisplacement = Math.abs(this.displacement)
    if (Math.abs(this.state.position.x) < 0.001 && Math.abs(this.state.velocity.x) < 0.001) {
      this.state.complete = true
    }

    // Record data
    this.recordDataPoint(this.state.elapsed, this.state.position.x)
  }
}

/**
 * Collision Stage
 */
export class CollisionStage extends SimulationStage {
  constructor(variables, index) {
    super(`collision_${index}`, 'collisions', variables, index)
    this.setupPhysics()
  }

  setupPhysics() {
    this.mass1 = this.variables.mass1 || 1
    this.mass2 = this.variables.mass2 || 1
    this.velocity1 = this.variables.velocity1 || 5
    this.velocity2 = this.variables.velocity2 || 0
    this.elasticity = this.variables.elasticity || 1 // coefficient of restitution

    // Initial positions
    this.pos1 = 0
    this.pos2 = 10 // 10m apart
    this.collided = false
    this.separationStart = -1
  }

  updatePhysics(deltaTime) {
    if (this.state.complete) return

    // Update positions
    this.pos1 += this.velocity1 * deltaTime
    this.pos2 += this.velocity2 * deltaTime

    // Check for collision
    if (!this.collided && this.pos1 >= this.pos2) {
      this.collided = true
      this.separationStart = this.state.elapsed

      // Apply conservation of momentum and coefficient of restitution
      const vCenterMass = (this.mass1 * this.velocity1 + this.mass2 * this.velocity2) / (this.mass1 + this.mass2)
      const relativeVelocity = this.velocity1 - this.velocity2

      this.velocity1 = vCenterMass - (this.elasticity * relativeVelocity) * (this.mass2 / (this.mass1 + this.mass2))
      this.velocity2 = vCenterMass + (this.elasticity * relativeVelocity) * (this.mass1 / (this.mass1 + this.mass2))
    }

    // Stop after separation continues for a bit
    if (this.collided && this.separationStart > 0 && this.state.elapsed - this.separationStart > 1.0) {
      this.state.complete = true
    }

    // Record data
    this.recordDataPoint(this.state.elapsed, this.pos1)
  }
}

/**
 * Factory function to create appropriate stage based on type
 */
export function createStage(type, variables, index) {
  switch (type) {
    case 'inclined_plane':
      return new InclinedPlaneStage(variables, index)
    case 'projectile':
      return new ProjectileStage(variables, index)
    case 'pendulum':
      return new PendulumStage(variables, index)
    case 'spring_mass':
      return new SpringMassStage(variables, index)
    case 'collisions':
      return new CollisionStage(variables, index)
    default:
      throw new Error(`Unknown stage type: ${type}`)
  }
}

export default {
  InclinedPlaneStage,
  ProjectileStage,
  PendulumStage,
  SpringMassStage,
  CollisionStage,
  createStage,
}
