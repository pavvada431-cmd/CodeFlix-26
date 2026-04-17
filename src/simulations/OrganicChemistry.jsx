import { useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const CARBON_COLOR = '#333333'
const HYDROGEN_COLOR = '#ffffff'
const OXYGEN_COLOR = '#ff0000'
const NITROGEN_COLOR = '#3b82f6'
const BOND_COLOR = '#888888'

function Atom({ position, element, label }) {
  const colors = {
    C: CARBON_COLOR,
    H: HYDROGEN_COLOR,
    O: OXYGEN_COLOR,
    N: NITROGEN_COLOR,
    default: '#ff00ff'
  }
  const color = colors[element] || colors.default
  const radius = element === 'H' ? 0.15 : 0.25

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
      <sprite position={[0, radius + 0.2, 0]} scale={[0.5, 0.25, 1]}>
        <spriteMaterial map={createTextTexture(element, '#ffffff')} transparent />
      </sprite>
    </group>
  )
}

function Bond({ start, end }) {
  const startVec = new THREE.Vector3(...start)
  const endVec = new THREE.Vector3(...end)
  const midpoint = startVec.clone().add(endVec).multiplyScalar(0.5)
  const length = startVec.distanceTo(endVec)
  const direction = endVec.clone().sub(startVec).normalize()
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction
  )

  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[0.05, 0.05, length, 8]} />
      <meshStandardMaterial color={BOND_COLOR} />
    </mesh>
  )
}

function DoubleBond({ start, end }) {
  const startVec = new THREE.Vector3(...start)
  const endVec = new THREE.Vector3(...end)
  const direction = endVec.clone().sub(startVec).normalize()
  const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize()
  const offset = perpendicular.clone().multiplyScalar(0.1)

  const s1 = startVec.clone().add(offset).toArray()
  const e1 = endVec.clone().add(offset).toArray()
  const s2 = startVec.clone().sub(offset).toArray()
  const e2 = endVec.clone().sub(offset).toArray()

  return (
    <group>
      <Bond start={s1} end={e1} />
      <Bond start={s2} end={e2} />
    </group>
  )
}

