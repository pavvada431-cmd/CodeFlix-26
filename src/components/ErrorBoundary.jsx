import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
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
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[24px] border border-[rgba(248,113,113,0.3)] bg-[#07111f]/90 p-8 text-center">
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

          <h2 className="mb-3 font-heading text-2xl font-semibold text-white">
            Something went wrong
          </h2>

          <p className="mb-2 max-w-md text-sm text-slate-400">
            We encountered an error while rendering this simulation. Try a different problem.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={this.handleReset}
              className="rounded-xl border border-[rgba(0,245,255,0.35)] bg-[rgba(0,245,255,0.15)] px-5 py-2.5 font-heading text-sm font-semibold text-[#00f5ff] transition hover:bg-[rgba(0,245,255,0.25)]"
            >
              Reset Simulation
            </button>
            <button
              onClick={this.handleTryDifferent}
              className="rounded-xl border border-white/15 bg-white/8 px-5 py-2.5 font-heading text-sm font-semibold text-slate-200 transition hover:bg-white/15"
            >
              Try a Different Problem
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
