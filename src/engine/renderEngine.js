/**
 * Render Engine - Handles all visualization
 * Reads physics state without modifying it
 * Uses interpolation for smooth frame-to-frame rendering
 */

export class RenderEngine {
  constructor(canvasElement = null) {
    this.canvas = canvasElement
    this.ctx = canvasElement?.getContext('2d') ?? null
    this.bodies = new Map() // id -> render state
    this.lastFrameTime = performance.now()
    this.frameBuffer = []
    this.debugMode = false
    this.showForces = false
    this.showVelocity = false
    this.showAcceleration = false
  }

  /**
   * Set canvas for rendering
   */
  setCanvas(canvasElement) {
    this.canvas = canvasElement
    this.ctx = canvasElement?.getContext('2d') ?? null
    return this
  }

  /**
   * Register a body for rendering
   */
  registerBody(id, renderConfig = {}) {
    this.bodies.set(id, {
      id,
      color: renderConfig.color ?? '#00f5ff',
      shape: renderConfig.shape ?? 'box',
      scale: renderConfig.scale ?? 1,
      label: renderConfig.label ?? id,
      visible: renderConfig.visible !== false,
      ...renderConfig,
    })
  }

  /**
   * Unregister a body
   */
  unregisterBody(id) {
    this.bodies.delete(id)
  }

