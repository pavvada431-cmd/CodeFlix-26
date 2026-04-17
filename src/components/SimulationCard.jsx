import ErrorBoundary from './ErrorBoundary'
import SimulationRouter from './SimulationRouter'
import Button from './ui/Button'
import Panel from './ui/Panel'
import Badge from './ui/Badge'

function SimulationControls({ isPlaying, onPlayPause, onReset, speed, onSpeedChange }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#1f2937] pt-4">
      <Button variant="primary" onClick={onPlayPause}>
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
      <Button variant="secondary" onClick={onReset}>
        Reset
      </Button>
      <div className="ml-auto flex items-center gap-2">
        <label htmlFor="speed-control" className="text-xs text-[#9ca3af]">
          Speed
        </label>
        <select
          id="speed-control"
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          className="rounded-xl border border-[#1f2937] bg-[#0b0f17] px-2 py-1.5 text-sm text-[#e5e7eb] outline-none focus:border-[#22d3ee]"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
          <option value={3}>3x</option>
        </select>
      </div>
    </div>
  )
}

export default function SimulationCard({ simulation, particleMultiplier }) {
  return (
    <Panel
      title="Simulation"
      subtitle={simulation.activeSimulation || 'No simulation selected'}
      action={simulation.error ? <Badge variant="error">Error</Badge> : <Badge variant="neutral">Ready</Badge>}
    >
      <div className="h-auto min-h-[600px] max-h-[1200px] overflow-y-auto rounded-xl border border-[#1f2937] bg-[#0b0f17]">
        <ErrorBoundary onReset={simulation.reset}>
          <SimulationRouter
            parsedData={simulation.parsedData}
            simulationType={simulation.activeSimulation}
            variables={simulation.currentVariables}
            isPlaying={simulation.isPlaying}
            simulationKey={simulation.simulationKey}
            onDataPoint={simulation.onDataPoint}
            isLoading={simulation.isLoading}
            particleMultiplier={particleMultiplier}
            accentColor="#22d3ee"
          />
        </ErrorBoundary>
      </div>
      <SimulationControls
        isPlaying={simulation.isPlaying}
        onPlayPause={() => (simulation.isPlaying ? simulation.pause() : simulation.play())}
        onReset={simulation.reset}
        speed={simulation.playbackSpeed}
        onSpeedChange={simulation.setSpeed}
      />
    </Panel>
  )
}
