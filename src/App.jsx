import { useState, useEffect } from 'react'
import { useMediaQuery } from 'react-responsive'
import Navbar from './components/Navbar'
import MobileLayout from './components/MobileLayout'
import PhysicsPage from './pages/PhysicsPage'
import ChemistryPage from './pages/ChemistryPage'
import BuilderPage from './pages/BuilderPage'
import SettingsModal from './components/SettingsModal'
import SessionSummary from './components/SessionSummary'
import Onboarding, { ONBOARDING_STORAGE_KEY } from './components/Onboarding'
import GuidedTour from './components/GuidedTour'
import useSession from './hooks/useSession'
import { useTheme } from './contexts/useTheme'

function DesktopLayout({
  currentPage,
  onPageChange,
  apiConnected,
  onOpenSettings,
  onOpenTour,
  sidebarWidth,
  onSidebarWidthChange,
  rightPanelWidth,
  onRightPanelWidthChange,
}) {
  return (
    <>
      <Navbar
        onOpenSettings={onOpenSettings}
        apiConnected={apiConnected}
        onPageChange={onPageChange}
        currentPage={currentPage}
        onOpenTour={onOpenTour}
      />

      <div className="pt-16">
        {currentPage === 'physics' ? (
          <PhysicsPage
            sidebarWidth={sidebarWidth}
            onSidebarWidthChange={onSidebarWidthChange}
            rightPanelWidth={rightPanelWidth}
            onRightPanelWidthChange={onRightPanelWidthChange}
          />
        ) : currentPage === 'chemistry' ? (
          <ChemistryPage
            sidebarWidth={sidebarWidth}
            onSidebarWidthChange={onSidebarWidthChange}
            rightPanelWidth={rightPanelWidth}
            onRightPanelWidthChange={onRightPanelWidthChange}
          />
        ) : currentPage === 'builder' ? (
          <BuilderPage />
        ) : null}
      </div>
    </>
  )
}

function AppContent({
  currentPage,
  onPageChange,
  apiConnected,
  onApiStatusChange,
  onOpenSettings,
  onOpenTour,
  sidebarWidth,
  onSidebarWidthChange,
  rightPanelWidth,
  onRightPanelWidthChange,
}) {
  const isMobile = useMediaQuery({ maxWidth: 767 })

  if (isMobile) {
    return (
      <MobileLayout
        onOpenSettings={onOpenSettings}
        onOpenTour={onOpenTour}
        apiConnected={apiConnected}
        onApiStatusChange={onApiStatusChange}
      />
    )
  }

  return (
    <DesktopLayout
      currentPage={currentPage}
      onPageChange={onPageChange}
      apiConnected={apiConnected}
      onOpenSettings={onOpenSettings}
      onOpenTour={onOpenTour}
      sidebarWidth={sidebarWidth}
      onSidebarWidthChange={onSidebarWidthChange}
      rightPanelWidth={rightPanelWidth}
      onRightPanelWidthChange={onRightPanelWidthChange}
    />
  )
}

export default function App() {
  const session = useSession()
  const { sidebarWidth, updateSidebarWidth, rightPanelWidth, updateRightPanelWidth } = useTheme()

  const [currentPage, setCurrentPage] = useState('physics')
  const [showSettings, setShowSettings] = useState(false)
  const [showSession, setShowSession] = useState(false)
  const [apiConnected, setApiConnected] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== 'true'
  )
  const [showGuidedTour, setShowGuidedTour] = useState(false)

  const runExampleFromOnboarding = (text) => {
    setCurrentPage('physics')
    window.dispatchEvent(new CustomEvent('codeflix:run-example', {
      detail: { text, domain: 'physics' },
    }))
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts when typing in inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          document.activeElement.blur()
        }
        return
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          // Space: toggle play/pause
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('codeflix:toggle-play'))
          break
        case 'r':
          // R: reset simulation
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('codeflix:reset-simulation'))
          break
        case 'd':
          // D: load random demo
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('codeflix:random-demo'))
          break
        case 'escape':
          // Escape: blur focus and close modals
          e.preventDefault()
          setShowSettings(false)
          setShowSession(false)
          setShowGuidedTour(false)
          document.activeElement?.blur()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <AppContent
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        apiConnected={apiConnected}
        onApiStatusChange={setApiConnected}
        onOpenSettings={() => setShowSettings(true)}
        onOpenTour={() => setShowGuidedTour(true)}
        sidebarWidth={sidebarWidth}
        onSidebarWidthChange={updateSidebarWidth}
        rightPanelWidth={rightPanelWidth}
        onRightPanelWidthChange={updateRightPanelWidth}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onShowOnboarding={() => {
          setShowSettings(false)
          setShowOnboarding(true)
        }}
      />

      <SessionSummary
        isOpen={showSession}
        onClose={() => setShowSession(false)}
        summary={session.getSummary()}
      />

      <Onboarding
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => setShowOnboarding(false)}
        onRunExample={runExampleFromOnboarding}
        onPickSubject={(subject) => setCurrentPage(subject)}
      />

      <GuidedTour
        isOpen={showGuidedTour}
        onClose={() => setShowGuidedTour(false)}
      />
    </div>
  )
}