function Molecule({ type, position = [0, 0, 0] }) {
  const groupRef = useRef()

  const molecules = useMemo(() => ({
    methane: {
      atoms: [
        { element: 'C', position: [0, 0, 0] },
        { element: 'H', position: [0.7, 0, 0] },
        { element: 'H', position: [-0.7, 0, 0] },
        { element: 'H', position: [0, 0.7, 0] },
        { element: 'H', position: [0, -0.7, 0] },
      ],
      bonds: [
        { start: [0, 0, 0], end: [0.7, 0, 0] },
        { start: [0, 0, 0], end: [-0.7, 0, 0] },
        { start: [0, 0, 0], end: [0, 0.7, 0] },
        { start: [0, 0, 0], end: [0, -0.7, 0] },
      ],
      formula: 'CH₄',
      name: 'Methane',
      description: 'Simplest alkane with tetrahedral structure'
    },
    ethane: {
      atoms: [
        { element: 'C', position: [-0.5, 0, 0] },
        { element: 'C', position: [0.5, 0, 0] },
        { element: 'H', position: [-1.2, 0.7, 0] },
        { element: 'H', position: [-1.2, -0.7, 0] },
        { element: 'H', position: [-0.5, 0, 1] },
        { element: 'H', position: [1.2, 0.7, 0] },
        { element: 'H', position: [1.2, -0.7, 0] },
        { element: 'H', position: [0.5, 0, 1] },
      ],
      bonds: [
        { start: [-0.5, 0, 0], end: [0.5, 0, 0] },
        { start: [-0.5, 0, 0], end: [-1.2, 0.7, 0] },
        { start: [-0.5, 0, 0], end: [-1.2, -0.7, 0] },
        { start: [-0.5, 0, 0], end: [-0.5, 0, 1] },
        { start: [0.5, 0, 0], end: [1.2, 0.7, 0] },
        { start: [0.5, 0, 0], end: [1.2, -0.7, 0] },
        { start: [0.5, 0, 0], end: [0.5, 0, 1] },
      ],
      formula: 'C₂H₆',
      name: 'Ethane',
      description: 'Two-carbon alkane'
    },
    ethanol: {
      atoms: [
        { element: 'C', position: [-0.5, 0, 0] },
        { element: 'C', position: [0.5, 0, 0] },
        { element: 'O', position: [1.2, 0.7, 0] },
        { element: 'H', position: [-1.2, 0.7, 0] },
        { element: 'H', position: [-1.2, -0.7, 0] },
        { element: 'H', position: [-0.5, 0, 1] },
        { element: 'H', position: [0.5, 0, 1] },
        { element: 'H', position: [1.6, 1.2, 0] },
      ],
      bonds: [
        { start: [-0.5, 0, 0], end: [0.5, 0, 0] },
        { start: [0.5, 0, 0], end: [1.2, 0.7, 0] },
        { start: [-0.5, 0, 0], end: [-1.2, 0.7, 0] },
        { start: [-0.5, 0, 0], end: [-1.2, -0.7, 0] },
        { start: [-0.5, 0, 0], end: [-0.5, 0, 1] },
        { start: [0.5, 0, 0], end: [0.5, 0, 1] },
        { start: [1.2, 0.7, 0], end: [1.6, 1.2, 0] },
      ],
      formula: 'C₂H₅OH',
      name: 'Ethanol',
      description: 'Common alcohol found in beverages'
    },
    benzene: {
      atoms: [
        { element: 'C', position: [1, 0, 0] },
        { element: 'C', position: [0.5, 0.866, 0] },
        { element: 'C', position: [-0.5, 0.866, 0] },
        { element: 'C', position: [-1, 0, 0] },
        { element: 'C', position: [-0.5, -0.866, 0] },
        { element: 'C', position: [0.5, -0.866, 0] },
        { element: 'H', position: [1.8, 0, 0] },
        { element: 'H', position: [0.9, 1.56, 0] },
        { element: 'H', position: [-0.9, 1.56, 0] },
        { element: 'H', position: [-1.8, 0, 0] },
        { element: 'H', position: [-0.9, -1.56, 0] },
        { element: 'H', position: [0.9, -1.56, 0] },
      ],
      bonds: [
        { start: [1, 0, 0], end: [0.5, 0.866, 0], type: 'double' },
        { start: [0.5, 0.866, 0], end: [-0.5, 0.866, 0] },
        { start: [-0.5, 0.866, 0], end: [-1, 0, 0], type: 'double' },
        { start: [-1, 0, 0], end: [-0.5, -0.866, 0] },
        { start: [-0.5, -0.866, 0], end: [0.5, -0.866, 0], type: 'double' },
        { start: [0.5, -0.866, 0], end: [1, 0, 0] },
        { start: [1, 0, 0], end: [1.8, 0, 0] },
        { start: [0.5, 0.866, 0], end: [0.9, 1.56, 0] },
        { start: [-0.5, 0.866, 0], end: [-0.9, 1.56, 0] },
        { start: [-1, 0, 0], end: [-1.8, 0, 0] },
        { start: [-0.5, -0.866, 0], end: [-0.9, -1.56, 0] },
        { start: [0.5, -0.866, 0], end: [0.9, -1.56, 0] },
      ],
      formula: 'C₆H₆',
      name: 'Benzene',
      description: 'Aromatic hydrocarbon with delocalized electrons'
    },
    acetic_acid: {
      atoms: [
        { element: 'C', position: [-0.5, 0, 0] },
        { element: 'C', position: [0.5, 0, 0] },
        { element: 'O', position: [0.9, 0.7, 0] },
        { element: 'O', position: [0.9, -0.7, 0] },
        { element: 'H', position: [-1.2, 0.7, 0] },
        { element: 'H', position: [-1.2, -0.7, 0] },
        { element: 'H', position: [-0.5, 0, 1] },
        { element: 'H', position: [1.3, 1.1, 0] },
      ],
      bonds: [
        { start: [-0.5, 0, 0], end: [0.5, 0, 0] },
        { start: [0.5, 0, 0], end: [0.9, 0.7, 0] },
        { start: [0.5, 0, 0], end: [0.9, -0.7, 0] },
        { start: [-0.5, 0, 0], end: [-1.2, 0.7, 0] },
        { start: [-0.5, 0, 0], end: [-1.2, -0.7, 0] },
        { start: [-0.5, 0, 0], end: [-0.5, 0, 1] },
        { start: [0.9, 0.7, 0], end: [1.3, 1.1, 0] },
      ],
      formula: 'CH₃COOH',
      name: 'Acetic Acid',
      description: 'Main component of vinegar'
    }
  }), [])

  const molecule = molecules[type] || molecules.methane

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {molecule.atoms.map((atom, i) => (
        <Atom key={i} position={atom.position} element={atom.element} label={atom.element} />
      ))}
      {molecule.bonds.map((bond, i) => (
        bond.type === 'double' 
          ? <DoubleBond key={i} start={bond.start} end={bond.end} />
          : <Bond key={i} start={bond.start} end={bond.end} />
      ))}
    </group>
  )
}

