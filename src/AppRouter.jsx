import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import App from './App'
import FormulasPage from './pages/FormulasPage'
import ErrorBoundary from './components/ErrorBoundary'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<App />} />
          <Route path="/formulas" element={<FormulasPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
