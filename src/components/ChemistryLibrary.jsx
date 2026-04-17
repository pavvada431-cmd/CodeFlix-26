import { X } from 'lucide-react'
import { SIMULATION_ICONS, SIMULATION_COLORS } from '../hooks/useSimulation'

const CHEMISTRY_SIMULATIONS = [
  {
    type: 'organic_chemistry',
    name: 'Organic Chemistry',
    description: 'Explore molecular structures, functional groups, and reactions',
    examples: ['Methane CH₄', 'Ethanol C₂H₅OH', 'Benzene ring'],
  },
  {
    type: 'stoichiometry',
    name: 'Stoichiometry',
    description: 'Balance equations and calculate reaction quantities',
    examples: ['Mole calculations', 'Limiting reagents', 'Percent yield'],
  },
  {
    type: 'titration',
    name: 'Titration',
    description: 'Acid-base neutralization and equivalence point detection',
    examples: ['Strong acid/base', 'Weak acid', 'pH indicators'],
  },
  {
    type: 'atomic_structure',
    name: 'Atomic Structure',
    description: 'Bohr shells, valence electrons, and electron configurations',
    examples: ['H through Ca', 'Valence trends', 'Quantum cloud view'],
  },
  {
    type: 'gas_laws',
    name: 'Gas Laws',
    description: 'Explore Boyle, Charles, and Gay-Lussac gas relationships',
    examples: ['PV relationship', 'Volume-temperature', 'Pressure-temperature'],
  },
  {
    type: 'chemical_bonding',
    name: 'Chemical Bonding',
    description: 'Compare ionic, covalent, and metallic bonding mechanisms',
    examples: ['NaCl transfer', 'H₂/O₂/H₂O/CO₂ sharing', 'Electron sea'],
  },
  {
    type: 'combustion',
    name: 'Combustion',
    description: 'Fuel burning and energy release reactions',
    examples: ['Hydrocarbon燃烧', 'Enthalpy calculation', 'Flame tests'],
  },
  {
    type: 'ideal_gas',
    name: 'Ideal Gas Law',
    description: 'PV=nRT relationships and gas behavior',
    examples: ['Pressure/temperature', 'Volume changes', 'Moles calculation'],
  },
  {
    type: 'radioactive_decay',
    name: 'Nuclear Decay',
    description: 'Radioactive half-life and decay chains',
    examples: ['Carbon-14 dating', 'Alpha/beta decay', 'Half-life calculation'],
  },
]

export default function ChemistryLibrary({ isOpen, onClose, onSelectSimulation }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      
      <div 
        className="relative z-10 max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border shadow-2xl"
        style={{ 
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div 
          className="sticky top-0 z-10 flex items-center justify-between border-b p-4"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              🧪 Chemistry Library
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Select a chemistry concept to explore
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-black/10"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CHEMISTRY_SIMULATIONS.map((sim) => {
              const color = SIMULATION_COLORS[sim.type] || '#22d3ee'
              
              return (
                <button
                  key={sim.type}
                  onClick={() => onSelectSimulation(sim.type)}
                  className="group relative overflow-hidden rounded-xl border-2 text-left transition-all hover:scale-[1.02] hover:shadow-lg"
                  style={{ 
                    borderColor: color,
                    backgroundColor: 'var(--color-surface)'
                  }}
                >
                  <div 
                    className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-10"
                    style={{ backgroundColor: color }}
                  />
                  
                  <div className="p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div 
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        {SIMULATION_ICONS[sim.type] || '🧪'}
                      </div>
                      <div>
                        <h3 className="font-bold" style={{ color: 'var(--color-text)' }}>
                          {sim.name}
                        </h3>
                      </div>
                    </div>
                    
                    <p className="mb-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {sim.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      {sim.examples.map((ex, i) => (
                        <span
                          key={i}
                          className="rounded-full px-2 py-0.5 text-xs"
                          style={{ 
                            backgroundColor: `${color}20`,
                            color: color
                          }}
                        >
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1 transition-all group-hover:h-[3px]"
                    style={{ backgroundColor: color }}
                  />
                </button>
              )
            })}
          </div>

          <div 
            className="mt-8 rounded-xl border p-4"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}
          >
            <h4 className="mb-2 font-semibold" style={{ color: 'var(--color-text)' }}>
              💡 Quick Tips
            </h4>
            <ul className="space-y-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <li>• Type your chemistry question in natural language</li>
              <li>• Include values like "10 mL", "0.5 M", or "25°C"</li>
              <li>• Mention specific compounds like "methane" or "acetic acid"</li>
              <li>• Ask for what you want to find like "calculate the pH"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
