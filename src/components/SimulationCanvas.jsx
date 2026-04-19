import {
  useCallback,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { SimulationManager } from '../engine/simulationManager'
import { PhysicsEngine } from '../utils/physicsEngine'
import { SceneManager } from '../utils/sceneManager'
import { formatNumber } from '../utils/formatters'
import { showWarning } from '../utils/toast'

const SPEED_OPTIONS = [0.25, 0.5, 1, 2]
const TIMELINE_DURATION_SECONDS = 10
const HUD_UPDATE_INTERVAL_MS = 100
const OUT_OF_BOUNDS_THRESHOLD = 10000

function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (gl && gl instanceof WebGLRenderingContext) {
      return { supported: true, type: 'webgl' }
    }
    const gl2 = canvas.getContext('webgl2')
    if (gl2 && gl2 instanceof WebGL2RenderingContext) {
      return { supported: true, type: 'webgl2' }
    }
    return { supported: false, type: null }
  } catch {
    return { supported: false, type: null }
  }
}

function toRenderableObjects(sceneConfig) {
  if (Array.isArray(sceneConfig)) {
    return sceneConfig
  }

  if (Array.isArray(sceneConfig?.objects)) {
    return sceneConfig.objects
  }

  return sceneConfig ? [sceneConfig] : []
}

function getDimensionValue(source, key, fallback) {
  if (typeof source === 'number') {
    return source
  }

  if (Array.isArray(source)) {
    const indexMap = { width: 0, height: 1, depth: 2, radius: 0 }
    const index = indexMap[key] ?? 0
    return Number(source[index] ?? fallback)
  }

  if (typeof source === 'object' && source !== null) {
    return Number(source[key] ?? fallback)
  }

  return fallback
}

function deriveBodyDefinition(sceneObject, index) {
  const bodyConfig = sceneObject.physics ?? sceneObject.physicsBody ?? sceneObject.body

  if (bodyConfig === false || bodyConfig === null) {
    return null
  }

  const position = sceneObject.position ?? [0, 0, 0]
  const rotation = sceneObject.rotation ?? [0, 0, 0]
  const derivedId = sceneObject.id ?? sceneObject.bodyId ?? index

  const defaults = {
    id: derivedId,
    x: Number(position.x ?? position[0] ?? 0),
    y: Number(position.y ?? position[1] ?? 0),
    angle: Number(rotation.z ?? rotation[2] ?? 0),
    isStatic: sceneObject.type === 'plane',
  }

  if (sceneObject.type === 'sphere') {
    return {
      ...defaults,
      type: 'circle',
      radius: getDimensionValue(sceneObject.size, 'radius', 1),
    }
  }

  if (sceneObject.type === 'cylinder') {
    return {
      ...defaults,
      type: 'rectangle',
      width: getDimensionValue(sceneObject.size, 'radius', 1) * 2,
      height: getDimensionValue(sceneObject.size, 'height', 2),
    }
  }

  return {
    ...defaults,
    type: 'rectangle',
    width: getDimensionValue(sceneObject.size, 'width', 1),
    height: getDimensionValue(sceneObject.size, 'height', 1),
  }
}

function extractBodyDefinitions(sceneConfig) {
  const explicitBodies = Array.isArray(sceneConfig?.bodies) ? sceneConfig.bodies : []

  if (explicitBodies.length > 0) {
    return explicitBodies
  }

  const objects = toRenderableObjects(sceneConfig)

  return objects
    .map((sceneObject, index) => deriveBodyDefinition(sceneObject, index))
    .filter(Boolean)
}

function normalizeForceVectors(forceVectors, bodyStates) {
  const bodyLookup = new Map(
    (Array.isArray(bodyStates) ? bodyStates : []).map((state) => [state.id, state]),
  )

  return (Array.isArray(forceVectors) ? forceVectors : [])
    .map((vector, index) => {
      const bodyId = vector.bodyId ?? vector.id ?? index
      const bodyState = bodyLookup.get(bodyId)
      const origin = vector.origin ?? {
        x: bodyState?.x ?? 0,
        y: bodyState?.y ?? 0,
        z: 0,
      }
      const direction =
        vector.direction ??
        vector.force ?? {
          x: Number(vector.x ?? 0),
          y: Number(vector.y ?? 0),
          z: Number(vector.z ?? 0),
        }

      return {
        id: bodyId,
        origin,
        direction,
        color: vector.color ?? '#00f5ff',
        label: vector.label ?? String(bodyId),
      }
    })
    .filter(
      (vector) =>
        Number.isFinite(vector.direction?.x) &&
        Number.isFinite(vector.direction?.y),
    )
}