function createTextTexture(text, color = '#ffffff') {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.roundRect(0, 0, 128, 64, 8)
  ctx.fill()
  ctx.fillStyle = color
  ctx.font = 'bold 48px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 32)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function InfoPanel({ moleculeType }) {
  const moleculeInfo = {
    methane: { 
      formula: 'CH₄', 
      name: 'Methane', 
      type: 'Alkane',
      properties: ['Simplest hydrocarbon', 'Tetrahedral shape', 'Natural gas component'],
      uses: ['Fuel source', 'Hydrogen production', 'Chemical feedstock']
    },
    ethane: { 
      formula: 'C₂H₆', 
      name: 'Ethane', 
      type: 'Alkane',
      properties: ['Colorless gas', 'Two-carbon chain', 'Slightly sweeter than methane'],
      uses: ['Ethylene production', 'Refrigerant', 'Fuel']
    },
    ethanol: { 
      formula: 'C₂H₅OH', 
      name: 'Ethanol', 
      type: 'Alcohol',
      properties: ['Polar molecule', 'Hydrogen bonding', 'Good solvent'],
      uses: ['Biofuel', 'Beverages', 'Disinfectants']
    },
    benzene: { 
      formula: 'C₆H₆', 
      name: 'Benzene', 
      type: 'Aromatic',
      properties: ['Delocalized electrons', 'Planar structure', 'Sweet odor'],
      uses: ['Plastics synthesis', 'Solvent', 'Chemical intermediate']
    },
    acetic_acid: { 
      formula: 'CH₃COOH', 
      name: 'Acetic Acid', 
      type: 'Carboxylic Acid',
      properties: ['Sour taste', 'Vinegar smell', 'Weak acid'],
      uses: ['Food preservation', 'Vinyl acetate', 'Chemical synthesis']
    }
  }

  const info = moleculeInfo[moleculeType] || moleculeInfo.methane

  return (
    <div className="absolute top-4 left-4 rounded-xl border border-[rgba(0,245,255,0.3)] bg-[rgba(0,0,0,0.85)] p-4 backdrop-blur-sm max-w-xs">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-[rgba(0,245,255,0.2)] px-3 py-1 font-mono-display text-sm text-[#00f5ff]">
          {info.type}
        </span>
      </div>
      <h3 className="mb-1 font-heading text-xl font-bold text-white">
        {info.name}
      </h3>
      <p className="mb-3 font-mono text-2xl text-[#ff8800]">
        {info.formula}
      </p>
      <div className="mb-2">
        <p className="mb-1 font-mono-display text-xs uppercase tracking-wider text-slate-400">
          Properties
        </p>
        <ul className="space-y-1">
          {info.properties.map((prop, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
              <span className="h-1 w-1 rounded-full bg-[#00f5ff]"></span>
              {prop}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 font-mono-display text-xs uppercase tracking-wider text-slate-400">
          Common Uses
        </p>
        <ul className="space-y-1">
          {info.uses.map((use, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
              <span className="h-1 w-1 rounded-full bg-[#ff8800]"></span>
              {use}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function MoleculeSelector({ selected, onSelect }) {
  const molecules = ['methane', 'ethane', 'ethanol', 'benzene', 'acetic_acid']

  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-2">
      <p className="font-mono-display text-xs uppercase tracking-wider text-slate-400">
        Select Molecule
      </p>
      <div className="flex flex-wrap gap-2">
        {molecules.map((mol) => (
          <button
            key={mol}
            onClick={() => onSelect(mol)}
            className={`rounded-lg px-3 py-1.5 font-mono text-xs transition ${
              selected === mol
                ? 'bg-[rgba(0,245,255,0.3)] text-[#00f5ff] border border-[rgba(0,245,255,0.5)]'
                : 'bg-[rgba(50,50,50,0.5)] text-slate-400 border border-transparent hover:bg-[rgba(70,70,70,0.5)]'
            }`}
          >
            {mol.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
  )
}

function ReactionInfo({ reactionType }) {
  const reactions = {
    combustion: { 
      equation: 'CH₄ + 2O₂ → CO₂ + 2H₂O',
      description: 'Methane burns in oxygen to produce carbon dioxide and water',
      energy: '890 kJ/mol released'
    },
    substitution: {
      equation: 'CH₄ + Cl₂ → CH₃Cl + HCl',
      description: 'A hydrogen atom is replaced by chlorine',
      energy: 'Endothermic reaction'
    },
    addition: {
      equation: 'C₂H₄ + H₂ → C₂H₆',
      description: 'Double bond becomes single bond',
      energy: 'Exothermic reaction'
    }
  }

  const reaction = reactions[reactionType] || reactions.combustion

  return (
    <div className="absolute bottom-4 right-4 max-w-xs rounded-xl border border-[rgba(255,136,0,0.3)] bg-[rgba(0,0,0,0.85)] p-4 backdrop-blur-sm">
      <p className="mb-1 font-mono-display text-xs uppercase tracking-wider text-[#ff8800]">
        Reaction
      </p>
      <p className="mb-2 font-mono text-sm text-white">
        {reaction.equation}
      </p>
      <p className="text-xs text-slate-400">
        {reaction.description}
      </p>
      <p className="mt-2 text-xs text-[#ff8800]">
        {reaction.energy}
      </p>
    </div>
  )
}

export default function OrganicChemistry({
  compound = 'methane',
  reactionType = 'combustion',
  isPlaying = true,
}) {
  const [selectedMolecule, setSelectedMolecule] = useState(compound)

  return (
    <div className="relative h-full w-full" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #1a1f3e 100%)' }}>
      <Canvas
        camera={{ position: [3, 2, 5], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <pointLight position={[-5, 5, 5]} intensity={0.3} color="#00f5ff" />
        
        <Molecule type={selectedMolecule} position={[0, 0.5, 0]} />
        
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#0a0f1e" />
        </mesh>
        
        <gridHelper args={[20, 20, '#1a2a4a', '#0a1525']} position={[0, -0.99, 0]} />
      </Canvas>

      <InfoPanel moleculeType={selectedMolecule} />
      <MoleculeSelector selected={selectedMolecule} onSelect={setSelectedMolecule} />
      <ReactionInfo reactionType={reactionType} />

      <div className="absolute right-4 top-4 rounded-full border border-[rgba(0,245,255,0.3)] bg-[rgba(0,0,0,0.7)] px-4 py-2 font-mono-display text-xs text-[#00f5ff]">
        ORGANIC CHEMISTRY
      </div>
    </div>
  )
}

OrganicChemistry.getSceneConfig = (variables = {}) => {
  const { compound = 'methane', reactionType = 'combustion' } = variables

  return {
    name: 'Organic Chemistry',
    description: 'Interactive molecular structure visualization',
    type: 'organic_chemistry',
    camera: { position: [3, 2, 5], fov: 50 },
    objects: [
      { type: 'molecule', compound },
      { type: 'reaction-info', reactionType }
    ],
    physics: { compound, reactionType }
  }
}
