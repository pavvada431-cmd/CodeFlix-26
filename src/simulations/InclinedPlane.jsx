import * as THREE from 'three'
import { useCallback, useEffect, useRef } from 'react'
import { createInclinedPlaneWorld } from '../utils/physicsEngine'
import { SceneManager } from '../utils/sceneManager'
import { formatNumber } from '../utils/formatters'

const GRAVITY = 9.81
const RAMP_LENGTH = 460
const RAMP_THICKNESS = 24
const RAMP_CENTER_X = 400
const RAMP_CENTER_Y = 320
const GROUND_Y = -470
const GROUND_WIDTH = 1080
const CAMERA_POSITION = [400, -250, 760]
const CAMERA_TARGET = [395, -290, 0]
const BLOCK_ID = 'inclined-plane-block'

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

function normalizeInputs(variables = {}) {
  return {
    mass: Number.isFinite(variables.mass) && variables.mass > 0 ? variables.mass : 10,
    angle: Number.isFinite(variables.angle) ? variables.angle : 30,
    friction:
      Number.isFinite(variables.friction) && variables.friction >= 0
        ? variables.friction
        : 0,
  }
}

function buildInclinedPlaneDefinition(variables = {}) {
  const normalized = normalizeInputs(variables)
  const rampAngle = toRadians(normalized.angle)
  const blockSize = Math.max(28, Math.min(64, Math.sqrt(normalized.mass) * 14))
  const blockOffset = RAMP_LENGTH * 0.32
  const blockX = RAMP_CENTER_X - Math.cos(rampAngle) * blockOffset
  const blockY =
    RAMP_CENTER_Y - Math.sin(rampAngle) * blockOffset - blockSize * 0.95
  const completionThresholdX =
    RAMP_CENTER_X + Math.cos(rampAngle) * (RAMP_LENGTH / 2 - blockSize * 0.85)

  return {
    variables: normalized,
    meta: {
      blockSize,
      rampAngle,
      completionThresholdX,
      cameraPosition: CAMERA_POSITION,
      cameraTarget: CAMERA_TARGET,
    },
    sceneConfig: {
      backgroundColor: '#07111f',
      showGrid: false,
      objects: [
        {
          id: 'inclined-plane-ground',
          type: 'plane',
          size: [GROUND_WIDTH, 360],
          color: '#101c33',
          position: [RAMP_CENTER_X, GROUND_Y - 70, -52],
          rotation: [0, 0, 0],
          body: false,
        },
        {
          id: 'inclined-plane-ramp',
          type: 'box',
          size: [RAMP_LENGTH, RAMP_THICKNESS, 28],
          color: '#8f99a8',
          position: [RAMP_CENTER_X, -RAMP_CENTER_Y, 0],
          rotation: [0, 0, -rampAngle],
          body: false,
        },
        {
          id: BLOCK_ID,
          type: 'box',
          size: [blockSize, blockSize, blockSize],
          color: '#00f5ff',
          position: [blockX, -blockY, 12],
          rotation: [0, 0, -rampAngle],
          body: false,
        },
        {
          id: 'ground-strip',
          type: 'box',
          size: [GROUND_WIDTH, 18, 20],
          color: '#203457',
          position: [RAMP_CENTER_X, GROUND_Y, -8],
          rotation: [0, 0, 0],
          body: false,
        },
      ],
    },
  }
}

function toSceneBodyState(state) {
  return {
    id: state.id,
    x: state.x,
    y: -state.y,
    angle: state.angle,
  }
}

function projectToScreen(sceneManager, worldPosition) {
  if (!sceneManager?.camera || !sceneManager?.canvasElement) {
    return null
  }

  const projected = worldPosition.clone().project(sceneManager.camera)
  const bounds = sceneManager.canvasElement.getBoundingClientRect()

  return {
    x: ((projected.x + 1) / 2) * bounds.width,
    y: ((1 - projected.y) / 2) * bounds.height,
  }
}

function updateVelocityLabelElement(labelElement, sceneManager, position, value) {
  if (!labelElement || !sceneManager) {
    return
  }

  const screenPosition = projectToScreen(sceneManager, position)

  if (!screenPosition) {
    labelElement.style.opacity = '0'
    return
  }

  labelElement.style.opacity = '1'
  labelElement.style.transform = `translate(${screenPosition.x}px, ${screenPosition.y}px) translate(-50%, -50%)`
  labelElement.textContent = `v = ${formatNumber(value)} m/s`
}

