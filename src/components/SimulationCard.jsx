import { useState } from 'react'
import ErrorBoundary from './ErrorBoundary'
import SimulationRouter from './SimulationRouter'
import Button from './ui/Button'
import Panel from './ui/Panel'
import Badge from './ui/Badge'

function SimulationControls({ isPlaying, onPlayPause, onReset, speed, onSpeedChange }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#1f2937] pt-4">
      <Button variant="primary" onClick={onPlayPause}>
        {isPlaying ? '⏸️ Pause' : '▶️ Play'}
      </Button>
      <Button variant="secondary" onClick={onReset}>
        🔄 Reset
      </Button>
      <div className="ml-auto flex items-center gap-2">
        <label htmlFor="speed-control" className="text-xs text-[#9ca3af] flex items-center gap-1">
          <span>🐢</span> Speed
        </label>
        <select
          id="speed-control"
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          className="rounded-xl border border-[#1f2937] bg-[#0b0f17] px-2 py-1.5 text-sm text-[#e5e7eb] outline-none focus:border-[#22d3ee]"
        >
          <option value={0.25}>0.25x 🐢</option>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x 🚀</option>
          <option value={2}>2x</option>
          <option value={3}>3x ⚡</option>
        </select>
      </div>
    </div>
  )
}

function SimulationHelpTooltip({ type }) {
  const helpTexts = {
    projectile: 'Watch the ball fly! Try changing the launch angle and velocity to see how it affects the path.',
    pendulum: 'The pendulum swings back and forth. Try different lengths and angles!',
    collisions: 'Watch the balls bounce! Elastic bounces keep energy, inelastic ones lose some.',
    spring_mass: 'The mass bounces on the spring. Try different spring constants!',
    inclined_plane: 'The block slides down the ramp. Try different angles and friction!',
    circular_motion: 'Watch circular motion! The centripetal force keeps the object moving in a circle.',
    orbital: 'Planets orbit the sun! Try different distances and velocities.',
    wave_motion: 'Waves move through the medium. Try different frequencies and wavelengths!',
    organic_chemistry: 'Explore molecule structures! Click different molecules to learn about them.',
  }

  const helpText = helpTexts[type] || 'Interact with the simulation using the controls below!'

  return (
    <div className="absolute top-4 right-4 group">
      <button className="rounded-full bg-[rgba(0,245,255,0.2)] p-2 text-[#00f5ff] transition hover:bg-[rgba(0,245,255,0.3)]">
        ❓
      </button>
      <div className="invisible absolute right-0 top-10 z-50 w-64 rounded-xl border border-[rgba(0,245,255,0.3)] bg-[rgba(0,0,0,0.95)] p-3 text-sm text-white opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
        <p className="font-semibold text-[#00f5ff]">💡 How to use</p>
        <p className="mt-2 text-slate-300">{helpText}</p>
      </div>
    </div>
  )
}

function ZoomControls({ onZoomIn, onZoomOut, onResetZoom }) {
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1">
      <button
        onClick={onZoomIn}
        className="rounded-lg bg-[rgba(0,0,0,0.7)] px-2 py-1 text-lg text-white transition hover:bg-[rgba(0,245,255,0.3)]"
        title="Zoom In"
      >
        +
      </button>
      <button
        onClick={onZoomOut}
        className="rounded-lg bg-[rgba(0,0,0,0.7)] px-2 py-1 text-lg text-white transition hover:bg-[rgba(0,245,255,0.3)]"
        title="Zoom Out"
      >
        −
      </button>
      <button
        onClick={onResetZoom}
        className="rounded-lg bg-[rgba(0,0,0,0.7)] px-2 py-1 text-xs text-white transition hover:bg-[rgba(0,245,255,0.3)]"
        title="Reset View"
      >
        ↺
      </button>
    </div>
  )
}

export default function SimulationCard({ simulation, particleMultiplier }) {
  const [zoom, setZoom] = useState(1)

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5))
  const handleResetZoom = () => setZoom(1)

  return (
    <Panel
      title="🧪 Interactive Simulation"
      subtitle={simulation.activeSimulation || 'No simulation selected'}
      action={simulation.error ? <Badge variant="error">❌ Error</Badge> : <Badge variant="success">✅ Ready</Badge>}
    >
      <div 
        className="relative w-full overflow-hidden rounded-xl border border-[#1f2937] bg-[#0b0f17]" 
        style={{ height: '700px', minHeight: '500px', maxHeight: '1000px' }}
      >
        <div 
          className="absolute inset-0 transition-transform duration-300" 
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
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
        
        <SimulationHelpTooltip type={simulation.activeSimulation} />
        <ZoomControls 
          onZoomIn={handleZoomIn} 
          onZoomOut={handleZoomOut} 
          onResetZoom={handleResetZoom} 
        />
        
        {zoom !== 1 && (
          <div className="absolute bottom-16 right-4 rounded-lg bg-[rgba(0,0,0,0.7)] px-2 py-1 font-mono text-xs text-white">
            {Math.round(zoom * 100)}%
          </div>
        )}
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
