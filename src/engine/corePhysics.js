/**
 * Core Physics Engine - Pure physics calculations without rendering
 * Uses fixed timestep (60 FPS) with accumulator pattern for stability
 * Physics state is completely separate from rendering
 */

const PHYSICS_TIMESTEP = 1 / 60 // 16.67ms for 60 FPS
const MAX_ACCUMULATOR = 0.1 // Maximum 100ms to prevent spiral of death

/**
 * Creates a physics state object for a body
 */
export function createPhysicsBody(options = {}) {
  return {
    id: options.id ?? Math.random().toString(36).slice(2),
    mass: Math.max(0.001, options.mass ?? 1),
    position: {
      x: options.position?.x ?? options.x ?? 0,
      y: options.position?.y ?? options.y ?? 0,
      z: options.position?.z ?? options.z ?? 0,
    },
    velocity: {
      x: options.velocity?.x ?? 0,
      y: options.velocity?.y ?? 0,
      z: options.velocity?.z ?? 0,
    },
    acceleration: {
      x: 0,
      y: 0,
      z: 0,
    },
    rotation: {
      x: options.rotation?.x ?? 0,
      y: options.rotation?.y ?? 0,
      z: options.rotation?.z ?? 0,
    },
    angularVelocity: {
      x: 0,
      y: 0,
      z: 0,
    },
    forces: [], // Array of force vectors
    isStatic: options.isStatic ?? false,
    friction: Math.max(0, Math.min(1, options.friction ?? 0)),
    restitution: Math.max(0, Math.min(1, options.restitution ?? 0)),
    shape: options.shape ?? 'box', // 'box', 'sphere', 'plane'
    size: {
      width: options.size?.width ?? 1,
      height: options.size?.height ?? 1,
      depth: options.size?.depth ?? 1,
      radius: options.size?.radius ?? 0.5,
    },
    // Interpolation state for smooth rendering
    previousPosition: {
      x: options.position?.x ?? options.x ?? 0,
      y: options.position?.y ?? options.y ?? 0,
      z: options.position?.z ?? options.z ?? 0,
    },
  }
}

/**
 * Gravity force
 */
export function applyGravity(body, gravityVector = { x: 0, y: 9.81, z: 0 }) {
  if (body.isStatic) return

  body.forces.push({
    x: body.mass * gravityVector.x,
    y: body.mass * gravityVector.y,
    z: body.mass * gravityVector.z,
  })
}

/**
 * Friction force
 */
export function applyFriction(body) {
  if (body.isStatic || body.friction === 0) return

  const speed = Math.hypot(body.velocity.x, body.velocity.y, body.velocity.z)
  if (speed < 0.001) {
    body.velocity.x = 0
    body.velocity.y = 0
    body.velocity.z = 0
    return
  }

  const frictionMagnitude = body.friction * body.mass * 9.81
  const frictionX = -(body.velocity.x / speed) * frictionMagnitude
  const frictionY = -(body.velocity.y / speed) * frictionMagnitude
  const frictionZ = -(body.velocity.z / speed) * frictionMagnitude

  body.forces.push({ x: frictionX, y: frictionY, z: frictionZ })
}

/**
 * Clamp velocity to prevent extreme values
 */
export function clampVelocity(body, maxSpeed = 100) {
  const speed = Math.hypot(body.velocity.x, body.velocity.y, body.velocity.z)

  if (speed > maxSpeed) {
    const scale = maxSpeed / speed
    body.velocity.x *= scale
    body.velocity.y *= scale
    body.velocity.z *= scale
  }
}

/**
 * Calculate net force from all applied forces
 */
function calculateNetForce(body) {
  let netX = 0,
    netY = 0,
    netZ = 0

  for (const force of body.forces) {
    netX += force.x
    netY += force.y
    netZ += force.z
  }

  return { x: netX, y: netY, z: netZ }
}

/**
 * Step physics simulation by fixed timestep
 */
export function stepPhysics(body, dt = PHYSICS_TIMESTEP) {
  if (body.isStatic) {
    body.forces = []
    return
  }

  // Calculate net force
  const netForce = calculateNetForce(body)

  // Apply F = ma to get acceleration
  body.acceleration.x = netForce.x / body.mass
  body.acceleration.y = netForce.y / body.mass
  body.acceleration.z = netForce.z / body.mass

  // Store previous position for interpolation
  body.previousPosition.x = body.position.x
  body.previousPosition.y = body.position.y
  body.previousPosition.z = body.position.z

  // Update velocity: v = v0 + a*dt
  body.velocity.x += body.acceleration.x * dt
  body.velocity.y += body.acceleration.y * dt
  body.velocity.z += body.acceleration.z * dt

  // Clamp velocity to prevent instability
  clampVelocity(body, 100)

  // Update position: p = p0 + v*dt
  body.position.x += body.velocity.x * dt
  body.position.y += body.velocity.y * dt
  body.position.z += body.velocity.z * dt

  // Update rotation (simplified)
  body.rotation.x += body.angularVelocity.x * dt
  body.rotation.y += body.angularVelocity.y * dt
  body.rotation.z += body.angularVelocity.z * dt

  // Clear forces for next step
  body.forces = []
}

