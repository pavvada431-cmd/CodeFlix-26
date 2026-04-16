import {
  Bodies,
  Body,
  Engine,
  Events,
  Render,
  Runner,
  World,
} from 'matter-js'

const FIXED_DELTA_MS = 1000 / 60

function cloneBodyOptions(options = {}) {
  return {
    ...options,
    velocity: options.velocity ? { ...options.velocity } : undefined,
  }
}

function getCanvasDimensions(canvasElement) {
  if (!canvasElement) {
    return { width: 1, height: 1 }
  }

  const width = canvasElement.width || canvasElement.clientWidth || 1
  const height = canvasElement.height || canvasElement.clientHeight || 1

  return { width, height }
}

function getBodyIdentifier(body) {
  return body.plugin?.simusolveId ?? body.id
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

export class PhysicsEngine {
  constructor() {
    this.engine = null
    this.render = null
    this.runner = null
    this.canvasId = null
    this.animationFrameId = null
    this.gravity = { x: 0, y: 1 }
    this.bodyDefinitions = []
    this.forceArrows = new Map()
    this.stepCallbacks = new Set()
    this.handleAfterUpdate = this.handleAfterUpdate.bind(this)
    this.handleAnimationFrame = this.handleAnimationFrame.bind(this)
  }

  init(canvasId) {
    this.teardownRuntime()
    this.canvasId = canvasId ?? null

    const canvasElement = canvasId
      ? document.getElementById(canvasId)
      : null
    const { width, height } = getCanvasDimensions(canvasElement)

    this.engine = Engine.create()
    this.engine.gravity.x = this.gravity.x
    this.engine.gravity.y = this.gravity.y

    const offscreenContainer = document.createElement('div')
    offscreenContainer.setAttribute('aria-hidden', 'true')
    offscreenContainer.style.display = 'none'

    this.render = Render.create({
      element: offscreenContainer,
      engine: this.engine,
      options: {
        width,
        height,
        background: 'transparent',
        wireframes: false,
      },
    })

    this.render.canvas.style.display = 'none'
    this.runner = Runner.create({ delta: FIXED_DELTA_MS, isFixed: true })

    Events.on(this.engine, 'afterUpdate', this.handleAfterUpdate)
    this.startLoop()

    return this
  }

  addBody(options = {}) {
    return this.addBodyFromDefinition(options, { trackDefinition: true })
  }

  setGravity(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Gravity values must be finite numbers')
    }

    this.gravity = { x, y }

    if (this.engine) {
      this.engine.gravity.x = x
      this.engine.gravity.y = y
    }

    return this
  }

  step() {
    if (!this.engine || !this.runner) {
      return []
    }

    Runner.tick(this.runner, this.engine, performance.now())
    return this.getBodyPositions()
  }

  reset() {
    const savedCanvasId = this.canvasId
    const savedGravity = { ...this.gravity }
    const savedDefinitions = this.bodyDefinitions.map(cloneBodyOptions)
    const savedForceArrows = Array.from(this.forceArrows.entries()).map(
      ([bodyId, force]) => [bodyId, { ...force }],
    )

    this.teardownRuntime({ clearForceArrows: true })
    this.bodyDefinitions = savedDefinitions.map(cloneBodyOptions)
    this.init(savedCanvasId)
    this.setGravity(savedGravity.x, savedGravity.y)

    for (const definition of this.bodyDefinitions) {
      this.addBodyFromDefinition(definition, { trackDefinition: false })
    }

    for (const [bodyId, force] of savedForceArrows) {
      if (this.findBodyById(bodyId)) {
        this.forceArrows.set(bodyId, force)
      }
    }

    return this
  }

  destroy() {
    this.teardownRuntime({
      clearDefinitions: true,
      clearCallbacks: true,
      clearForceArrows: true,
    })
    this.canvasId = null
  }

  getBodyPositions() {
    if (!this.engine) {
      return []
    }

    return this.engine.world.bodies.map((body) => ({
      id: getBodyIdentifier(body),
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
    }))
  }

  addForceArrow(bodyId, force) {
    if (!Number.isFinite(force?.x) || !Number.isFinite(force?.y)) {
      throw new Error('Force vectors must include finite x and y values')
    }

    if (!this.findBodyById(bodyId)) {
      throw new Error(`Body with id "${bodyId}" was not found`)
    }

    this.forceArrows.set(bodyId, { x: force.x, y: force.y })
    return this
  }

  onStep(callback) {
    if (typeof callback !== 'function') {
      throw new Error('onStep requires a callback function')
    }

    this.stepCallbacks.add(callback)

    return () => {
      this.stepCallbacks.delete(callback)
    }
  }

  addBodyFromDefinition(options = {}, { trackDefinition = true } = {}) {
    if (!this.engine) {
      this.init(this.canvasId)
    }

    const definition = cloneBodyOptions(options)
    const body = this.createBody(definition)

    World.add(this.engine.world, body)

    if (trackDefinition) {
      this.bodyDefinitions.push(definition)
    }

    return body
  }

  createBody(options = {}) {
    const {
      type = 'rectangle',
      x = 0,
      y = 0,
      width = 40,
      height = 40,
      radius = 20,
      sides = 6,
      mass,
      id,
      angle,
      velocity,
      angularVelocity,
      ...bodyOptions
    } = options

    let body

    if (type === 'circle') {
      body = Bodies.circle(x, y, radius, bodyOptions)
    } else if (type === 'polygon') {
      body = Bodies.polygon(x, y, sides, radius, bodyOptions)
    } else {
      body = Bodies.rectangle(x, y, width, height, bodyOptions)
    }

    if (id !== undefined && id !== null) {
      body.plugin.simusolveId = id
    }

    if (Number.isFinite(angle)) {
      Body.setAngle(body, angle)
    }

    if (Number.isFinite(mass) && mass > 0) {
      Body.setMass(body, mass)
    }

    if (velocity?.x !== undefined || velocity?.y !== undefined) {
      Body.setVelocity(body, {
        x: Number.isFinite(velocity?.x) ? velocity.x : 0,
        y: Number.isFinite(velocity?.y) ? velocity.y : 0,
      })
    }

    if (Number.isFinite(angularVelocity)) {
      Body.setAngularVelocity(body, angularVelocity)
    }

    return body
  }

  startLoop() {
    this.stopLoop()
    this.animationFrameId = window.requestAnimationFrame(
      this.handleAnimationFrame,
    )
  }

  stopLoop() {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  handleAnimationFrame(timestamp) {
    if (!this.engine || !this.runner) {
      return
    }

    Runner.tick(this.runner, this.engine, timestamp)
    this.animationFrameId = window.requestAnimationFrame(
      this.handleAnimationFrame,
    )
  }

  handleAfterUpdate() {
    const bodyStates = this.getBodyPositions()
    const forceArrows = Array.from(this.forceArrows.entries()).map(
      ([id, force]) => ({
        id,
        x: force.x,
        y: force.y,
      }),
    )

    for (const callback of this.stepCallbacks) {
      callback(bodyStates, forceArrows)
    }
  }

  teardownRuntime({
    clearDefinitions = false,
    clearCallbacks = false,
    clearForceArrows = false,
  } = {}) {
    this.stopLoop()

    if (this.engine) {
      Events.off(this.engine, 'afterUpdate', this.handleAfterUpdate)
      World.clear(this.engine.world, false)
      Engine.clear(this.engine)
    }

    if (this.render) {
      Render.stop(this.render)
      this.render.canvas?.remove()
    }

    this.engine = null
    this.render = null
    this.runner = null

    if (clearDefinitions) {
      this.bodyDefinitions = []
    }

    if (clearCallbacks) {
      this.stepCallbacks.clear()
    }

    if (clearForceArrows) {
      this.forceArrows.clear()
    }
  }

  findBodyById(bodyId) {
    if (!this.engine) {
      return null
    }

    return (
      this.engine.world.bodies.find(
        (body) => getBodyIdentifier(body) === bodyId,
      ) ?? null
    )
  }
}

export function createInclinedPlaneWorld(mass, angle, friction) {
  const engine = new PhysicsEngine()
  const normalizedMass = Number.isFinite(mass) && mass > 0 ? mass : 1
  const normalizedAngle = Number.isFinite(angle) ? angle : 30
  const normalizedFriction = Number.isFinite(friction) ? friction : 0
  const rampAngle = toRadians(normalizedAngle)
  const rampLength = 460
  const rampThickness = 24
  const rampCenterX = 400
  const rampCenterY = 320
  const blockSize = Math.max(28, Math.min(64, Math.sqrt(normalizedMass) * 14))
  const blockOffset = rampLength * 0.32
  const blockX = rampCenterX - Math.cos(rampAngle) * blockOffset
  const blockY =
    rampCenterY - Math.sin(rampAngle) * blockOffset - blockSize * 0.95

  engine.init()
  engine.setGravity(0, 1)

  engine.addBody({
    id: 'inclined-plane-ramp',
    type: 'rectangle',
    x: rampCenterX,
    y: rampCenterY,
    width: rampLength,
    height: rampThickness,
    angle: -rampAngle,
    isStatic: true,
    friction: normalizedFriction,
    label: 'Inclined Plane Ramp',
  })

  const block = engine.addBody({
    id: 'inclined-plane-block',
    type: 'rectangle',
    x: blockX,
    y: blockY,
    width: blockSize,
    height: blockSize,
    angle: -rampAngle,
    friction: normalizedFriction,
    frictionStatic: normalizedFriction,
    restitution: 0,
    label: 'Inclined Plane Block',
    mass: normalizedMass,
  })

  const gravityForceMagnitude = normalizedMass
  engine.addForceArrow(getBodyIdentifier(block), {
    x: gravityForceMagnitude * Math.sin(rampAngle),
    y: gravityForceMagnitude * Math.cos(rampAngle),
  })

  return engine
}
