import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import ErrorBoundary from './components/ErrorBoundary'
import CommandPalette from './components/CommandPalette'

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

/* Global ⌘K + ? shortcut wrapper. Available on every route. */
function GlobalShortcuts() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === '/' &&
                 document.activeElement?.tagName !== 'INPUT' &&
                 document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return <CommandPalette open={open} onClose={() => setOpen(false)} />
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
      <GlobalShortcuts />
    </BrowserRouter>
  )
}
