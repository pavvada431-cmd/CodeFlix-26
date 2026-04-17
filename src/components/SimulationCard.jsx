import { useState, useEffect, useCallback } from 'react'
import ErrorBoundary from './ErrorBoundary'
import SimulationRouter from './SimulationRouter'
import Button from './ui/Button'
import Panel from './ui/Panel'
import Badge from './ui/Badge'
import {
  SimulationLoader,
  SkeletonSimulation,
  SimulationTransition,
} from './LoadingStates'

function SimulationControls({ isPlaying, onPlayPause, onReset, speed, onSpeedChange }) {
  return (
    <div 
      className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex gap-2">
        <Button 
          variant="primary" 
          onClick={onPlayPause}
          className="min-w-[100px]"
        >
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </Button>
        <Button variant="secondary" onClick={onReset}>
          🔄 Reset
        </Button>
      </div>
      
      <div className="ml-auto flex items-center gap-3">
        <label 
          htmlFor="speed-control" 
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span>🐢</span> Speed
        </label>
        <select
          id="speed-control"
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          className="rounded-xl border px-3 py-2 text-sm outline-none transition-colors"
          style={{ 
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)'
          }}
        >
          <option value={0.1}>0.1x Super Slow</option>
          <option value={0.25}>0.25x 🐢</option>
          <option value={0.5}>0.5x Slow</option>
          <option value={1}>1x Normal 🚀</option>
          <option value={2}>2x Fast</option>
          <option value={5}>5x ⚡</option>
          <option value={10}>10x Warp</option>
        </select>
      </div>
    </div>
  )
}

function SimulationHelpTooltip({ type }) {
  const helpTexts = {
    projectile: '🎯 Watch the ball fly through the air! Try changing the launch angle and velocity to see how they affect the trajectory.',
    pendulum: '⏱️ The pendulum swings back and forth. Try different lengths and starting angles!',
    collisions: '💥 Watch the balls collide! Elastic bounces conserve energy, inelastic ones lose some.',
    spring_mass: '🔄 The mass bounces on the spring. Try different spring constants and masses!',
    inclined_plane: '📐 The block slides down the ramp. Try different angles and friction values!',
    circular_motion: '🔵 Watch circular motion! The centripetal force keeps the object moving in a circle.',
    orbital: '🪐 Planets orbit the sun! Try different distances and velocities.',
    wave_motion: '🌊 Waves move through the medium. Try different frequencies and wavelengths!',
    rotational_mechanics: '⚙️ The disk rotates under force. Watch angular acceleration!',
    electric_field: '⚡ Electric charges interact! Watch the forces between them.',
    optics_lens: '🔍 Light passes through the lens. Watch how it focuses!',
    optics_mirror: '🪞 Light reflects from the mirror. See the law of reflection!',
    radioactive_decay: '☢️ Atoms decay over time. Watch the half-life in action!',
    electromagnetic: '🧲 Charged particles move through magnetic fields!',
    buoyancy: '🫧 Objects float or sink based on density. Archimedes\' principle!',
    ideal_gas: '🌡️ Gas particles move and collide. Watch pressure and temperature!',
    organic_chemistry: '🧪 Explore molecule structures! Click different molecules to learn.',
    stoichiometry: '⚖️ Balance chemical equations and calculate reaction quantities!',
    titration: '🧫 Acid meets base! Watch the equivalence point.',
    combustion: '🔥 Fuel burns with oxygen. See the energy release!',
    atomic_structure: '⚛️ Explore shells, valence electrons, and configurations.',
    gas_laws: '🫙 Adjust P, V, T, and n to observe gas law relationships.',
    chemical_bonding: '🔗 Compare ionic, covalent, and metallic bonding.',
  }

  const helpText = helpTexts[type] || 'Interact with the simulation using the controls below! 🌟'

  return (
    <div className="absolute top-4 right-4 z-20 group">
      <button 
        className="rounded-full p-2.5 shadow-lg transition-all hover:scale-110"
        style={{ 
          backgroundColor: 'var(--color-accent-dim)',
          color: 'var(--color-accent)'
        }}
      >
        ❓
      </button>
      <div 
        className="invisible absolute right-0 top-12 w-72 rounded-xl border p-4 text-sm opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100"
        style={{ 
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)'
        }}
      >
        <p className="mb-2 font-bold" style={{ color: 'var(--color-accent)' }}>
          💡 How to Explore
        </p>
        <p style={{ color: 'var(--color-text-muted)' }}>{helpText}</p>
      </div>
    </div>
  )
}

function ZoomControls({ onZoomIn, onZoomOut, onResetZoom }) {
  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1 rounded-lg border p-1 shadow-lg" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <button
        onClick={onZoomIn}
        className="rounded-md px-3 py-2 text-lg font-bold transition-colors hover:scale-110"
        style={{ color: 'var(--color-text)' }}
        title="Zoom In"
      >
        +
      </button>
      <button
        onClick={onResetZoom}
        className="rounded-md px-3 py-1 text-sm transition-colors hover:scale-110"
        style={{ color: 'var(--color-text-muted)' }}
        title="Reset View"
      >
        ⟳
      </button>
      <button
        onClick={onZoomOut}
        className="rounded-md px-3 py-2 text-lg font-bold transition-colors hover:scale-110"
        style={{ color: 'var(--color-text)' }}
        title="Zoom Out"
      >
        −
      </button>
    </div>
  )
}

