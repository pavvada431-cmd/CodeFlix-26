/**
 * Simulation Manager - Orchestrates physics and rendering
 * Manages the main loop and synchronization between engines
 */

import { CorePhysicsEngine, PHYSICS_CONFIG } from './corePhysics.js'
import { RenderEngine } from './renderEngine.js'

export class SimulationManager {
  constructor(canvasElement = null) {
    this.physicsEngine = new CorePhysicsEngine()
    this.renderEngine = new RenderEngine(canvasElement)

    this.running = false
    this.animationFrameId = null
    this.lastFrameTime = performance.now()
    this.frameTime = 0

    // Interpolation setup
    this.alpha = 0 // 0 to 1, used for interpolation
    this.frameStats = {
      fps: 0,
      avgFrameTime: 0,
      physicSteps: 0,
    }

    this.frameTimeBuffer = []
    this.maxFrameBufferSize = 60
  }

  /**
   * Initialize simulation
   */
  initialize(canvasElement = null) {
    if (canvasElement) {
      this.renderEngine.setCanvas(canvasElement)
    }
    return this
  }

  /**
   * Add a physics body to the simulation
   */
  addBody(options = {}) {
    const bodyId = this.physicsEngine.addBody(options)

    // Register for rendering
    this.renderEngine.registerBody(bodyId, {
      shape: options.shape,
      color: options.color,
      label: options.label,
      visible: true,
    })

    return bodyId
  }

  /**
   * Apply force to a body
   */
  applyForce(bodyId, force) {
    this.physicsEngine.applyForce(bodyId, force)
    return this
  }

  /**
   * Set body velocity
   */
  setVelocity(bodyId, velocity) {
    this.physicsEngine.setVelocity(bodyId, velocity)
    return this
  }

  /**
   * Set simulation gravity
   */
  setGravity(gravity) {
    this.physicsEngine.setGravity(gravity)
    return this
  }

  /**
   * Start the simulation
   */
  start() {
    if (this.running) return

    this.running = true
    this.lastFrameTime = performance.now()
    this.frameTime = 0
    this.animate()
    return this
  }

  /**
   * Stop the simulation
   */
  stop() {
    this.running = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    return this
  }

  /**
   * Pause/unpause simulation
   */
  setPaused(paused) {
    this.physicsEngine.setPaused(paused)
    return this
  }

  /**
   * Reset simulation
   */
  reset() {
    this.stop()
    this.physicsEngine.reset()
    this.renderEngine = new RenderEngine(this.renderEngine.canvas)
    this.frameTime = 0
    this.alpha = 0
    return this
  }

  /**
   * Main animation loop
   */
  animate = () => {
    if (!this.running) return

    const now = performance.now()
    const deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.016) // Cap at 16ms
    this.lastFrameTime = now

    // Update physics
    this.physicsEngine.update(deltaTime)

    // Calculate interpolation alpha for smooth rendering
    this.alpha = (this.physicsEngine.accumulator / PHYSICS_CONFIG.TIMESTEP) * 100
    this.alpha = Math.max(0, Math.min(1, this.alpha))

    // Render
    this.renderEngine.render(this.physicsEngine, this.alpha)

    // Update stats
    this.updateFrameStats(deltaTime)

    this.animationFrameId = requestAnimationFrame(this.animate)
  }

  /**
   * Update frame statistics
   */
  updateFrameStats(deltaTime) {
    this.frameTimeBuffer.push(deltaTime * 1000) // Convert to ms

    if (this.frameTimeBuffer.length > this.maxFrameBufferSize) {
      this.frameTimeBuffer.shift()
    }

    const avgFrameTime = this.frameTimeBuffer.reduce((a, b) => a + b, 0) / this.frameTimeBuffer.length

    this.frameStats.fps = Math.round(1 / avgFrameTime * 1000)
    this.frameStats.avgFrameTime = avgFrameTime.toFixed(2)
    this.frameStats.physicSteps = this.physicsEngine.debugInfo.stepsPerFrame
  }

  /**
   * Get frame statistics
   */
  getFrameStats() {
    return { ...this.frameStats }
  }

  /**
   * Get physics body
   */
  getBody(id) {
    return this.physicsEngine.getBody(id)
  }

  /**
   * Get all body states
   */
  getBodyStates() {
    return this.physicsEngine.getBodyStates()
  }

  /**
   * Toggle debug mode
   */
  setDebugMode(enabled) {
    this.renderEngine.setDebugMode(enabled)
    return this
  }

  /**
   * Toggle force visualization
   */
  setShowForces(enabled) {
    this.renderEngine.setShowForces(enabled)
    return this
  }

  /**
   * Toggle velocity visualization
   */
  setShowVelocity(enabled) {
    this.renderEngine.setShowVelocity(enabled)
    return this
  }

  /**
   * Toggle acceleration visualization
   */
  setShowAcceleration(enabled) {
    this.renderEngine.setShowAcceleration(enabled)
    return this
  }

  /**
   * Destroy simulation (cleanup)
   */
  destroy() {
    this.stop()
    this.physicsEngine.reset()
    this.renderEngine = null
  }
}

export default SimulationManager
