import { useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { MessageSquare, Play, BookOpen, LineChart as LineChartIcon } from 'lucide-react'
import Navbar from './Navbar'
import ProblemInput from './ProblemInput'
import SimulationCard from './SimulationCard'
import SolutionPanel from './SolutionPanel'
import GraphPanel from './GraphPanel'
import useSimulation from '../hooks/useSimulation'

const TABS = [
  { key: 'input', label: 'Input', icon: MessageSquare },
  { key: 'simulate', label: 'Simulate', icon: Play },
  { key: 'solution', label: 'Solution', icon: BookOpen },
  { key: 'graph', label: 'Graph', icon: LineChartIcon },
]

const AI_PROVIDER_STORAGE_KEY = 'simusolve.aiProvider-mobile'
const AI_PROVIDERS = ['openai', 'anthropic', 'gemini', 'groq', 'ollama']

function getInitialProvider() {
  if (typeof window === 'undefined') return 'openai'
  const storedValue = window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY)
  return AI_PROVIDERS.includes(storedValue) ? storedValue : 'openai'
}

export default function MobileLayout({
  onOpenSettings,
  apiConnected = true,
  onApiStatusChange,
}) {
  const simulation = useSimulation()
  const [activeTab, setActiveTab] = useState('input')
  const [previousTabIndex, setPreviousTabIndex] = useState(0)
  const [provider, setProvider] = useState(getInitialProvider)
  const tabIndex = TABS.findIndex((tab) => tab.key === activeTab)
  const direction = tabIndex >= previousTabIndex ? 1 : -1

  const handleTabChange = (nextTab) => {
    setPreviousTabIndex(tabIndex)
    setActiveTab(nextTab)
  }

  const handleProblemSolved = async (parsedData) => {
    await simulation.solve(parsedData, provider)
    handleTabChange('simulate')
  }

  let tabBody = null
  switch (activeTab) {
    case 'input':
      tabBody = (
        <div className="h-full overflow-y-auto px-3 pb-[calc(var(--mobile-bottom-nav-height)+8.5rem)] pt-3">
          <ProblemInput
            mobile
            onSolved={handleProblemSolved}
            isLoading={simulation.isLoading}
            provider={provider}
            onProviderChange={setProvider}
            onApiStatusChange={onApiStatusChange}
          />
        </div>
      )
      break
    case 'simulate':
      tabBody = (
        <div className="h-full bg-[var(--color-bg)]">
          <SimulationCard simulation={simulation} particleMultiplier={0.9} mobile />
        </div>
      )
      break
    case 'solution':
      tabBody = (
        <div className="h-full overflow-y-auto px-3 pb-[calc(var(--mobile-bottom-nav-height)+1rem)] pt-3">
          <SolutionPanel
            parsedData={simulation.parsedData}
            currentVariables={simulation.currentVariables}
            dataStream={simulation.dataStream}
            isPlaying={simulation.isPlaying}
            simulationType={simulation.activeSimulation}
            onUpdateVariable={simulation.updateVariable}
          />
        </div>
      )
      break
    case 'graph':
      tabBody = (
        <div className="h-full overflow-y-auto px-3 pb-[calc(var(--mobile-bottom-nav-height)+1rem)] pt-3">
          <GraphPanel
            mobile
            simulationType={simulation.activeSimulation}
            dataStream={simulation.dataStream}
            accentColor="var(--color-accent)"
          />
        </div>
      )
      break
    default:
      tabBody = null
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <Navbar isMobile onOpenSettings={onOpenSettings} apiConnected={apiConnected} />

      <main className="pt-16">
        <div className="relative h-[calc(100vh-64px-var(--mobile-bottom-nav-height)-env(safe-area-inset-bottom))] overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <Motion.section
              key={activeTab}
              initial={{ x: direction > 0 ? 30 : -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction > 0 ? -30 : 30, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              {tabBody}
            </Motion.section>
          </AnimatePresence>
        </div>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-[var(--color-surface)]/95 backdrop-blur-md"
        style={{ borderColor: 'var(--color-border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex h-[var(--mobile-bottom-nav-height)] max-w-xl items-center justify-around px-2">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = tab.key === activeTab
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`flex min-w-[72px] flex-col items-center justify-center rounded-xl px-2 py-1 text-[11px] ${
                  active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
                }`}
                aria-label={tab.label}
              >
                <Icon className="mb-1 h-5 w-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
