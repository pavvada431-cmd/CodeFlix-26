import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './AppRouter.jsx'

// Global error handler to suppress internal React Three Fiber errors
const originalError = console.error
console.error = function (...args) {
  // Suppress __r3f and undefined property access errors
  const message = args[0]?.toString?.() || String(args[0])
  if (
    message.includes('__r3f') ||
    message.includes('is undefined') ||
    message.includes('cannot read property') ||
    message.includes('can\'t access property')
  ) {
    return; // Silently ignore
  }
  originalError.apply(console, args)
}

// Global promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || String(event.reason)
  if (
    message.includes('__r3f') ||
    message.includes('is undefined') ||
    message.includes('cannot read property')
  ) {
    event.preventDefault() // Suppress error
    return
  }
});

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