function InclinedPlane(props) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const velocityLabelRef = useRef(null)
  const sceneManagerRef = useRef(null)
  const physicsEngineRef = useRef(null)
  const stepCleanupRef = useRef(null)
  const completedRef = useRef(false)
  const latestCompleteRef = useRef(props.onComplete)

  useEffect(() => {
    latestCompleteRef.current = props.onComplete
  }, [props.onComplete])

  const renderForceArrows = useCallback((blockBody, meta, variables) => {
    const sceneManager = sceneManagerRef.current

    if (!sceneManager || !blockBody) {
      return
    }

    sceneManager.clearArrows()

    const gravityMagnitude = variables.mass * GRAVITY
    const normalMagnitude = gravityMagnitude * Math.cos(meta.rampAngle)
    const rampComponent = gravityMagnitude * Math.sin(meta.rampAngle)
    const frictionMagnitude = variables.friction * normalMagnitude
    const netMagnitude = Math.max(rampComponent - frictionMagnitude, 0)
    const toArrowLength = (magnitude) => Math.max(magnitude * 0.6, 16)
    const origin = {
      x: blockBody.position.x,
      y: -blockBody.position.y,
      z: 18,
    }

    sceneManager.addForceArrow(
      origin,
      { x: 0, y: -toArrowLength(gravityMagnitude), z: 0 },
      '#ef4444',
      'mg',
    )
    sceneManager.addForceArrow(
      origin,
      {
        x: Math.sin(meta.rampAngle) * toArrowLength(normalMagnitude),
        y: Math.cos(meta.rampAngle) * toArrowLength(normalMagnitude),
        z: 0,
      },
      '#60a5fa',
      'N',
    )
    sceneManager.addForceArrow(
      origin,
      {
        x: Math.cos(meta.rampAngle) * toArrowLength(netMagnitude),
        y: -Math.sin(meta.rampAngle) * toArrowLength(netMagnitude),
        z: 0,
      },
      '#22c55e',
      'Fnet',
    )
  }, [])

  const syncSceneFromPhysics = useCallback((meta, variables) => {
    const sceneManager = sceneManagerRef.current
    const physicsEngine = physicsEngineRef.current

    if (!sceneManager || !physicsEngine) {
      return
    }

    const bodyStates = physicsEngine.getBodyPositions().map(toSceneBodyState)
    sceneManager.updatePositions(bodyStates)

    const blockBody = physicsEngine.findBodyById(BLOCK_ID)

    if (!blockBody) {
      return
    }

    const velocityMagnitude = Math.hypot(blockBody.velocity.x, blockBody.velocity.y)
    const labelPosition = new THREE.Vector3(
      blockBody.position.x,
      -blockBody.position.y + meta.blockSize * 1.65,
      18,
    )

    renderForceArrows(blockBody, meta, variables)
    updateVelocityLabelElement(
      velocityLabelRef.current,
      sceneManager,
      labelPosition,
      velocityMagnitude,
    )

    if (
      !completedRef.current &&
      blockBody.position.x >= meta.completionThresholdX
    ) {
      completedRef.current = true

      if (typeof latestCompleteRef.current === 'function') {
        latestCompleteRef.current(velocityMagnitude)
      }
    }
  }, [renderForceArrows])

  useEffect(() => {
    const sceneManager = new SceneManager()
    const velocityLabelElement = velocityLabelRef.current
    sceneManager.init(canvasRef)
    sceneManager.setBackground('#07111f')
    sceneManager.enableGrid(false)
    sceneManagerRef.current = sceneManager

    sceneManager.camera.position.set(...CAMERA_POSITION)
    sceneManager.controls.target.set(...CAMERA_TARGET)
    sceneManager.controls.update()

    const handleResize = () => {
      sceneManager.handleResize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      stepCleanupRef.current?.()
      physicsEngineRef.current?.destroy()
      sceneManager.destroy()
      sceneManagerRef.current = null
      physicsEngineRef.current = null
      velocityLabelElement?.style.setProperty('opacity', '0')
    }
  }, [])

  useEffect(() => {
    const sceneManager = sceneManagerRef.current

    if (!sceneManager) {
      return
    }

    const definition = buildInclinedPlaneDefinition({
      mass: props.mass,
      angle: props.angle,
      friction: props.friction,
    })

    completedRef.current = false
    sceneManager.loadScene(definition.sceneConfig)
    sceneManager.camera.position.set(...definition.meta.cameraPosition)
    sceneManager.controls.target.set(...definition.meta.cameraTarget)
    sceneManager.controls.update()

    stepCleanupRef.current?.()
    physicsEngineRef.current?.destroy()

    const physicsEngine = createInclinedPlaneWorld(
      definition.variables.mass,
      definition.variables.angle,
      definition.variables.friction,
    )

    physicsEngine.stopLoop()
    physicsEngineRef.current = physicsEngine
    stepCleanupRef.current = physicsEngine.onStep(() => {
      syncSceneFromPhysics(definition.meta, definition.variables)
    })

    syncSceneFromPhysics(definition.meta, definition.variables)
    return () => {
      stepCleanupRef.current?.()
      stepCleanupRef.current = null
      physicsEngine.stopLoop()
      physicsEngine.destroy()
      physicsEngineRef.current = null
    }
  }, [props.angle, props.friction, props.mass, syncSceneFromPhysics])

  useEffect(() => {
    const physicsEngine = physicsEngineRef.current

    if (!physicsEngine) {
      return
    }

    if (props.isPlaying) {
      physicsEngine.startLoop()
      return () => {
        physicsEngine.stopLoop()
      }
    }

    physicsEngine.stopLoop()
    return undefined
  }, [props.angle, props.friction, props.isPlaying, props.mass])

  return (
    <section
      ref={containerRef}
      className="relative h-full min-h-[760px] overflow-hidden rounded-[34px] border border-[rgba(0,245,255,0.14)] bg-[#07111f]/85 shadow-[0_26px_90px_rgba(2,8,23,0.6)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,245,255,0.12),transparent_32%),linear-gradient(180deg,rgba(10,15,30,0.12),rgba(10,15,30,0.55))]" />

      <canvas
        ref={canvasRef}
        className="relative z-0 h-full w-full"
      />

      <div
        ref={velocityLabelRef}
        className="pointer-events-none absolute left-0 top-0 z-10 rounded-full border border-[rgba(0,245,255,0.22)] bg-[#081221]/86 px-4 py-2 font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff] opacity-0 shadow-[0_0_20px_rgba(0,245,255,0.14)] backdrop-blur-md"
      />
    </section>
  )
}

InclinedPlane.getSceneConfig = function getSceneConfig(variables) {
  return buildInclinedPlaneDefinition(variables).sceneConfig
}

export default InclinedPlane
