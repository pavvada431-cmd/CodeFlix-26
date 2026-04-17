import { useState } from 'react'
import { useMediaQuery } from 'react-responsive'
import Navbar from './components/Navbar'
import MobileLayout from './components/MobileLayout'
import PhysicsPage from './pages/PhysicsPage'
import ChemistryPage from './pages/ChemistryPage'
import SettingsModal from './components/SettingsModal'
import SessionSummary from './components/SessionSummary'
import useSession from './hooks/useSession'
import { useTheme } from './contexts/ThemeContext'

function DesktopLayout({
  currentPage,
  onPageChange,
  apiConnected,
  onOpenSettings,
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
      />

      <div className="pt-16">
        {currentPage === 'physics' ? (
          <PhysicsPage
            sidebarWidth={sidebarWidth}
            onSidebarWidthChange={onSidebarWidthChange}
            rightPanelWidth={rightPanelWidth}
            onRightPanelWidthChange={onRightPanelWidthChange}
          />
        ) : (
          <ChemistryPage
            sidebarWidth={sidebarWidth}
            onSidebarWidthChange={onSidebarWidthChange}
            rightPanelWidth={rightPanelWidth}
            onRightPanelWidthChange={onRightPanelWidthChange}
          />
        )}
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <AppContent
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        apiConnected={apiConnected}
        onApiStatusChange={setApiConnected}
        onOpenSettings={() => setShowSettings(true)}
        sidebarWidth={sidebarWidth}
        onSidebarWidthChange={updateSidebarWidth}
        rightPanelWidth={rightPanelWidth}
        onRightPanelWidthChange={updateRightPanelWidth}
      />

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <SessionSummary
        isOpen={showSession}
        onClose={() => setShowSession(false)}
        summary={session.getSummary()}
      />
    </div>
  )
}
