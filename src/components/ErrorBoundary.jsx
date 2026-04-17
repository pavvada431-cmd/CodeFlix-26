import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCode: null,
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorCode: error?.code || 'UNKNOWN_ERROR',
    }
  }

  componentDidCatch(error, errorInfo) {
    const isDev = import.meta.env.DEV
    
    // Suppress internal React Three Fiber errors that will recover on next frame
    const isInternalR3FError = 
      error?.message?.includes('__r3f') ||
      error?.message?.includes('is undefined') ||
      error?.message?.includes('cannot read property') ||
      error?.stack?.includes('__r3f') ||
      error?.message?.includes('getShaderPrecisionFormat') ||
      error?.message?.includes('precision') ||
      error?.message?.includes('WebGL')
    
    if (isInternalR3FError) {
      // Reset the error state to allow recovery
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorCode: null,
      })
      return
    }
    
    if (isDev) {
      console.error('ErrorBoundary caught:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
      })
    }

    this.setState({
      errorInfo,
    })

    // Report to monitoring service in production
    if (!isDev && window.__errorReporter) {
      window.__errorReporter({
        type: 'error_boundary',
        message: error?.message,
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCode: null,
    })
    if (typeof this.props.onReset === 'function') {
      this.props.onReset()
    }
  }

  handleTryDifferent = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCode: null,
    })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV
      
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0f17] p-4">
          <div className="flex min-h-[400px] w-full max-w-md flex-col items-center justify-center rounded-[24px] border border-[rgba(248,113,113,0.3)] bg-[#07111f]/90 p-8 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)]">
              <svg
                className="h-8 w-8 text-[#ff6b6b]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="mb-3 text-2xl font-semibold text-white">
              Something went wrong
            </h2>

            <p className="mb-4 max-w-md text-sm text-slate-400">
              We encountered an error while rendering this simulation. Please try a different problem or refresh the page.
            </p>

            {isDev && this.state.error && (
              <div className="mb-4 max-h-32 w-full overflow-auto rounded bg-slate-900/50 p-3 text-left">
                <p className="text-xs font-mono text-red-400 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={this.handleReset}
                className="rounded-xl border border-[rgba(0,245,255,0.35)] bg-[rgba(0,245,255,0.15)] px-5 py-2.5 text-sm font-semibold text-[#00f5ff] transition hover:bg-[rgba(0,245,255,0.25)] active:scale-95"
              >
                Reset Simulation
              </button>
              <button
                onClick={this.handleTryDifferent}
                className="rounded-xl border border-white/15 bg-white/8 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/15 active:scale-95"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
