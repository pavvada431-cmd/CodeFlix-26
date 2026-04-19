import { useState, useEffect, useCallback, useRef } from 'react'
import ResizableSidebar from '../components/ResizableSidebar'
import SimulationCard from '../components/SimulationCard'
import GraphPanel from '../components/GraphPanel'
import ResizableRightPanel from '../components/ResizableRightPanel'
import PhysicsLibrary from '../components/PhysicsLibrary'
import EmptyState from '../components/EmptyState'
import useSimulation from '../hooks/useSimulation'
import usePerformanceMonitor from '../hooks/usePerformanceMonitor'
import useSession from '../hooks/useSession'
import { getPhysicsDemos, getChemistryDemos } from '../data/demos'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import { BookOpen, Dice5 } from 'lucide-react'

const AI_PROVIDER_STORAGE_KEY = 'simusolve.aiProvider-physics'
const AI_PROVIDERS = ['anthropic', 'openai', 'gemini', 'groq', 'ollama']

function getInitialProvider() {
  if (typeof window === 'undefined') return 'anthropic'
  const storedValue = window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY)
  return AI_PROVIDERS.includes(storedValue) ? storedValue : 'anthropic'
}

function LoadingOverlay({ isVisible }) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div 
        className="rounded-xl border p-6 shadow-lg"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div 
          className="mb-3 h-5 w-5 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }}
        />
        <p className="text-sm" style={{ color: 'var(--color-text)' }}>🔬 Preparing physics simulation...</p>
      </div>
    </div>
  )
}

export default function PhysicsPage({ sidebarWidth, onSidebarWidthChange, rightPanelWidth, onRightPanelWidthChange }) {
  const simulation = useSimulation()
  const { particleMultiplier, measureFrame } = usePerformanceMonitor()
  const session = useSession()
  const frameLoopRef = useRef(null)

  const [showLibrary, setShowLibrary] = useState(false)
  const [aiProvider, setAiProvider] = useState(getInitialProvider)

  useEffect(() => {
    window.localStorage.setItem(AI_PROVIDER_STORAGE_KEY, aiProvider)
  }, [aiProvider])

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
    session.logProblem(parsedData?.type || 'physics', parsedData)
    simulation.solve(parsedData, aiProvider)
  }, [aiProvider, session, simulation])

  const handleSelectSimulation = useCallback((simulationType) => {
    const demo = [...getPhysicsDemos(), ...getChemistryDemos()].find(d => d.type === simulationType)
    const parsedData = demo?.parsedData ?? {
      domain: 'physics',
      type: simulationType,
      variables: {},
      units: {},
      steps: [],
    }
    simulation.solve(parsedData, aiProvider)
    setShowLibrary(false)
  }, [aiProvider, simulation])

  const handleDemoMode = useCallback(() => {
    const demos = getPhysicsDemos()
    const demo = demos[Math.floor(Math.random() * demos.length)]
    simulation.solve(demo.parsedData, aiProvider)
  }, [aiProvider, simulation])

  const handleQuickExample = useCallback((problemText) => {
    simulation.solve(problemText, aiProvider)
  }, [aiProvider, simulation])

  // Handlers must be defined BEFORE useEffect that references them
  const handleTogglePlay = useCallback(() => {
    if (simulation.isPlaying) {
      simulation.pause()
    } else {
      simulation.play()
    }
  }, [simulation])

  const handleReset = useCallback(() => {
    simulation.reset()
  }, [simulation])

  const handleRandomDemo = useCallback(() => {
    handleDemoMode()
  }, [handleDemoMode])

  // Keyboard event handlers
  useEffect(() => {
    window.addEventListener('sts:toggle-play', handleTogglePlay)
    window.addEventListener('sts:reset-simulation', handleReset)
    window.addEventListener('sts:random-demo', handleRandomDemo)

    return () => {
      window.removeEventListener('sts:toggle-play', handleTogglePlay)
      window.removeEventListener('sts:reset-simulation', handleReset)
      window.removeEventListener('sts:random-demo', handleRandomDemo)
    }
  }, [handleTogglePlay, handleReset, handleRandomDemo])

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <LoadingOverlay isVisible={simulation.isLoading} />

      <ResizableSidebar
        width={sidebarWidth}
        onWidthChange={onSidebarWidthChange}
        onSolved={handleProblemSolved}
        isLoading={simulation.isLoading}
        provider={aiProvider}
        onProviderChange={setAiProvider}
        onApiStatusChange={() => {}}
        onOpenLibrary={() => setShowLibrary(true)}
        onDemoMode={handleDemoMode}
        onShowSession={() => {}}
        domain="physics"
      />

      <main className="flex-1 overflow-auto p-6" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="mx-auto max-w-[1200px] space-y-6">
          <PageHeader
            eyebrow="Simulator · Physics"
            title="See the"
            accent="Physics"
            subtitle="Mechanics, waves, electromagnetism, optics, fluids, and nuclear decay — parsed from plain-English problems and rendered live."
            stats={[
              { value: '16', label: 'simulations' },
              { value: 'Live', label: 'telemetry' },
              { value: 'Offline', label: 'fallback' },
            ]}
            actions={
              <>
                <Button variant="secondary" onClick={() => setShowLibrary(true)}>
                  <BookOpen className="mr-2 h-4 w-4" /> Library
                </Button>
                <Button variant="primary" onClick={handleDemoMode}>
                  <Dice5 className="mr-2 h-4 w-4" /> Random demo
                </Button>
              </>
            }
          />

          {simulation.activeSimulation ? (
            <SimulationCard simulation={simulation} particleMultiplier={particleMultiplier} />
          ) : (
            <EmptyState
              onSelectExample={handleQuickExample}
              examples={[
                'A ball is thrown at 25 m/s at 60 degrees',
                'A 5kg block slides down a 35 degree ramp with friction 0.2',
                'Two carts collide elastically: m1=2kg at 4m/s, m2=3kg at rest',
              ]}
            />
          )}
          
          <GraphPanel
            simulationType={simulation.activeSimulation}
            dataStream={simulation.dataStream}
            variables={simulation.currentVariables}
            accentColor="var(--color-accent)"
          />
        </div>
      </main>

      <ResizableRightPanel
        width={rightPanelWidth}
        onWidthChange={onRightPanelWidthChange}
        parsedData={simulation.parsedData}
        onVariableChange={simulation.updateVariable}
        currentVariables={simulation.currentVariables}
        dataStream={simulation.dataStream}
        isPlaying={simulation.isPlaying}
        simulationType={simulation.activeSimulation}
      />

      <PhysicsLibrary
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelectSimulation={handleSelectSimulation}
        category="physics"
      />
    </div>
  )
}