  /**
   * Clear canvas
   */
  clearCanvas() {
    if (!this.ctx || !this.canvas) return

    this.ctx.fillStyle = 'rgba(5, 15, 35, 0.9)'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Grid background
    this.ctx.strokeStyle = 'rgba(0, 245, 255, 0.05)'
    this.ctx.lineWidth = 0.5
    const gridSize = 40
    for (let x = 0; x <= this.canvas.width; x += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.canvas.height)
      this.ctx.stroke()
    }
    for (let y = 0; y <= this.canvas.height; y += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.canvas.width, y)
      this.ctx.stroke()
    }
  }

  /**
   * Render a body at interpolated position
   */
  renderBody(ctx, bodyState, renderConfig, interpolatedPos) {
    if (!renderConfig.visible) return

    const x = interpolatedPos?.x ?? bodyState.position.x
    const y = interpolatedPos?.y ?? bodyState.position.y

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(bodyState.rotation.z)

    // Draw body
    ctx.fillStyle = renderConfig.color
    ctx.strokeStyle = renderConfig.color
    ctx.lineWidth = 2

    if (renderConfig.shape === 'sphere') {
      ctx.beginPath()
      ctx.arc(0, 0, 10, 0, Math.PI * 2)
      ctx.fill()
    } else if (renderConfig.shape === 'circle') {
      ctx.beginPath()
      ctx.arc(0, 0, 10, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillRect(-10, -10, 20, 20)
      ctx.strokeRect(-10, -10, 20, 20)
    }

    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(renderConfig.label, 0, 0)

    ctx.restore()
  }

  /**
   * Render force vectors
   */
  renderForces(ctx, bodyState, interpolatedPos) {
    if (!this.showForces || bodyState.forces.length === 0) return

    const x = interpolatedPos?.x ?? bodyState.position.x
    const y = interpolatedPos?.y ?? bodyState.position.y

    ctx.save()
    ctx.translate(x, y)

    for (const force of bodyState.forces) {
      const magnitude = Math.hypot(force.x, force.y)
      if (magnitude < 0.1) continue

      const angle = Math.atan2(force.y, force.x)
      const scale = Math.min(magnitude / 10, 50) // Cap at 50px

      // Draw arrow
      ctx.strokeStyle = '#ff6b6b'
      ctx.fillStyle = '#ff6b6b'
      ctx.lineWidth = 2

      // Shaft
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(angle) * scale, Math.sin(angle) * scale)
      ctx.stroke()

      // Arrowhead
      const headLength = 8
      ctx.beginPath()
      ctx.moveTo(
        Math.cos(angle) * scale - Math.cos(angle - Math.PI / 6) * headLength,
        Math.sin(angle) * scale - Math.sin(angle - Math.PI / 6) * headLength
      )
      ctx.lineTo(Math.cos(angle) * scale, Math.sin(angle) * scale)
      ctx.lineTo(
        Math.cos(angle) * scale - Math.cos(angle + Math.PI / 6) * headLength,
        Math.sin(angle) * scale - Math.sin(angle + Math.PI / 6) * headLength
      )
      ctx.fill()
    }

    ctx.restore()
  }

  /**
   * Render velocity vector
   */
  renderVelocity(ctx, bodyState, interpolatedPos) {
    if (!this.showVelocity) return

    const x = interpolatedPos?.x ?? bodyState.position.x
    const y = interpolatedPos?.y ?? bodyState.position.y
    const vx = bodyState.velocity.x
    const vy = bodyState.velocity.y

    const magnitude = Math.hypot(vx, vy)
    if (magnitude < 0.1) return

    const angle = Math.atan2(vy, vx)
    const scale = Math.min(magnitude / 5, 80)

    ctx.save()
    ctx.translate(x, y)

    ctx.strokeStyle = '#4ecdc4'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(angle) * scale, Math.sin(angle) * scale)
    ctx.stroke()

    ctx.restore()
  }

  /**
   * Render acceleration vector
   */
  renderAcceleration(ctx, bodyState, interpolatedPos) {
    if (!this.showAcceleration) return

    const x = interpolatedPos?.x ?? bodyState.position.x
    const y = interpolatedPos?.y ?? bodyState.position.y
    const ax = bodyState.acceleration.x
    const ay = bodyState.acceleration.y

    const magnitude = Math.hypot(ax, ay)
    if (magnitude < 0.01) return

    const angle = Math.atan2(ay, ax)
    const scale = Math.min(magnitude * 5, 60)

    ctx.save()
    ctx.translate(x, y)

    ctx.strokeStyle = '#ffd93d'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(angle) * scale, Math.sin(angle) * scale)
    ctx.stroke()

    ctx.restore()
  }

  /**
   * Render all bodies and forces
   */
  render(physicsEngine, interpolationAlpha = 1) {
    if (!this.ctx || !this.canvas) return

    this.clearCanvas()

    const bodies = physicsEngine.getBodyStates()

    for (const bodyState of bodies) {
      const renderConfig = this.bodies.get(bodyState.id)
      if (!renderConfig) continue

      // Get interpolated position for smooth rendering
      const interpolatedPos = physicsEngine.getInterpolatedPosition(
        bodyState.id,
        interpolationAlpha
      )

      // Render body
      this.renderBody(this.ctx, bodyState, renderConfig, interpolatedPos)

      // Render debug info
      if (this.debugMode) {
        this.renderForces(this.ctx, bodyState, interpolatedPos)
        this.renderVelocity(this.ctx, bodyState, interpolatedPos)
        this.renderAcceleration(this.ctx, bodyState, interpolatedPos)
      }
    }

    // Render HUD
    if (this.debugMode) {
      this.renderHUD()
    }
  }

  /**
   * Render debug HUD
   */
  renderHUD() {
    if (!this.ctx) return

    const debugInfo = {
      'Bodies': this.bodies.size,
      'Debug Mode': 'ON',
      'Show Forces': this.showForces ? 'ON' : 'OFF',
      'Show Velocity': this.showVelocity ? 'ON' : 'OFF',
      'Show Acceleration': this.showAcceleration ? 'ON' : 'OFF',
    }

    this.ctx.save()
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(10, 10, 200, Object.keys(debugInfo).length * 20 + 10)

    this.ctx.fillStyle = '#00f5ff'
    this.ctx.font = 'bold 12px monospace'
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'

    let y = 15
    for (const [key, value] of Object.entries(debugInfo)) {
      this.ctx.fillText(`${key}: ${value}`, 15, y)
      y += 20
    }

    this.ctx.restore()
  }

  /**
   * Toggle debug display
   */
  setDebugMode(enabled) {
    this.debugMode = Boolean(enabled)
    return this
  }

  /**
   * Toggle force visualization
   */
  setShowForces(enabled) {
    this.showForces = Boolean(enabled)
    return this
  }

  /**
   * Toggle velocity visualization
   */
  setShowVelocity(enabled) {
    this.showVelocity = Boolean(enabled)
    return this
  }

  /**
   * Toggle acceleration visualization
   */
  setShowAcceleration(enabled) {
    this.showAcceleration = Boolean(enabled)
    return this
  }
}
