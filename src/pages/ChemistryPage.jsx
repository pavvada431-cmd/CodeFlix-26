import { useState, useEffect, useCallback, useRef } from 'react'
import ResizableSidebar from '../components/ResizableSidebar'
import SimulationCard from '../components/SimulationCard'
import GraphPanel from '../components/GraphPanel'
import ResizableRightPanel from '../components/ResizableRightPanel'
import ChemistryLibrary from '../components/ChemistryLibrary'
import EmptyState from '../components/EmptyState'
import useSimulation from '../hooks/useSimulation'
import usePerformanceMonitor from '../hooks/usePerformanceMonitor'
import useSession from '../hooks/useSession'
import { getChemistryDemos } from '../data/demos'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import { BookOpen, Dice5 } from 'lucide-react'
import ShareButton from '../components/ShareButton'
import ConversationDrawer from '../components/ConversationDrawer'
import { readShareFromHash, payloadToParsedData } from '../utils/share'

const AI_PROVIDER_STORAGE_KEY = 'simusolve.aiProvider-chemistry'
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
        <p className="text-sm" style={{ color: 'var(--color-text)' }}>🧪 Preparing chemistry simulation...</p>
      </div>
    </div>
  )
}

export default function ChemistryPage({ sidebarWidth, onSidebarWidthChange, rightPanelWidth, onRightPanelWidthChange }) {
  const simulation = useSimulation()
  const { particleMultiplier, measureFrame } = usePerformanceMonitor()
  const session = useSession()
  const frameLoopRef = useRef(null)

  const [showLibrary, setShowLibrary] = useState(false)
  const [aiProvider, setAiProvider] = useState(getInitialProvider)

  useEffect(() => {
    window.localStorage.setItem(AI_PROVIDER_STORAGE_KEY, aiProvider)
  }, [aiProvider])

  // Hydrate from a shared scenario URL (#s=...).
  const hydratedFromHashRef = useRef(false)
  useEffect(() => {
    if (hydratedFromHashRef.current) return
    const payload = readShareFromHash()
    if (payload && payload.d === 'chemistry') {
      const parsed = payloadToParsedData(payload)
      if (parsed?.type) {
        hydratedFromHashRef.current = true
        simulation.solve(parsed, aiProvider).catch(() => {})
      }
    }
  }, [simulation, aiProvider])

  // Cross-route demo runs from the command palette.
  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {}
      if (detail.parsedData) simulation.solve(detail.parsedData, aiProvider).catch(() => {})
      else if (detail.text) simulation.solve(detail.text, aiProvider).catch(() => {})
    }
    window.addEventListener('sts:run-example', handler)
    return () => window.removeEventListener('sts:run-example', handler)
  }, [simulation, aiProvider])

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
    session.logProblem(parsedData?.type || 'chemistry', parsedData)
    simulation.solve(parsedData, aiProvider)
  }, [aiProvider, session, simulation])

  const handleSelectSimulation = useCallback((simulationType) => {
    const demo = getChemistryDemos().find(d => d.type === simulationType)
    const parsedData = demo?.parsedData ?? {
      domain: 'chemistry',
      type: simulationType,
      variables: {},
      units: {},
      steps: [],
    }
    simulation.solve(parsedData, aiProvider)
    setShowLibrary(false)
  }, [aiProvider, simulation])

  const handleDemoMode = useCallback(() => {
    const demos = getChemistryDemos()
    const demo = demos[Math.floor(Math.random() * demos.length)]
    simulation.solve(demo.parsedData, aiProvider)
  }, [aiProvider, simulation])

  const handleQuickExample = useCallback((problemText) => {
    simulation.solve(problemText, aiProvider)
  }, [aiProvider, simulation])

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
        domain="chemistry"
      />

      <main className="flex-1 overflow-auto p-6" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="mx-auto max-w-[1200px] space-y-6">
          <PageHeader
            eyebrow="Simulator · Chemistry"
            title="See the"
            accent="Chemistry"
            subtitle="Organic molecules, stoichiometry, titration, atomic structure, bonding, gas laws, and combustion — all interactive."
            stats={[
              { value: '7', label: 'simulations' },
              { value: 'Balanced', label: 'equations' },
              { value: 'Live', label: 'telemetry' },
            ]}
            actions={
              <>
                <ShareButton
                  parsedData={simulation.parsedData}
                  currentVariables={simulation.currentVariables}
                  problemText={simulation.parsedData?.problemText}
                />
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
                'Balance CH4 + O2 -> CO2 + H2O and estimate product moles',
                '0.1M HCl titrated with 0.1M NaOH, find equivalence behavior',
                'Show sodium chloride ionic bonding and electron transfer',
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

      <ChemistryLibrary
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelectSimulation={handleSelectSimulation}
        category="chemistry"
      />

      <ConversationDrawer
        parsedData={simulation.parsedData}
        currentVariables={simulation.currentVariables}
        isLoading={simulation.isLoading}
        onAsk={(question, ctx) => {
          const base = ctx?.parsedData?.problemText || ''
          const merged = base ? `${base} — follow-up: ${question}` : question
          simulation.solve(merged, aiProvider).catch(() => {})
        }}
      />
    </div>
  )
}
