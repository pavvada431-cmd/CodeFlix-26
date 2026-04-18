import { Component } from 'react'

export class SimulationErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Simulation crashed:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-red-500/30 bg-red-950/20 p-8 text-center">
          <h3 className="mb-2 font-heading text-xl font-semibold" style={{ color: '#ef4444' }}>
            Simulation Crashed
          </h3>
          <p className="mb-6 max-w-md text-sm" style={{ color: 'var(--color-text-muted)' }}>
            The 3D simulation encountered an error. This might be due to WebGL issues or incompatible parameters.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:scale-105"
            style={{
              borderColor: '#ef4444',
              color: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
            }}
          >
            Reload Page
          </button>
          <p className="mt-4 text-xs" style={{ color: 'var(--color-text-dim)' }}>
            Try using a different problem or refreshing your browser.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
