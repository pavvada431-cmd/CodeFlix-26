import { useState, useEffect, useCallback, useRef } from 'react'
import Navbar from './components/Navbar'
import PhysicsPage from './pages/PhysicsPage'
import ChemistryPage from './pages/ChemistryPage'
import SettingsModal from './components/SettingsModal'
import SessionSummary from './components/SessionSummary'
import useSession from './hooks/useSession'
import { useTheme } from './contexts/ThemeContext'

function App() {
  const session = useSession()
  const { sidebarWidth, updateSidebarWidth, rightPanelWidth, updateRightPanelWidth } = useTheme()
  
  const [currentPage, setCurrentPage] = useState('physics')
  const [showSettings, setShowSettings] = useState(false)
  const [showSession, setShowSession] = useState(false)
  const [apiConnected, setApiConnected] = useState(true)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <Navbar
        onOpenSettings={() => setShowSettings(true)}
        apiConnected={apiConnected}
        onPageChange={handlePageChange}
        currentPage={currentPage}
      />

      <div className="pt-16">
        {currentPage === 'physics' ? (
          <PhysicsPage
            sidebarWidth={sidebarWidth}
            onSidebarWidthChange={updateSidebarWidth}
            rightPanelWidth={rightPanelWidth}
            onRightPanelWidthChange={updateRightPanelWidth}
          />
        ) : (
          <ChemistryPage
            sidebarWidth={sidebarWidth}
            onSidebarWidthChange={updateSidebarWidth}
            rightPanelWidth={rightPanelWidth}
            onRightPanelWidthChange={updateRightPanelWidth}
          />
        )}
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <SessionSummary
        isOpen={showSession}
        onClose={() => setShowSession(false)}
        summary={session.getSummary()}
      />
    </div>
  )
}

export default App
