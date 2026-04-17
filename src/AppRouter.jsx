import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import SimulatorApp from './pages/SimulatorApp'
import ErrorBoundary from './components/ErrorBoundary'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<SimulatorApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
