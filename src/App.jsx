import { useState, useEffect, useCallback, useRef } from 'react'
import Navbar from './components/Navbar'
import ProblemInput from './components/ProblemInput'
import SolutionPanel from './components/SolutionPanel'
import GraphPanel from './components/GraphPanel'
import SimulationRouter from './components/SimulationRouter'
import ErrorBoundary from './components/ErrorBoundary'
import ToastContainer from './components/Toast'
import SplashScreen from './components/SplashScreen'
import useSimulation from './hooks/useSimulation'
import { decodeDemoFromURL } from './utils/share'
import { getRandomDemo } from './data/demos'

const LOADING_MESSAGES = [
  'Reading problem...',
  'Extracting variables...',
  'Building simulation...',
  'Rendering scene...',
]

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
        intervalRef.current = null
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
            <svg
              className="h-10 w-10 animate-spin text-[#00f5ff]"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="font-heading text-2xl font-semibold text-white">
            Processing
          </p>
          <p className="min-w-[240px] text-center font-mono-display text-sm uppercase tracking-wider text-[#00f5ff]">
            {currentMessage}
          </p>
        </div>
      </div>
    </div>
  )
}

function DemoModeOverlay({ isVisible, onClose }) {
  if (!isVisible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-40 bg-[#0a0f1e]/40 backdrop-blur-sm">
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-[24px] border border-white/10 bg-[#07111f]/95 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(0,245,255,0.3)] bg-[rgba(0,245,255,0.1)]">
              <span className="font-heading text-xl font-bold text-[#00f5ff]">D</span>
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-white">Demo Mode</p>
              <p className="font-mono-display text-xs text-slate-400">Inclined Plane Simulation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono-display text-xs uppercase tracking-wider text-slate-300 transition hover:border-white/20 hover:bg-white/10"
          >
            Close Demo
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const simulation = useSimulation()
  const [activeDomain, setActiveDomain] = useState('physics')
  const [showDemoOverlay, setShowDemoOverlay] = useState(false)
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const demoFromURL = decodeDemoFromURL()
    if (demoFromURL) {
      simulation.solve(demoFromURL.parsedData)
    }
  }, [simulation])

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false)
  }, [])

  const handleDemoMode = useCallback(() => {
    const demo = getRandomDemo()
    setShowDemoOverlay(true)
    simulation.solve(demo.parsedData)
    setTimeout(() => setShowDemoOverlay(false), 2000)
  }, [simulation])

  const handleProblemSolved = useCallback((parsedData) => {
    simulation.solve(parsedData)
  }, [simulation])

  const hasSolved = !!simulation.parsedData

  return (
    <>
      <SplashScreen onComplete={handleSplashComplete} />

      {showSplash && <div className="hidden" />} {/* Prevent main content flash */}

      <div className={`relative min-h-screen overflow-hidden bg-[#0a0f1e] text-white transition-opacity duration-500 ${showSplash ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,245,255,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(0,245,255,0.05),transparent_35%)]" />

      <Navbar
        activeDomain={activeDomain}
        onDomainChange={setActiveDomain}
        onDemoMode={handleDemoMode}
        parsedData={simulation.parsedData}
      />

      <main className="relative mx-auto flex min-h-[calc(100vh-80px)] max-w-[1800px] gap-4 px-4 pb-4 lg:px-6">
        <LoadingOverlay isVisible={simulation.isLoading} />
        <DemoModeOverlay isVisible={showDemoOverlay} onClose={() => setShowDemoOverlay(false)} />

        <section className="flex w-full flex-col gap-4 lg:w-auto lg:min-w-[420px] lg:max-w-[480px]">
          <div
            className={`transition-all duration-500 ${
              hasSolved ? 'lg:max-h-[280px] lg:overflow-hidden' : ''
            }`}
          >
            <ProblemInput
              onSolved={handleProblemSolved}
              isLoading={simulation.isLoading}
            />
          </div>

          <div
            className={`transition-all duration-500 ${
              hasSolved
                ? 'max-h-[800px] opacity-100 lg:max-h-[600px]'
                : 'max-h-0 overflow-hidden opacity-0 lg:max-h-0'
            }`}
          >
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
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="hidden flex-1 lg:block">
          <div className="sticky top-4 h-[calc(100vh-100px)] overflow-hidden rounded-[24px] border border-white/10 bg-[#07111f]/80 shadow-[0_24px_80px_rgba(2,8,23,0.55)]">
            <ErrorBoundary
              onReset={() => {
                simulation.reset()
              }}
            >
              <SimulationRouter
                simulationType={simulation.activeSimulation}
                variables={simulation.currentVariables}
                isPlaying={simulation.isPlaying}
                simulationKey={simulation.simulationKey}
                onDataPoint={simulation.onDataPoint}
                isLoading={simulation.isLoading}
              />
            </ErrorBoundary>
          </div>
        </section>

        <section className="fixed inset-x-0 bottom-0 flex h-[40vh] flex-col lg:hidden">
          <div className="flex h-full flex-col overflow-hidden rounded-t-[24px] border border-white/10 border-b-0 bg-[#07111f]/80 shadow-[0_-24px_80px_rgba(2,8,23,0.55)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="font-mono-display text-xs uppercase tracking-[0.24em] text-[#00f5ff]">
                Simulation
              </p>
              <div className="flex gap-2">
                <button
                  onClick={simulation.reset}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono-display text-xs uppercase tracking-wider text-slate-300 transition hover:border-white/20"
                >
                  Reset
                </button>
                <button
                  onClick={simulation.isPlaying ? simulation.pause : simulation.play}
                  className="rounded-full border border-[rgba(0,245,255,0.3)] bg-[rgba(0,245,255,0.1)] px-3 py-1 font-mono-display text-xs uppercase tracking-wider text-[#00f5ff] transition hover:bg-[rgba(0,245,255,0.2)]"
                >
                  {simulation.isPlaying ? 'Pause' : 'Play'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary
                onReset={() => {
                  simulation.reset()
                }}
              >
                <SimulationRouter
                  simulationType={simulation.activeSimulation}
                  variables={simulation.currentVariables}
                  isPlaying={simulation.isPlaying}
                  simulationKey={simulation.simulationKey}
                  onDataPoint={simulation.onDataPoint}
                  isLoading={simulation.isLoading}
                />
              </ErrorBoundary>
            </div>
          </div>
        </section>

        <ToastContainer />
      </main>

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      </div>
      </>
    )
}

export default App
