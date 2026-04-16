import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Navbar from './components/Navbar'
import ProblemInput from './components/ProblemInput'
import SolutionPanel from './components/SolutionPanel'
import GraphPanel from './components/GraphPanel'
import SimulationRouter from './components/SimulationRouter'
import ErrorBoundary from './components/ErrorBoundary'
import ToastContainer from './components/Toast'
import SplashScreen from './components/SplashScreen'
import PhysicsLibrary from './components/PhysicsLibrary'
import FormulaSheet from './components/FormulaSheet'
import SessionSummary from './components/SessionSummary'
import useSimulation from './hooks/useSimulation'
import usePerformanceMonitor from './hooks/usePerformanceMonitor'
import useSession from './hooks/useSession'
import { decodeDemoFromURL } from './utils/share'
import { getRandomDemo } from './data/demos'
import { SIMULATION_COLORS } from './hooks/useSimulation'

const LOADING_MESSAGES = [
  'Reading problem...',
  'Extracting variables...',
  'Building simulation...',
  'Rendering scene...',
]

const DEMOS = [
  'A 10kg block slides down a 30-degree frictionless incline.',
  'A ball is launched at 20 m/s at an angle of 45 degrees.',
  'A simple pendulum has length 2 m.',
  'A 2kg mass attached to a spring with k=100 N/m.',
  'A car travels in a circle with radius 50m at 20 m/s.',
  'Two balls with masses 2kg and 3kg collide elastically at 5 m/s.',
  'A wave travels with amplitude 0.3m and frequency 2Hz.',
  'A solid disk of mass 5kg rotates under a 20N force.',
  'A satellite orbits Earth at altitude 400km.',
]

const AI_PROVIDER_STORAGE_KEY = 'simusolve.aiProvider'
const AI_PROVIDERS = ['anthropic', 'openai', 'gemini', 'groq']

function getInitialProvider() {
  if (typeof window === 'undefined') {
    return 'anthropic'
  }

  const storedValue = window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY)
  return AI_PROVIDERS.includes(storedValue) ? storedValue : 'anthropic'
}

function LoadingOverlay({ isVisible }) {
  const messageIndexRef = useRef(0)
  const intervalRef = useRef(null)
  const [currentMessage, setCurrentMessage] = useState(LOADING_MESSAGES[0])
  const [showOverlay, setShowOverlay] = useState(false)

  useEffect(() => {
    setShowOverlay(isVisible)
  }, [isVisible])

  useEffect(() => {
    if (!showOverlay) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    messageIndexRef.current = 0
    setCurrentMessage(LOADING_MESSAGES[0])

    intervalRef.current = setInterval(() => {
      messageIndexRef.current = (messageIndexRef.current + 1) % LOADING_MESSAGES.length
      setCurrentMessage(LOADING_MESSAGES[messageIndexRef.current])
    }, 800)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [showOverlay])

  if (!showOverlay) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1e]/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full border-4 border-[#00f5ff]/30" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-[rgba(0,245,255,0.3)] bg-[rgba(0,245,255,0.1)]">
            <svg className="h-10 w-10 animate-spin text-[#00f5ff]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="font-heading text-2xl font-semibold text-white">Processing</p>
          <p className="min-w-[240px] text-center font-mono-display text-sm uppercase tracking-wider text-[#00f5ff]">
            {currentMessage}
          </p>
        </div>
      </div>
    </div>
  )
}

function FPSMonitor({ fps, isPerformanceMode }) {
  const fpsColor = fps < 30 ? '#ff4444' : fps < 45 ? '#ffaa00' : '#00ff88'
  
  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 font-mono-display text-xs backdrop-blur-sm">
      <span style={{ color: fpsColor }}>FPS: {fps}</span>
      {isPerformanceMode && (
        <span className="rounded-full border border-[#ff8800]/50 bg-[#ff8800]/20 px-2 py-0.5 text-[#ff8800]">
          Performance Mode
        </span>
      )}
    </div>
  )
}

