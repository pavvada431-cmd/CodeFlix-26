import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X, Eye, Copy, Download } from 'lucide-react'
import useSimulation from '../hooks/useSimulation'
import {
  getSupportedSimulationTypes,
  getSimulationName,
  getDefaultVariables,
  VARIABLE_RANGES,
  buildParsedDataFromBlocks,
  encodeBuilderConfig,
  decodeBuilderConfig,
  saveToGallery,
  loadGallery,
  deleteFromGallery,
} from '../utils/builderUtils'
import { VARIABLE_SCHEMAS } from '../utils/problemParser'
import SimulationRouter from '../components/SimulationRouter'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'

const SIMULATION_ICONS = {
  projectile_motion: '🎯',
  projectile: '🎯',
  pendulum: '⏱️',
  spring_mass: '🔄',
  spring_launch: '🚀',
  circular_motion: '⭕',
  collisions: '💥',
  wave_motion: '〰️',
  rotational_mechanics: '🔀',
  orbital: '🛸',
  buoyancy: '⛵',
  electric_field: '⚡',
  ideal_gas: '💨',
  gas_laws: '💨',
  stoichiometry: '⚗️',
  chemical_bonding: '🔗',
  titration: '🧪',
  thermodynamics: '🔥',
  inclined_plane: '📐',
  free_fall: '⬇️',
  radioactive_decay: '☢️',
  magnetic_fields: '🧲',
}

