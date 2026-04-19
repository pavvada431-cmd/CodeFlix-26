import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import ErrorBoundary from './components/ErrorBoundary'

const App = lazy(() => import('./App'))
const FormulasPage = lazy(() => import('./pages/FormulasPage'))

function RouteFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
    >
      <div className="flex items-center gap-3 text-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
        Loading…
      </div>
    </div>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<App />} />
            <Route path="/formulas" element={<FormulasPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
