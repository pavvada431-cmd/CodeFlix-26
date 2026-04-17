import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import SimulationCard from '../components/SimulationCard'
import RightPanel from '../components/RightPanel'
import GraphPanel from '../components/GraphPanel'
import ToastContainer from '../components/Toast'
import PhysicsLibrary from '../components/PhysicsLibrary'
import FormulaSheet from '../components/FormulaSheet'
import SessionSummary from '../components/SessionSummary'
import OnboardingTour from '../components/OnboardingTour'
import EmptyState from '../components/EmptyState'
import useSimulation from '../hooks/useSimulation'
import usePerformanceMonitor from '../hooks/usePerformanceMonitor'
import useSession from '../hooks/useSession'
import { decodeDemoFromURL } from '../utils/share'
import { getRandomDemo } from '../data/demos'

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
const ONBOARDING_KEY = 'seethescience.onboarding-done'
const AI_PROVIDERS = ['openai', 'anthropic', 'gemini', 'groq', 'ollama']

function getInitialProvider() {
  if (typeof window === 'undefined') return 'openai'
  const storedValue = window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY)
  return AI_PROVIDERS.includes(storedValue) ? storedValue : 'openai'
}

function LoadingOverlay({ isVisible, message = 'Parsing problem...' }) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f17]/70 backdrop-blur-sm">
      <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-8 shadow-2xl max-w-sm">
        <div className="mb-4 flex justify-center">
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-full border-2 border-[#1f2937]" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#22d3ee] animate-spin" />
          </div>
        </div>
        <p className="text-center text-sm text-[#e5e7eb]">{message}</p>
        <p className="mt-2 text-center text-xs text-[#6b7280]">This may take a few moments...</p>
      </div>
    </div>
  )
}

export default function SimulatorApp() {
  const simulation = useSimulation()
  const { particleMultiplier, measureFrame } = usePerformanceMonitor()
  const session = useSession()
  const frameLoopRef = useRef(null)
  const [searchParams] = useSearchParams()

  const [showLibrary, setShowLibrary] = useState(false)
  const [showFormulaSheet, setShowFormulaSheet] = useState(false)
  const [showSessionSummary, setShowSessionSummary] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [aiProvider, setAiProvider] = useState(getInitialProvider)
  const [mode, setMode] = useState('physics')
  const [apiConnected, setApiConnected] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState('Parsing problem...')

  // Check if first time user
  useEffect(() => {
    const hasSeenOnboarding = window.localStorage.getItem(ONBOARDING_KEY)
    if (!hasSeenOnboarding) {
      setShowOnboarding(true)
      window.localStorage.setItem(ONBOARDING_KEY, 'true')
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(AI_PROVIDER_STORAGE_KEY, aiProvider)
  }, [aiProvider])

  // Check for demo in URL
  useEffect(() => {
    const demoProblem = searchParams.get('demo')
    if (demoProblem) {
      simulation.solve(demoProblem)
    } else {
      const demoFromURL = decodeDemoFromURL()
      if (demoFromURL) simulation.solve(demoFromURL.parsedData)
    }
  }, [simulation, searchParams])

  // Performance measurement loop
  useEffect(() => {
    const measureLoop = () => {
      measureFrame()
      frameLoopRef.current = requestAnimationFrame(measureLoop)
    }
    frameLoopRef.current = requestAnimationFrame(measureLoop)
    return () => {
      if (frameLoopRef.current) cancelAnimationFrame(frameLoopRef.current)
    }
  }, [measureFrame])

  const handleProblemSolved = useCallback((parsedData) => {
    session.logProblem(parsedData?.type || 'unknown', parsedData)
    setLoadingMessage('Building simulation...')
    simulation.solve(parsedData, aiProvider)
  }, [aiProvider, session, simulation])

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
    setLoadingMessage('Building simulation...')
    simulation.solve(demoMap[simulationType] || 'A physics simulation.', aiProvider)
    setShowLibrary(false)
  }, [aiProvider, simulation])

  const handleDemoMode = useCallback(() => {
    const demo = getRandomDemo()
    setLoadingMessage('Building simulation...')
    simulation.solve(demo.parsedData)
  }, [simulation])

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
        case 'Digit1': case 'Digit2': case 'Digit3':
        case 'Digit4': case 'Digit5': case 'Digit6':
        case 'Digit7': case 'Digit8': case 'Digit9': {
          const num = parseInt(e.code.replace('Digit', ''), 10) - 1
          if (DEMOS[num]) {
            setLoadingMessage('Building simulation...')
            simulation.solve(DEMOS[num], aiProvider)
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [aiProvider, simulation])

  return (
    <div className="min-h-screen bg-[#0b0f17] text-[#e5e7eb]">
      <Navbar
        mode={mode}
        onModeChange={setMode}
        apiConnected={apiConnected}
        onOpenSettings={() => setShowFormulaSheet(true)}
      />

      <LoadingOverlay isVisible={simulation.isLoading} message={loadingMessage} />

      <div className="pt-16">
        <main className="flex min-h-[calc(100vh-64px)]">
          <Sidebar
            onSolved={handleProblemSolved}
            isLoading={simulation.isLoading}
            provider={aiProvider}
            onProviderChange={setAiProvider}
            onApiStatusChange={setApiConnected}
            onOpenLibrary={() => setShowLibrary(true)}
            onDemoMode={handleDemoMode}
            onShowSession={() => setShowSessionSummary(true)}
          />

          <section className="flex-1 overflow-auto p-6">
            {!simulation.activeSimulation ? (
              <EmptyState
                onOpenLibrary={() => setShowLibrary(true)}
                onTryDemo={handleDemoMode}
              />
            ) : (
              <div className="mx-auto max-w-[1200px] space-y-6">
                <SimulationCard simulation={simulation} particleMultiplier={particleMultiplier} />
                <GraphPanel
                  simulationType={simulation.activeSimulation}
                  dataStream={simulation.dataStream}
                  variables={simulation.currentVariables}
                  accentColor="#22d3ee"
                />
              </div>
            )}
          </section>

          <RightPanel 
            parsedData={simulation.parsedData} 
            onVariableChange={simulation.updateVariable}
            currentVariables={simulation.currentVariables}
            dataStream={simulation.dataStream}
            isPlaying={simulation.isPlaying}
            simulationType={simulation.activeSimulation}
            isEmpty={!simulation.activeSimulation}
          />
        </main>
      </div>

      <PhysicsLibrary
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelectSimulation={handleSelectSimulation}
      />

      <FormulaSheet
        isOpen={showFormulaSheet}
        onClose={() => setShowFormulaSheet(false)}
      />

      <SessionSummary
        isOpen={showSessionSummary}
        onClose={() => setShowSessionSummary(false)}
        summary={session.getSummary()}
      />

      <OnboardingTour
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      <ToastContainer />
    </div>
  )
}
