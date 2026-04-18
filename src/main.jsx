import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './AppRouter.jsx'
import { ThemeProvider } from './contexts/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'

// Global error handler to suppress internal React Three Fiber errors
const originalError = console.error
console.error = function (...args) {
  const message = args[0]?.toString?.() || String(args[0])
  if (
    message.includes('__r3f') ||
    message.includes('is undefined') ||
    message.includes('cannot read property') ||
    message.includes('can\'t access property') ||
    message.includes('getShaderPrecisionFormat') ||
    message.includes('getContextAttributes') ||
    message.includes('alpha')
  ) {
    return
  }
  originalError.apply(console, args)
}

window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || String(event.reason)
  if (
    message.includes('__r3f') ||
    message.includes('is undefined') ||
    message.includes('cannot read property') ||
    message.includes('can\'t access property') ||
    message.includes('getShaderPrecisionFormat') ||
    message.includes('getContextAttributes') ||
    message.includes('alpha')
  ) {
    event.preventDefault()
    return
  }
})

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