function PalettePanel() {
  const simTypes = getSupportedSimulationTypes()

  const handleDragStart = (e, type) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('simulationType', type)
  }

  return (
    <div className="flex flex-col h-full border-r" style={{ borderColor: 'var(--color-border)' }}>
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h2 className="font-semibold text-lg">Simulation Blocks</h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Drag to canvas →</p>
      </div>

      <div className="overflow-y-auto flex-1 p-3 space-y-2">
        {simTypes.map((type) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            className="p-3 rounded-lg border cursor-move transition hover:scale-[1.02] active:opacity-75"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{SIMULATION_ICONS[type] || '📊'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{getSimulationName(type)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConfigCard({ block, index, onUpdateBlock, onRemoveBlock }) {
  const schema = VARIABLE_SCHEMAS[block.type]
  if (!schema) return null

  const allVars = [...(schema.required || []), ...(schema.optional || [])]

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{getSimulationName(block.type)}</h3>
        <button
          onClick={() => onRemoveBlock(index)}
          className="p-1 rounded hover:opacity-75 transition"
          style={{ color: 'var(--color-error)' }}
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3">
        {allVars.map((varName) => {
          const range = VARIABLE_RANGES[varName] || [0, 100]
          const unit = schema.units?.[varName] || ''
          const value = block.variables?.[varName] ?? range[0]

          return (
            <div key={varName} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">
                  {varName.replace(/_/g, ' ')}
                </label>
                <span className="text-xs text-[var(--color-text-dim)]">{unit}</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min={range[0]}
                  max={range[1]}
                  step={(range[1] - range[0]) / 100}
                  value={value}
                  onChange={(e) => {
                    const newValue = parseFloat(e.target.value)
                    onUpdateBlock(index, varName, newValue)
                  }}
                  className="flex-1 h-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    accentColor: 'var(--color-accent)',
                  }}
                />
                <input
                  type="number"
                  step={(range[1] - range[0]) / 100}
                  value={value}
                  onChange={(e) => {
                    const newValue = parseFloat(e.target.value)
                    if (newValue >= range[0] && newValue <= range[1]) {
                      onUpdateBlock(index, varName, newValue)
                    }
                  }}
                  className="w-20 px-2 py-1 rounded border text-xs"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CanvasPanel({ blocks, onBlocksChange }) {
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)

    const type = e.dataTransfer.getData('simulationType')
    if (!type) return

    // Max 3 blocks
    if (blocks.length >= 3) {
      alert('Maximum 3 simulation blocks allowed')
      return
    }

    // Add new block
    const newBlock = {
      type,
      variables: getDefaultVariables(type),
    }

    onBlocksChange([...blocks, newBlock])
  }

  const handleUpdateBlock = (index, varName, value) => {
    const updated = [...blocks]
    updated[index] = {
      ...updated[index],
      variables: {
        ...updated[index].variables,
        [varName]: value,
      },
    }
    onBlocksChange(updated)
  }

  const handleRemoveBlock = (index) => {
    onBlocksChange(blocks.filter((_, i) => i !== index))
  }

  return (
    <div
      className="flex flex-col h-full flex-1 border-r"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h2 className="font-semibold text-lg">Canvas ({blocks.length}/3)</h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Drop simulation blocks here</p>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 transition"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          backgroundColor: dragOver ? 'var(--color-accent-dim)' : 'transparent',
          borderRadius: dragOver ? '8px' : '0px',
        }}
      >
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-2">📦</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              Drag simulation blocks here to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map((block, idx) => (
              <ConfigCard
                key={idx}
                block={block}
                index={idx}
                onUpdateBlock={handleUpdateBlock}
                onRemoveBlock={handleRemoveBlock}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PreviewPanel({ blocks, simulation }) {
  const [isPreviewActive, setIsPreviewActive] = useState(false)

  const handlePreview = () => {
    if (blocks.length === 0) {
      alert('Add at least one simulation block to preview')
      return
    }

    const parsedData = buildParsedDataFromBlocks(blocks)
    if (parsedData && simulation) {
      simulation.solve(parsedData)
      setIsPreviewActive(true)
    }
  }

  const handleShareLink = async () => {
    if (blocks.length === 0) {
      alert('Add at least one simulation block to share')
      return
    }

    const encoded = encodeBuilderConfig(blocks)
    if (!encoded) {
      alert('Failed to encode configuration')
      return
    }

    const url = `${window.location.origin}${window.location.pathname}?config=${encoded}`
    try {
      await navigator.clipboard.writeText(url)
      alert('Share link copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('Failed to copy link. Please try again.')
    }
  }

  return (
    <div className="flex flex-col h-full border-l" style={{ borderColor: 'var(--color-border)' }}>
      <div className="p-4 border-b space-y-2" style={{ borderColor: 'var(--color-border)' }}>
        <h2 className="font-semibold text-lg">Preview</h2>
        <Button
          variant="primary"
          onClick={handlePreview}
          className="w-full text-sm"
        >
          <Eye size={16} className="inline mr-1" />
          Preview Simulation
        </Button>
        <Button
          variant="secondary"
          onClick={handleShareLink}
          className="w-full text-sm"
        >
          <Copy size={16} className="inline mr-1" />
          🔗 Share Link
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isPreviewActive && simulation?.activeSimulation ? (
          <div className="rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <SimulationRouter
              parsedData={simulation.parsedData}
              simulationType={simulation.activeSimulation}
              variables={simulation.currentVariables}
              isPlaying={simulation.isPlaying}
              simulationKey={simulation.simulationKey}
              onDataPoint={simulation.onDataPoint}
              isLoading={simulation.isLoading}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-2">👀</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              Click "Preview Simulation" to see your creation in action
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function GalleryPanel({ onLoadConfig }) {
  const [gallery, setGallery] = useState([])

  useEffect(() => {
    setGallery(loadGallery())
  }, [])

  const handleDelete = (id) => {
    if (window.confirm('Delete this saved simulation?')) {
      deleteFromGallery(id)
      setGallery(loadGallery())
    }
  }

  if (gallery.length === 0) {
    return (
      <div className="text-center py-4 px-3">
        <p className="text-xs text-[var(--color-text-muted)]">No saved simulations yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-3">
      <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Saved Simulations</p>
      {gallery.map((item) => (
        <div
          key={item.id}
          className="p-2 rounded-lg border cursor-pointer transition hover:scale-[1.02]"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <button
            onClick={() => onLoadConfig(item.blocks)}
            className="w-full text-left"
          >
            <p className="text-xs font-medium text-[var(--color-text)]">{item.name}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {new Date(item.createdAt).toLocaleDateString()}
            </p>
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            className="mt-1 text-[10px] px-2 py-0.5 rounded opacity-60 hover:opacity-100 transition"
            style={{ color: 'var(--color-error)' }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}

export default function BuilderPage({ simulation: externalSimulation }) {
  const localSimulation = useSimulation()
  const simulation = externalSimulation || localSimulation
  const [searchParams] = useSearchParams()
  const [blocks, setBlocks] = useState([])
  const [showGallery, setShowGallery] = useState(false)

  // Load config from URL on mount
  useEffect(() => {
    const configParam = searchParams.get('config')
    if (configParam) {
      const decoded = decodeBuilderConfig(configParam)
      if (decoded && decoded.length > 0) {
        setBlocks(decoded)
      }
    }
  }, [searchParams])

  const handleSave = () => {
    if (blocks.length === 0) {
      alert('Add at least one simulation block to save')
      return
    }

    const name = window.prompt('Enter a name for this simulation:')
    if (name && name.trim()) {
      if (saveToGallery(name.trim(), blocks)) {
        alert('Saved successfully!')
        setShowGallery(false)
      }
    }
  }

  const handleLoadConfig = (loadedBlocks) => {
    setBlocks(loadedBlocks)
    setShowGallery(false)
  }

  return (
    <div className="flex h-full gap-0" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Left Palette */}
      <div style={{ width: '280px' }}>
        <PalettePanel />
      </div>

      {/* Center Canvas */}
      <div className="flex-1 flex flex-col">
        <CanvasPanel blocks={blocks} onBlocksChange={setBlocks} />

        {/* Palette Actions */}
        <div className="p-3 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
          <Button
            variant="secondary"
            onClick={handleSave}
            className="w-full text-xs"
          >
            💾 Save
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowGallery(!showGallery)}
            className="w-full text-xs"
          >
            📂 {showGallery ? 'Hide' : 'My Saved'}
          </Button>

          {showGallery && (
            <div className="max-h-60 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <GalleryPanel onLoadConfig={handleLoadConfig} />
            </div>
          )}
        </div>
      </div>

      {/* Right Preview */}
      <div style={{ width: '320px' }}>
        <PreviewPanel blocks={blocks} simulation={simulation} />
      </div>
    </div>
  )
}