function WebGLFallback() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)]">
        <svg className="h-8 w-8 text-[#f87171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="mb-2 font-heading text-xl font-semibold text-white">
        WebGL Not Available
      </h3>
      <p className="mb-4 max-w-md text-sm text-slate-400">
        Your browser or device doesn&apos;t support WebGL, which is required for 3D rendering.
      </p>
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="mb-2 font-mono-display text-xs uppercase tracking-wider text-slate-400">
          Try these solutions:
        </p>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-center gap-2">
            <span className="text-[#00f5ff]">1.</span>
            Update your browser to the latest version
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[#00f5ff]">2.</span>
            Enable hardware acceleration in browser settings
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[#00f5ff]">3.</span>
            Try a different browser (Chrome, Firefox, Edge)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[#00f5ff]">4.</span>
            Update your graphics card drivers
          </li>
        </ul>
      </div>
    </div>
  )
}

function SimulationCanvasContent({
  canvasRef,
  sceneConfig,
  bodyStates,
  forceVectors,
  isPlaying,
  playbackSpeed,
  onIsPlayingChange,
  onPlaybackSpeedChange,
  onReset,
}) {
  const sceneManagerRef = useRef(null)
  const physicsEngineRef = useRef(null)
  const syncFrameRef = useRef(null)
  const lastFrameTimeRef = useRef(0)
  const simulationTimeRef = useRef(0)
  const lastHudUpdateRef = useRef(0)
  const bodyStatesRef = useRef(Array.isArray(bodyStates) ? bodyStates : [])
  const forceVectorsRef = useRef(Array.isArray(forceVectors) ? forceVectors : [])
  const [internalPlaying, setInternalPlaying] = useState(Boolean(isPlaying))
  const [internalSpeed, setInternalSpeed] = useState(
    Number.isFinite(playbackSpeed) && playbackSpeed > 0 ? playbackSpeed : 1,
  )
  const [simulationTime, setSimulationTime] = useState(0)
  const [fps, setFps] = useState(0)
  const [timelineProgress, setTimelineProgress] = useState(0)

  const resolvedIsPlaying =
    typeof isPlaying === 'boolean' ? isPlaying : internalPlaying
  const resolvedPlaybackSpeed =
    Number.isFinite(playbackSpeed) && playbackSpeed > 0
      ? playbackSpeed
      : internalSpeed

  const setPlayingState = useCallback((nextValue) => {
    if (typeof onIsPlayingChange === 'function') {
      onIsPlayingChange(nextValue)
    }

    if (typeof isPlaying !== 'boolean') {
      setInternalPlaying(nextValue)
    }
  }, [onIsPlayingChange, isPlaying])

  const setPlaybackSpeedState = useCallback((nextValue) => {
    if (typeof onPlaybackSpeedChange === 'function') {
      onPlaybackSpeedChange(nextValue)
    }

    if (!(Number.isFinite(playbackSpeed) && playbackSpeed > 0)) {
      setInternalSpeed(nextValue)
    }
  }, [onPlaybackSpeedChange, playbackSpeed])

  const getCurrentBodyStates = useCallback(() => {
    const physicsEngine = physicsEngineRef.current

    if (physicsEngine?.bodyDefinitions?.length) {
      return physicsEngine.getBodyPositions()
    }

    return bodyStatesRef.current
  }, [])

  const renderForceOverlay = useCallback((states) => {
    const sceneManager = sceneManagerRef.current

    if (!sceneManager) {
      return
    }

    sceneManager.clearArrows()

    const arrows = normalizeForceVectors(forceVectorsRef.current, states)

    arrows.forEach((arrow) => {
      sceneManager.addForceArrow(
        arrow.origin,
        arrow.direction,
        arrow.color,
        arrow.label,
      )
    })
  }, [])

  const renderSnapshot = useCallback(() => {
    const sceneManager = sceneManagerRef.current

    if (!sceneManager) {
      return
    }

    const states = getCurrentBodyStates()
    sceneManager.updatePositions(states)
    renderForceOverlay(states)
  }, [getCurrentBodyStates, renderForceOverlay])

  const stopSyncLoop = useCallback(() => {
    if (syncFrameRef.current !== null) {
      window.cancelAnimationFrame(syncFrameRef.current)
      syncFrameRef.current = null
    }
  }, [])

  const checkOutOfBounds = useCallback((states) => {
    for (const state of states) {
      if (
        Math.abs(state.x) > OUT_OF_BOUNDS_THRESHOLD ||
        Math.abs(state.y) > OUT_OF_BOUNDS_THRESHOLD
      ) {
        return true
      }
    }
    return false
  }, [])

  const handleOutOfBounds = useCallback(() => {
    showWarning('Simulation reset — object left bounds')
    if (typeof onReset === 'function') {
      onReset()
    }
  }, [onReset])

  const rebuildPhysicsWorld = useCallback(() => {
    physicsEngineRef.current?.destroy()

    try {
      const physicsEngine = new PhysicsEngine()
      physicsEngine.init()
      physicsEngine.stopLoop()

      if (Number.isFinite(sceneConfig?.gravity?.x) || Number.isFinite(sceneConfig?.gravity?.y)) {
        physicsEngine.setGravity(
          Number.isFinite(sceneConfig?.gravity?.x) ? sceneConfig.gravity.x : 0,
          Number.isFinite(sceneConfig?.gravity?.y) ? sceneConfig.gravity.y : 1,
        )
      }

      const bodyDefinitions = extractBodyDefinitions(sceneConfig)

      bodyDefinitions.forEach((definition) => {
        physicsEngine.addBody(definition)
      })

      physicsEngine.engine.timing.timeScale = resolvedPlaybackSpeed
      physicsEngineRef.current = physicsEngine
    } catch (error) {
      console.error('Failed to initialize physics engine:', error)
      showWarning('Physics engine initialization failed')
    }
  }, [resolvedPlaybackSpeed, sceneConfig])

  useEffect(() => {
    let sceneManager = null

    try {
      sceneManager = new SceneManager()
      sceneManager.init(canvasRef)
      sceneManagerRef.current = sceneManager
    } catch (error) {
      console.error('Failed to initialize SceneManager:', error)
      return
    }

    return () => {
      stopSyncLoop()
      physicsEngineRef.current?.destroy()
      physicsEngineRef.current = null
      sceneManager?.destroy()
      sceneManagerRef.current = null
    }
  }, [stopSyncLoop, canvasRef])

  useEffect(() => {
    const sceneManager = sceneManagerRef.current

    if (!sceneManager) {
      return
    }

    sceneManager.setBackground(sceneConfig?.backgroundColor ?? '#07111f')
    sceneManager.enableGrid(Boolean(sceneConfig?.grid ?? sceneConfig?.showGrid))
    sceneManager.loadScene(sceneConfig)
    rebuildPhysicsWorld()
    renderSnapshot()
  }, [rebuildPhysicsWorld, renderSnapshot, sceneConfig])

  useEffect(() => {
    bodyStatesRef.current = Array.isArray(bodyStates) ? bodyStates : []

    if (!resolvedIsPlaying) {
      renderSnapshot()
    }
  }, [bodyStates, renderSnapshot, resolvedIsPlaying])

  useEffect(() => {
    forceVectorsRef.current = Array.isArray(forceVectors) ? forceVectors : []

    if (!resolvedIsPlaying) {
      renderSnapshot()
    }
  }, [forceVectors, renderSnapshot, resolvedIsPlaying])

  useEffect(() => {
    const physicsEngine = physicsEngineRef.current

    if (physicsEngine?.engine) {
      physicsEngine.engine.timing.timeScale = resolvedPlaybackSpeed
    }
  }, [resolvedPlaybackSpeed])

  useEffect(() => {
    const physicsEngine = physicsEngineRef.current

    if (!physicsEngine) {
      return
    }

    if (resolvedIsPlaying) {
      // Store accumulated deltaTime for smooth physics
      let accumulatedTime = 0
      let lastTimestamp = performance.now()

      const tick = (timestamp) => {
        const sceneManager = sceneManagerRef.current

        if (!sceneManager) {
          return
        }

        // Calculate delta with clamping to prevent large jumps
        const deltaMs = Math.max(Math.min(timestamp - lastTimestamp, 50), 0)
        const deltaSeconds = Math.min(deltaMs / 1000, 0.016) // Cap at 16ms
        lastTimestamp = timestamp

        // Apply playback speed to accumulated time
        accumulatedTime += deltaSeconds * resolvedPlaybackSpeed
        simulationTimeRef.current = accumulatedTime

        const states = getCurrentBodyStates()

        if (checkOutOfBounds(states)) {
          handleOutOfBounds()
          return
        }

        sceneManager.updatePositions(states)
        renderForceOverlay(states)

        if (timestamp - lastHudUpdateRef.current >= HUD_UPDATE_INTERVAL_MS) {
          lastHudUpdateRef.current = timestamp

          startTransition(() => {
            setSimulationTime(simulationTimeRef.current)
            setFps(deltaMs > 0 ? 1000 / deltaMs : 0)
            setTimelineProgress(
              Math.min(
                (simulationTimeRef.current / TIMELINE_DURATION_SECONDS) * 100,
                100,
              ),
            )
          })
        }

        syncFrameRef.current = window.requestAnimationFrame(tick)
      }

      physicsEngine.engine.timing.timeScale = resolvedPlaybackSpeed
      physicsEngine.startLoop()
      lastFrameTimeRef.current = 0
      lastHudUpdateRef.current = 0
      lastTimestamp = performance.now()
      accumulatedTime = simulationTimeRef.current
      stopSyncLoop()
      syncFrameRef.current = window.requestAnimationFrame(tick)
      return () => {
        stopSyncLoop()
      }
    }

    physicsEngine.stopLoop()
    stopSyncLoop()
    renderSnapshot()

    return undefined
  }, [
    getCurrentBodyStates,
    rebuildPhysicsWorld,
    renderForceOverlay,
    renderSnapshot,
    resolvedIsPlaying,
    resolvedPlaybackSpeed,
    stopSyncLoop,
    checkOutOfBounds,
    handleOutOfBounds,
  ])

  useEffect(() => {
    const handleResize = () => {
      sceneManagerRef.current?.handleResize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleReset = useCallback(() => {
    const physicsEngine = physicsEngineRef.current

    stopSyncLoop()
    physicsEngine?.reset()
    physicsEngine?.stopLoop()
    simulationTimeRef.current = 0
    lastFrameTimeRef.current = 0
    lastHudUpdateRef.current = 0
    setSimulationTime(0)
    setTimelineProgress(0)
    setFps(0)
    renderSnapshot()

    if (resolvedIsPlaying) {
      setPlayingState(false)
    }
  }, [stopSyncLoop, renderSnapshot, resolvedIsPlaying, setPlayingState])

  const handleTimelineChange = useCallback((event) => {
    const nextProgress = Number(event.target.value)
    const physicsEngine = physicsEngineRef.current
    const targetTime = (nextProgress / 100) * TIMELINE_DURATION_SECONDS
    const targetSteps = Math.max(Math.round(targetTime * 60), 0)

    stopSyncLoop()
    physicsEngine?.stopLoop()
    simulationTimeRef.current = targetTime
    setTimelineProgress(nextProgress)
    setSimulationTime(targetTime)

    if (physicsEngine?.bodyDefinitions?.length) {
      physicsEngine.reset()
      physicsEngine.stopLoop()

      for (let index = 0; index < targetSteps; index += 1) {
        physicsEngine.step()
      }
    }

    renderSnapshot()

    if (resolvedIsPlaying) {
      setPlayingState(false)
    }
  }, [stopSyncLoop, renderSnapshot, resolvedIsPlaying, setPlayingState])

  return (
    <>
      <div className="pointer-events-none absolute left-5 top-5 z-10 flex flex-wrap items-center gap-3">
        <div className="rounded-full border border-white/10 bg-[var(--color-bg)]/72 px-4 py-2 font-mono-display text-xs uppercase tracking-[0.24em] text-slate-200 backdrop-blur-md">
          Time {formatNumber(simulationTime)} s
        </div>
        <div className="rounded-full border border-white/10 bg-[var(--color-bg)]/72 px-4 py-2 font-mono-display text-xs uppercase tracking-[0.24em] text-slate-200 backdrop-blur-md">
          FPS {formatNumber(fps, 0)}
        </div>
        <div className="rounded-full border border-white/10 bg-[var(--color-bg)]/72 px-4 py-2 font-mono-display text-xs uppercase tracking-[0.24em] text-slate-200 backdrop-blur-md">
          <span
            className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${
              resolvedIsPlaying
                ? 'bg-red-400 shadow-[0_0_14px_rgba(248,113,113,0.8)]'
                : 'bg-slate-500'
            }`}
          />
          {resolvedIsPlaying ? 'Live' : 'Paused'}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[linear-gradient(180deg,rgba(8,18,33,0.18),rgba(8,18,33,0.88))] px-4 py-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPlayingState(!resolvedIsPlaying)}
              className="rounded-2xl border border-[rgba(0,245,255,0.3)] bg-[rgba(0,245,255,0.12)] px-4 py-2 font-heading text-sm font-semibold tracking-wide text-[#dffeff] transition hover:bg-[rgba(0,245,255,0.18)]"
            >
              {resolvedIsPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-2xl border border-white/10 bg-white/6 px-4 py-2 font-heading text-sm font-semibold tracking-wide text-slate-100 transition hover:bg-white/10"
            >
              Reset
            </button>

            <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[var(--color-bg)]/78 px-3 py-2 font-mono-display text-xs uppercase tracking-[0.24em] text-slate-300">
              Speed
              <select
                value={String(resolvedPlaybackSpeed)}
                onChange={(event) => setPlaybackSpeedState(Number(event.target.value))}
                className="rounded-xl border border-white/10 bg-[var(--color-bg)] px-2 py-1 text-xs text-white outline-none"
              >
                {SPEED_OPTIONS.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}x
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-1 items-center gap-3 font-mono-display text-xs uppercase tracking-[0.24em] text-slate-300">
            <span className="shrink-0">Timeline</span>
            <input
              type="range"
              min="0"
              max="100"
              value={timelineProgress}
              onChange={handleTimelineChange}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[linear-gradient(90deg,rgba(0,245,255,0.45),rgba(255,255,255,0.08))] accent-[#00f5ff]"
            />
            <span className="w-10 shrink-0 text-right">
              {formatNumber(timelineProgress, 0)}%
            </span>
          </label>
        </div>
      </div>
    </>
  )
}

export default function SimulationCanvas({
  sceneConfig,
  bodyStates,
  forceVectors,
  isPlaying,
  playbackSpeed,
  onIsPlayingChange,
  onPlaybackSpeedChange,
  onReset,
}) {
  const canvasRef = useRef(null)
  const webglSupported = useMemo(() => checkWebGLSupport().supported, [])

  if (webglSupported === undefined) {
    return (
      <section className="relative flex h-full min-h-[400px] items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-[var(--color-bg)]/85">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00f5ff] border-t-transparent" />
      </section>
    )
  }

  if (webglSupported === false) {
    return (
      <section className="relative h-full min-h-[400px] overflow-hidden rounded-[24px] border border-white/10 bg-[var(--color-bg)]/85">
        <WebGLFallback />
      </section>
    )
  }

  return (
    <section className="relative h-full min-h-[760px] overflow-hidden rounded-[34px] border border-[rgba(0,245,255,0.14)] bg-[var(--color-bg)]/85 shadow-[0_26px_90px_rgba(2,8,23,0.6)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,245,255,0.12),transparent_32%),linear-gradient(180deg,rgba(10,15,30,0.12),rgba(10,15,30,0.55))]" />

      <canvas
        ref={canvasRef}
        className="relative z-0 h-full w-full"
      />

      <SimulationCanvasContent
        canvasRef={canvasRef}
        sceneConfig={sceneConfig}
        bodyStates={bodyStates}
        forceVectors={forceVectors}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        onIsPlayingChange={onIsPlayingChange}
        onPlaybackSpeedChange={onPlaybackSpeedChange}
        onReset={onReset}
      />
    </section>
  )
}