function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <button
      onClick={toggleFullscreen}
      className="absolute bottom-4 left-4 z-20 rounded-lg border p-2 shadow-lg transition-colors hover:scale-110"
      style={{ 
        backgroundColor: 'var(--color-surface)', 
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-muted)'
      }}
      title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
    >
      {isFullscreen ? '⛶' : '⛶'}
    </button>
  )
}

export default function SimulationCard({ simulation, particleMultiplier }) {
  const [zoom, setZoom] = useState(1)

  const handleZoomIn = useCallback(() => setZoom(prev => Math.min(prev + 0.2, 2.5)), [])
  const handleZoomOut = useCallback(() => setZoom(prev => Math.max(prev - 0.2, 0.4)), [])
  const handleResetZoom = useCallback(() => setZoom(1), [])

  const getSimulationTitle = (type) => {
    const titles = {
      projectile: '🎯 Projectile Motion',
      pendulum: '⏱️ Simple Pendulum',
      collisions: '💥 Collision Simulation',
      spring_mass: '🔄 Spring Oscillator',
      inclined_plane: '📐 Inclined Plane',
      circular_motion: '🔵 Circular Motion',
      orbital: '🪐 Orbital Mechanics',
      wave_motion: '🌊 Wave Motion',
      rotational_mechanics: '⚙️ Rotational Motion',
      electric_field: '⚡ Electric Field',
      optics_lens: '🔍 Optics - Lens',
      optics_mirror: '🪞 Optics - Mirror',
      radioactive_decay: '☢️ Radioactive Decay',
      electromagnetic: '🧲 Electromagnetic Force',
      buoyancy: '🫧 Buoyancy & Fluids',
      ideal_gas: '🌡️ Ideal Gas Law',
      organic_chemistry: '🧪 Organic Chemistry',
      stoichiometry: '⚖️ Stoichiometry',
      titration: '🧫 Titration',
      combustion: '🔥 Combustion',
      atomic_structure: '⚛️ Atomic Structure',
      gas_laws: '🫙 Gas Laws',
      chemical_bonding: '🔗 Chemical Bonding',
    }
    return titles[type] || '🧪 Simulation'
  }

  return (
    <Panel
      title={getSimulationTitle(simulation.activeSimulation)}
      subtitle={simulation.activeSimulation ? 'Adjust variables in the right panel' : 'Enter a problem to start simulating!'}
      action={
        simulation.error
          ? <Badge variant="error">❌ Error</Badge>
          : simulation.isLoading
            ? <Badge variant="neutral">🧠 Parsing</Badge>
            : simulation.activeSimulation
              ? <Badge variant="success">✅ Running</Badge>
              : <Badge variant="neutral">⏳ Waiting</Badge>
      }
    >
      <div 
        className="relative w-full overflow-hidden rounded-xl border"
        style={{ 
          height: '650px', 
          minHeight: '450px', 
          maxHeight: '900px',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)'
        }}
      >
        <div
          className="absolute inset-0 transition-transform duration-300"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          <SimulationTransition
            transitionKey={`${simulation.activeSimulation || 'idle'}-${simulation.simulationKey || '0'}`}
            className="h-full w-full"
          >
            {simulation.activeSimulation ? (
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
                  accentColor="var(--color-accent)"
                />
              </ErrorBoundary>
            ) : (
              <div className="relative h-full">
                <SkeletonSimulation className="h-full w-full" />
                <div className="absolute inset-0 flex h-full flex-col items-center justify-center p-8 text-center">
                  <div
                    className="mb-6 flex h-20 w-20 items-center justify-center rounded-full text-4xl"
                    style={{ backgroundColor: 'var(--color-accent-dim)' }}
                  >
                    🔬
                  </div>
                  <h3 className="mb-2 text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                    Ready to Simulate!
                  </h3>
                  <p className="max-w-md" style={{ color: 'var(--color-text-muted)' }}>
                    Enter a physics or chemistry problem in the sidebar, or click an example to get started.
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div
                      className="rounded-lg border p-3 text-left"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <p className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>⚡ Physics</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>Mechanics, waves, electricity</p>
                    </div>
                    <div
                      className="rounded-lg border p-3 text-left"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <p className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>🧪 Chemistry</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>Molecules, reactions</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SimulationTransition>
        </div>

        <SimulationLoader isLoading={simulation.isLoading} />

        {simulation.activeSimulation && (
          <>
            <SimulationHelpTooltip type={simulation.activeSimulation} />
            <ZoomControls 
              onZoomIn={handleZoomIn} 
              onZoomOut={handleZoomOut} 
              onResetZoom={handleResetZoom} 
            />
            <FullscreenButton />
            
            {zoom !== 1 && (
              <div 
                className="absolute bottom-4 right-20 rounded-lg px-2 py-1 font-mono text-xs"
                style={{ 
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)'
                }}
              >
                {Math.round(zoom * 100)}%
              </div>
            )}
          </>
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
