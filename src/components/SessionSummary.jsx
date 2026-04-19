import { useMemo } from 'react'
import { SIMULATION_DISPLAY_NAMES, SIMULATION_COLORS } from '../hooks/useSimulation'

export default function SessionSummary({ summary, isOpen, onClose }) {
  const sortedSimulations = useMemo(() => {
    if (!summary?.simulationCounts) return []
    return Object.entries(summary.simulationCounts)
      .sort(([, a], [, b]) => b - a)
  }, [summary])

  if (!isOpen || !summary) return null

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[var(--color-bg)] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-heading text-2xl font-semibold text-white">
            Session Summary
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/20 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-[rgba(0,245,255,0.3)] bg-[rgba(0,245,255,0.1)] p-4 text-center">
            <div className="font-heading text-3xl font-bold text-[#00f5ff]">
              {summary.totalSimulations}
            </div>
            <div className="mt-1 font-mono-display text-xs text-slate-400 uppercase tracking-wider">
              Simulations
            </div>
          </div>
          <div className="rounded-xl border border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.1)] p-4 text-center">
            <div className="font-heading text-3xl font-bold text-[#00ff88]">
              {summary.totalProblems}
            </div>
            <div className="mt-1 font-mono-display text-xs text-slate-400 uppercase tracking-wider">
              Problems
            </div>
          </div>
          <div className="rounded-xl border border-[rgba(255,136,0,0.3)] bg-[rgba(255,136,0,0.1)] p-4 text-center">
            <div className="font-heading text-3xl font-bold text-[#ff8800]">
              {summary.uniqueTypes}
            </div>
            <div className="mt-1 font-mono-display text-xs text-slate-400 uppercase tracking-wider">
              Types
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="font-mono-display text-xs text-slate-400">
            Duration: <span className="text-white">{summary.duration}</span>
          </div>
          <div className="font-mono-display text-xs text-slate-400">
            Started: <span className="text-white">
              {new Date(summary.startTime).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 font-mono-display text-xs uppercase tracking-wider text-slate-400">
            Simulation Breakdown
          </h3>
          <div className="space-y-2">
            {sortedSimulations.map(([name, count]) => {
              const colorKey = Object.keys(SIMULATION_DISPLAY_NAMES).find(
                k => SIMULATION_DISPLAY_NAMES[k] === name
              )
              const color = colorKey ? SIMULATION_COLORS[colorKey] : '#00f5ff'
              const percentage = Math.round((count / summary.totalSimulations) * 100)

              return (
                <div key={name} className="flex items-center gap-3">
                  <div className="w-24 font-mono-display text-xs text-white truncate">
                    {name}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-white/10">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right font-mono-display text-xs text-slate-400">
                    {count}x
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 font-mono-display text-sm text-white transition hover:bg-white/10"
          >
            Continue Session
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('simusolve_session')
              onClose()
              window.location.reload()
            }}
            className="flex-1 rounded-xl border border-[rgba(255,68,68,0.5)] bg-[rgba(255,68,68,0.1)] px-4 py-3 font-mono-display text-sm text-[#ff4444] transition hover:bg-[rgba(255,68,68,0.2)]"
          >
            Clear & Restart
          </button>
        </div>
      </div>
    </>
  )
}