/**
 * Core Physics Engine Class
 */
export class CorePhysicsEngine {
  constructor() {
    this.bodies = new Map() // id -> body
    this.gravity = { x: 0, y: 9.81, z: 0 }
    this.accumulator = 0
    this.time = 0
    this.paused = false
    this.debugInfo = {
      stepsPerFrame: 0,
      totalBodies: 0,
    }
  }

  /**
   * Add a body to the simulation
   */
  addBody(options = {}) {
    const body = createPhysicsBody(options)
    this.bodies.set(body.id, body)
    return body.id
  }

  /**
   * Get body by ID
   */
  getBody(id) {
    return this.bodies.get(id) ?? null
  }

  /**
   * Update simulation by deltaTime
   * Uses accumulator pattern for fixed timestep
   */
  update(deltaTime) {
    if (this.paused) return

    // Prevent spiral of death with excessive deltaTime
    const clampedDelta = Math.min(deltaTime, MAX_ACCUMULATOR)
    this.accumulator += clampedDelta

    let stepsThisFrame = 0

    // Process fixed timesteps
    while (this.accumulator >= PHYSICS_TIMESTEP) {
      this.step()
      this.accumulator -= PHYSICS_TIMESTEP
      stepsThisFrame++
    }

    this.time += clampedDelta
    this.debugInfo.stepsPerFrame = stepsThisFrame
    this.debugInfo.totalBodies = this.bodies.size
  }

  /**
   * Single physics step
   */
  step() {
    // Apply forces to all bodies
    for (const body of this.bodies.values()) {
      if (body.isStatic) continue

      // Apply gravity
      applyGravity(body, this.gravity)

      // Apply friction
      applyFriction(body, { x: 0, y: 1, z: 0 })
    }

    // Update all bodies
    for (const body of this.bodies.values()) {
      stepPhysics(body, PHYSICS_TIMESTEP)
    }
  }

  /**
   * Apply a force to a body
   */
  applyForce(bodyId, force) {
    const body = this.getBody(bodyId)
    if (body && !body.isStatic) {
      body.forces.push({ ...force })
    }
  }

  /**
   * Set velocity directly
   */
  setVelocity(bodyId, velocity) {
    const body = this.getBody(bodyId)
    if (body) {
      body.velocity.x = velocity.x ?? 0
      body.velocity.y = velocity.y ?? 0
      body.velocity.z = velocity.z ?? 0
    }
  }

  /**
   * Set gravity
   */
  setGravity(gravity) {
    this.gravity = { ...gravity }
  }

  /**
   * Get all body states
   */
  getBodyStates() {
    return Array.from(this.bodies.values()).map((body) => ({
      id: body.id,
      position: { ...body.position },
      velocity: { ...body.velocity },
      acceleration: { ...body.acceleration },
      rotation: { ...body.rotation },
      forces: [...body.forces],
    }))
  }

  /**
   * Get interpolated position between frames
   */
  getInterpolatedPosition(bodyId, alpha) {
    const body = this.getBody(bodyId)
    if (!body) return null

    // Linear interpolation: p = p_prev + (p_current - p_prev) * alpha
    return {
      x: body.previousPosition.x + (body.position.x - body.previousPosition.x) * alpha,
      y: body.previousPosition.y + (body.position.y - body.previousPosition.y) * alpha,
      z: body.previousPosition.z + (body.position.z - body.previousPosition.z) * alpha,
    }
  }

  /**
   * Reset entire simulation
   */
  reset() {
    this.bodies.clear()
    this.accumulator = 0
    this.time = 0
  }

  /**
   * Pause/unpause simulation
   */
  setPaused(paused) {
    this.paused = Boolean(paused)
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return { ...this.debugInfo, time: this.time, accumulator: this.accumulator }
  }
}

export const PHYSICS_CONFIG = {
  TIMESTEP: PHYSICS_TIMESTEP,
  MAX_ACCUMULATOR,
}