function KeyboardShortcutsHelp({ isVisible, onClose }) {
  if (!isVisible) return null

  const shortcuts = [
    { key: 'Space', action: 'Play / Pause' },
    { key: 'R', action: 'Reset simulation' },
    { key: '1-9', action: 'Load demo problems' },
    { key: 'D', action: 'Toggle slideshow mode' },
    { key: 'F', action: 'Toggle formula sheet' },
    { key: 'P', action: 'Toggle presentation mode' },
    { key: 'Esc', action: 'Close panels' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-2xl border border-white/10 bg-[#0a0f1e] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="mb-4 font-heading text-lg font-semibold text-white">Keyboard Shortcuts</h3>
        <div className="space-y-2">
          {shortcuts.map(({ key, action }) => (
            <div key={key} className="flex items-center gap-4">
              <kbd className="min-w-[60px] rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-center font-mono text-sm text-white">
                {key}
              </kbd>
              <span className="font-mono-display text-sm text-slate-400">{action}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
          Press any key to close
        </button>
      </div>
    </div>
  )
}

function PresentationControls({ 
  onPlayPause, 
  onReset, 
  onExit, 
  isPlaying, 
  simulationType,
  onShowSummary 
}) {
  const accentColor = SIMULATION_COLORS[simulationType] || '#00f5ff'
  
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/10 bg-black/80 px-6 py-3 backdrop-blur-md">
      <button
        onClick={onPlayPause}
        className="flex h-10 w-10 items-center justify-center rounded-full transition hover:scale-110"
        style={{ backgroundColor: `${accentColor}33`, borderColor: `${accentColor}66` }}
      >
        {isPlaying ? (
          <svg className="h-5 w-5" fill="currentColor" style={{ color: accentColor }} viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="currentColor" style={{ color: accentColor }} viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <button
        onClick={onReset}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 transition hover:scale-110 hover:bg-white/20"
      >
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
      <div className="h-6 w-px bg-white/20" />
      <button
        onClick={onShowSummary}
        className="rounded-full border border-white/20 bg-white/10 px-4 py-2 font-mono-display text-xs text-white transition hover:bg-white/20"
      >
        Session
      </button>
      <button
        onClick={onExit}
        className="rounded-full border border-[#ff4444]/50 bg-[#ff4444]/10 px-4 py-2 font-mono-display text-xs text-[#ff4444] transition hover:bg-[#ff4444]/20"
      >
        Exit (P)
      </button>
    </div>
  )
}

function SlideshowIndicator({ current, total, isActive }) {
  if (!isActive) return null
  
  return (
    <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-black/80 px-4 py-2 font-mono-display text-xs backdrop-blur-sm">
      <span className="text-[#ff8800]">Slideshow</span>
      <span className="text-white">{current + 1} / {total}</span>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-3 rounded-full transition-all ${
              i === current ? 'bg-[#00f5ff]' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const simulation = useSimulation()
  const performance = usePerformanceMonitor()
  const session = useSession()
  
  const [showSplash, setShowSplash] = useState(true)
  const [showLibrary, setShowLibrary] = useState(false)
  const [showFormulaSheet, setShowFormulaSheet] = useState(false)
  const [showSessionSummary, setShowSessionSummary] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const [isSlideshowMode, setIsSlideshowMode] = useState(false)
  const [slideshowIndex, setSlideshowIndex] = useState(0)
  const [isCrossfading, setIsCrossfading] = useState(false)
  const [prevSimulationType, setPrevSimulationType] = useState(null)
  const [aiProvider, setAiProvider] = useState(getInitialProvider)
  
  useEffect(() => {
    window.localStorage.setItem(AI_PROVIDER_STORAGE_KEY, aiProvider)
  }, [aiProvider])

  const slideshowIntervalRef = useRef(null)
  const frameLoopRef = useRef(null)

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false)
  }, [])

  useEffect(() => {
    const demoFromURL = decodeDemoFromURL()
    if (demoFromURL) {
      simulation.solve(demoFromURL.parsedData)
    }
  }, [simulation])

  useEffect(() => {
    if (simulation.activeSimulation && simulation.activeSimulation !== prevSimulationType) {
      setIsCrossfading(true)
      setTimeout(() => {
        setIsCrossfading(false)
        setPrevSimulationType(simulation.activeSimulation)
      }, 400)
      session.logSimulation(simulation.activeSimulation, simulation.parsedData?.type || simulation.activeSimulation)
    }
  }, [simulation.activeSimulation, simulation.parsedData, session, prevSimulationType])

  useEffect(() => {
    const measureLoop = () => {
      performance.measureFrame()
      frameLoopRef.current = requestAnimationFrame(measureLoop)
    }
    frameLoopRef.current = requestAnimationFrame(measureLoop)
    return () => {
      if (frameLoopRef.current) {
        cancelAnimationFrame(frameLoopRef.current)
      }
    }
  }, [performance])

  const handleProblemSolved = useCallback((parsedData) => {
    session.logProblem(parsedData?.type || 'unknown', parsedData)
    simulation.solve(parsedData, aiProvider)
  }, [aiProvider, simulation, session])

  const handleSelectSimulation = useCallback((simulationType) => {
    const demoMap = {
      inclined_plane: 'A 10kg block slides down a 30-degree frictionless incline.',
      projectile: 'A ball is launched at 20 m/s at an angle of 45 degrees.',
      pendulum: 'A simple pendulum has length 2 m.',
      spring_mass: 'A 2kg mass attached to a spring with k=100 N/m.',
      circular_motion: 'A car travels in a circle with radius 50m at 20 m/s.',
      collisions: 'Two balls with masses 2kg and 3kg collide elastically.',
      wave_motion: 'A wave travels with amplitude 0.3m and frequency 2Hz.',
      rotational_mechanics: 'A solid disk of mass 5kg rotates under a 20N force.',
      orbital: 'A satellite orbits Earth at altitude 400km.',
      buoyancy: 'A wooden block floats in water.',
      ideal_gas: 'An ideal gas at 300K with 100 particles.',
      electric_field: 'Two charges interact: +1μC and -1μC separated by 2m.',
      optics_lens: 'Light passes through a convex lens with f=10cm.',
      optics_mirror: 'Light reflects from a concave mirror with f=20cm.',
      radioactive_decay: 'A sample of 1000 Carbon-14 atoms decays.',
      electromagnetic: 'An electron moves at 1e6 m/s through a 0.5T magnetic field.',
    }
    const problemText = demoMap[simulationType] || 'A physics simulation.'
    simulation.solve(problemText, aiProvider)
    setShowLibrary(false)
  }, [aiProvider, simulation])

  const handleDemoMode = useCallback(() => {
    const demo = getRandomDemo()
    simulation.solve(demo.parsedData)
  }, [simulation])

  const handleSlideshowStep = useCallback(() => {
    setIsCrossfading(true)
    setTimeout(() => {
      const nextIndex = (slideshowIndex + 1) % DEMOS.length
      setSlideshowIndex(nextIndex)
      simulation.solve(DEMOS[nextIndex], aiProvider)
      setIsCrossfading(false)
    }, 400)
  }, [aiProvider, slideshowIndex, simulation])

  useEffect(() => {
    if (isSlideshowMode) {
      slideshowIntervalRef.current = setInterval(handleSlideshowStep, 8000)
    } else {
      if (slideshowIntervalRef.current) {
        clearInterval(slideshowIntervalRef.current)
      }
    }
    return () => {
      if (slideshowIntervalRef.current) {
        clearInterval(slideshowIntervalRef.current)
      }
    }
  }, [isSlideshowMode, handleSlideshowStep])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (simulation.isPlaying) simulation.pause()
          else simulation.play()
          break
        case 'KeyR':
          simulation.reset()
          break
        case 'KeyD':
          setIsSlideshowMode(prev => !prev)
          if (!isSlideshowMode) {
            setSlideshowIndex(0)
              simulation.solve(DEMOS[0], aiProvider)
            }
            break
        case 'KeyF':
          setShowFormulaSheet(prev => !prev)
          break
        case 'KeyP':
          setIsPresentationMode(prev => !prev)
          break
        case 'Escape':
          setShowLibrary(false)
          setShowFormulaSheet(false)
          setShowHelp(false)
          break
        case 'Digit1': case 'Digit2': case 'Digit3':
        case 'Digit4': case 'Digit5': case 'Digit6':
        case 'Digit7': case 'Digit8': case 'Digit9':
          const num = parseInt(e.code.replace('Digit', '')) - 1
          if (DEMOS[num]) {
            setIsCrossfading(true)
            setTimeout(() => {
              simulation.solve(DEMOS[num], aiProvider)
              setIsCrossfading(false)
            }, 400)
          }
          break
        case 'Slash':
          setShowHelp(prev => !prev)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [aiProvider, simulation, isSlideshowMode])

  const hasSolved = !!simulation.parsedData
  const accentColor = useMemo(() => 
    SIMULATION_COLORS[simulation.activeSimulation] || '#00f5ff',
    [simulation.activeSimulation]
  )

  return (
    <>
      <SplashScreen onComplete={handleSplashComplete} />

      {showSplash && <div className="hidden" />}

      <div className={`relative min-h-screen overflow-hidden bg-[#0a0f1e] text-white transition-opacity duration-500 ${
        showSplash ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,245,255,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(0,245,255,0.05),transparent_35%)]" />

        <Navbar
          activeDomain="physics"
          onDomainChange={() => {}}
          onDemoMode={handleDemoMode}
          parsedData={simulation.parsedData}
          onOpenLibrary={() => setShowLibrary(true)}
          onSelectSimulation={handleSelectSimulation}
          onToggleFormula={() => setShowFormulaSheet(prev => !prev)}
          onTogglePresentation={() => setIsPresentationMode(prev => !prev)}
          isPresentationMode={isPresentationMode}
        />

        <FPSMonitor fps={performance.fps} isPerformanceMode={performance.isPerformanceMode} />
        <SlideshowIndicator current={slideshowIndex} total={DEMOS.length} isActive={isSlideshowMode} />
        <KeyboardShortcutsHelp isVisible={showHelp} onClose={() => setShowHelp(false)} />

        {isPresentationMode && (
          <PresentationControls
            onPlayPause={() => simulation.isPlaying ? simulation.pause() : simulation.play()}
            onReset={simulation.reset}
            onExit={() => setIsPresentationMode(false)}
            isPlaying={simulation.isPlaying}
            simulationType={simulation.activeSimulation}
            onShowSummary={() => setShowSessionSummary(true)}
          />
        )}

        <main className={`relative mx-auto flex min-h-[calc(100vh-80px)] max-w-[1800px] gap-4 px-4 pb-4 lg:px-6 transition-all duration-400 ${
          isPresentationMode ? 'opacity-0 pointer-events-none' : ''
        } ${isCrossfading ? 'opacity-50' : 'opacity-100'}`}>
          <LoadingOverlay isVisible={simulation.isLoading} />

          <section className={`flex w-full flex-col gap-4 transition-all duration-400 ${
            isPresentationMode ? 'hidden' : 'lg:w-auto lg:min-w-[420px] lg:max-w-[480px]'
          }`}>
            <div className={`transition-all duration-500 ${
              hasSolved ? 'lg:max-h-[280px] lg:overflow-hidden' : ''
            }`}>
              <ProblemInput
                onSolved={handleProblemSolved}
                isLoading={simulation.isLoading}
                provider={aiProvider}
                onProviderChange={setAiProvider}
              />
            </div>

            <div className={`transition-all duration-500 ${
              hasSolved
                ? 'max-h-[800px] opacity-100 lg:max-h-[600px]'
                : 'max-h-0 overflow-hidden opacity-0 lg:max-h-0'
            }`}>
              {hasSolved && (
                <div className="space-y-4">
                  <div className="animate-[slideInUp_0.5s_ease-out]">
                    <SolutionPanel
                      parsedData={simulation.parsedData}
                      onVariableChange={simulation.updateVariable}
                    />
                  </div>

                  <div className="animate-[slideInUp_0.5s_ease-out_0.15s_both]">
                    <GraphPanel
                      simulationType={simulation.activeSimulation}
                      dataStream={simulation.dataStream}
                      variables={simulation.currentVariables}
                      accentColor={accentColor}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className={`flex-1 transition-all duration-400 ${
            isPresentationMode ? 'block' : 'hidden lg:block'
          }`}>
            <div 
              className="h-full overflow-hidden rounded-[24px] border shadow-[0_24px_80px_rgba(2,8,23,0.55)] transition-all duration-400"
              style={{ borderColor: isPresentationMode ? 'transparent' : `${accentColor}22`, backgroundColor: `${accentColor}08` }}
            >
              <ErrorBoundary onReset={simulation.reset}>
                <SimulationRouter
                  simulationType={simulation.activeSimulation}
                  variables={simulation.currentVariables}
                  isPlaying={simulation.isPlaying}
                  simulationKey={simulation.simulationKey}
                  onDataPoint={simulation.onDataPoint}
                  isLoading={simulation.isLoading}
                  particleMultiplier={performance.particleMultiplier}
                  accentColor={accentColor}
                />
              </ErrorBoundary>
            </div>
          </section>

          <PhysicsLibrary
            isOpen={showLibrary}
            onClose={() => setShowLibrary(false)}
            onSelectSimulation={handleSelectSimulation}
          />

          <ToastContainer />
        </main>

        <FormulaSheet
          isOpen={showFormulaSheet}
          onClose={() => setShowFormulaSheet(false)}
          activeSimulation={simulation.activeSimulation}
        />

        <SessionSummary
          isOpen={showSessionSummary}
          onClose={() => setShowSessionSummary(false)}
          summary={session.getSummary()}
        />

        <style>{`
          @keyframes slideInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .duration-400 { transition-duration: 400ms; }
        `}</style>
      </div>
    </>
  )
}
