import { VARIABLE_SCHEMAS } from './problemParser'

// Variable ranges for physics/chemistry simulations
export const VARIABLE_RANGES = {
  mass: [0.1, 100],
  mass1: [0.1, 50],
  mass2: [0.1, 50],
  velocity: [1, 100],
  velocity1: [1, 100],
  velocity2: [1, 100],
  angle: [1, 89],
  launchAngle: [1, 89],
  height: [0.1, 100],
  initialVelocityY: [0, 50],
  initialVelocityX: [0, 50],
  gravity: [1, 20],
  length: [0.1, 10],
  k: [1, 1000],
  displacement: [0, 2],
  compression: [0, 2],
  damping: [0, 1],
  radius: [0.1, 50],
  angularVelocity: [0, 10],
  frequency: [0.1, 10],
  elasticity: [0, 1],
  friction: [0, 1],
  amplitude: [0.1, 5],
  wavelength: [0.1, 10],
  force: [0, 100],
  forcePosition: [0, 360],
  centralMass: [1e24, 2e30],
  orbitingMass: [1, 1e24],
  distance: [1e7, 1e12],
  fluidDensity: [1, 2000],
  objectDensity: [1, 20000],
  volume: [0.001, 10],
  temperature: [1, 1000],
  pressure: [1, 1e5],
  moles: [0.001, 100],
  numParticles: [10, 10000],
  charge: [1e-10, 1e-5],
  charge1: [1e-10, 1e-5],
  charge2: [1e-10, 1e-5],
  magneticField: [0.1, 10],
  reactantAmount: [0.001, 100],
  molarMass: [1, 500],
  productAmount: [0.001, 100],
  initialAtoms: [100, 10000],
  halfLife: [0.001, 1000],
  focalLength: [0.1, 100],
  objectDistance: [0.1, 100],
}

// Simulation type to domain mapping
const DOMAIN_MAP = {
  projectile_motion: 'physics',
  projectile: 'physics',
  pendulum: 'physics',
  spring_mass: 'physics',
  spring_launch: 'physics',
  circular_motion: 'physics',
  collisions: 'physics',
  wave_motion: 'physics',
  rotational_mechanics: 'physics',
  orbital: 'physics',
  buoyancy: 'physics',
  fluid_mechanics: 'physics',
  electric_field: 'physics',
  electromagnetic: 'physics',
  magnetic_fields: 'physics',
  optics_lens: 'physics',
  optics_mirror: 'physics',
  thermodynamics: 'physics',
  inclined_plane: 'physics',
  free_fall: 'physics',
  ideal_gas: 'chemistry',
  gas_laws: 'chemistry',
  stoichiometry: 'chemistry',
  chemical_bonding: 'chemistry',
  titration: 'chemistry',
  combustion: 'chemistry',
  atomic_structure: 'chemistry',
  organic_chemistry: 'chemistry',
  radioactive_decay: 'physics',
}

// Formula map for quick reference
const FORMULA_MAP = {
  projectile_motion: 'R = v₀² sin(2θ) / g',
  projectile: 'R = v₀² sin(2θ) / g',
  pendulum: 'T = 2π√(L/g)',
  spring_mass: 'T = 2π√(m/k)',
  circular_motion: 'F_c = mv²/r',
  collisions: 'p₁ + p₂ = p₁\' + p₂\'',
  wave_motion: 'v = fλ',
  ideal_gas: 'PV = nRT',
  gas_laws: 'PV/T = constant',
  orbital: 'v = √(GM/r)',
}

// Simulation type friendly names
const TYPE_NAMES = {
  projectile_motion: 'Projectile Motion',
  projectile: 'Projectile Motion',
  pendulum: 'Pendulum',
  spring_mass: 'Spring-Mass',
  spring_launch: 'Spring Launcher',
  circular_motion: 'Circular Motion',
  collisions: 'Collisions',
  wave_motion: 'Wave Motion',
  rotational_mechanics: 'Rotational Motion',
  orbital: 'Orbital Mechanics',
  buoyancy: 'Buoyancy',
  electric_field: 'Electric Fields',
  ideal_gas: 'Ideal Gas',
  gas_laws: 'Gas Laws',
  stoichiometry: 'Stoichiometry',
  chemical_bonding: 'Chemical Bonding',
  titration: 'Titration',
  thermodynamics: 'Thermodynamics',
  inclined_plane: 'Inclined Plane',
  free_fall: 'Free Fall',
  radioactive_decay: 'Radioactive Decay',
}

/**
 * Build a valid parsedData object from builder blocks
 * Supports single and multi-concept simulations
 */
export function buildParsedDataFromBlocks(blocks) {
  if (!blocks || blocks.length === 0) {
    return null
  }

  if (blocks.length === 1) {
    const block = blocks[0]
    const domain = DOMAIN_MAP[block.type] || 'physics'
    const typeName = TYPE_NAMES[block.type] || block.type

    return {
      type: block.type,
      domain,
      simulationType: block.type,
      simulationTitle: typeName,
      subtitle: 'User-configured simulation',
      category: domain === 'physics' ? 'Mechanics' : 'Chemistry',
      variables: block.variables || {},
      formula: FORMULA_MAP[block.type] || '',
      steps: [
        `User configured ${typeName}`,
        'Simulation ready for preview',
        'Adjust variables to see live changes',
      ],
      answer: {
        value: 0,
        unit: '',
        explanation: 'Preview mode - adjust variables and run simulation',
      },
      isBuilderGenerated: true,
    }
  }

  // Multi-concept simulation
  return {
    isMultiConcept: true,
    domain: DOMAIN_MAP[blocks[0].type] || 'physics',
    title: 'Multi-Concept Simulation',
    subtitle: 'Explore interconnected physics concepts',
    stages: blocks.map((block, idx) => ({
      id: `stage_${idx}`,
      type: block.type,
      title: TYPE_NAMES[block.type] || block.type,
      variables: block.variables || {},
      formula: FORMULA_MAP[block.type] || '',
    })),
    transitions: blocks.slice(0, -1).map((_, idx) => ({
      from: `stage_${idx}`,
      to: `stage_${idx + 1}`,
      condition: 'stage_complete',
      message: `Stage ${idx + 1} complete. Advancing...`,
    })),
    steps: [
      `Multi-concept exploration`,
      `${blocks.length} simulation stages configured`,
      'Progress through each stage sequentially',
    ],
    answer: {
      value: 0,
      unit: '',
      explanation: 'Multi-concept preview - each stage runs sequentially',
    },
    isBuilderGenerated: true,
  }
}

/**
 * Encode builder blocks to base64-encoded JSON for URL sharing
 */
export function encodeBuilderConfig(blocks) {
  try {
    const json = JSON.stringify(blocks)
    return btoa(json)
  } catch (error) {
    console.error('Failed to encode builder config:', error)
    return null
  }
}

/**
 * Decode base64-encoded builder config from URL param
 */
export function decodeBuilderConfig(encoded) {
  try {
    if (!encoded || typeof encoded !== 'string') {
      return null
    }
    const json = atob(encoded)
    const blocks = JSON.parse(json)

    // Validate blocks
    if (!Array.isArray(blocks)) {
      return null
    }

    return blocks.filter((block) => {
      // Each block must have a valid type
      return block.type && VARIABLE_SCHEMAS[block.type]
    })
  } catch (error) {
    console.error('Failed to decode builder config:', error)
    return null
  }
}

/**
 * Get default variable values for a simulation type
 */
export function getDefaultVariables(simulationType) {
  const schema = VARIABLE_SCHEMAS[simulationType]
  if (!schema) return {}

  const defaults = {}

  // Set defaults for required variables
  if (schema.required) {
    schema.required.forEach((varName) => {
      const range = VARIABLE_RANGES[varName]
      if (range) {
        // Use midpoint of range as default
        defaults[varName] = (range[0] + range[1]) / 2
      } else {
        defaults[varName] = 1
      }
    })
  }

  // Set defaults for optional variables (more conservative)
  if (schema.optional) {
    schema.optional.forEach((varName) => {
      const range = VARIABLE_RANGES[varName]
      if (range) {
        defaults[varName] = range[0]
      } else {
        defaults[varName] = 0
      }
    })
  }

  return defaults
}

/**
 * Save a builder config to localStorage gallery
 */
export function saveToGallery(name, blocks) {
  try {
    const gallery = JSON.parse(localStorage.getItem('simusolve.gallery') || '[]')

    // Check max gallery size
    if (gallery.length >= 10) {
      alert('Gallery is full (max 10 saved simulations). Delete one to save a new one.')
      return false
    }

    // Add new entry
    gallery.push({
      id: `sim_${Date.now()}`,
      name,
      blocks,
      createdAt: new Date().toISOString(),
    })

    localStorage.setItem('simusolve.gallery', JSON.stringify(gallery))
    return true
  } catch (error) {
    console.error('Failed to save to gallery:', error)
    return false
  }
}

/**
 * Load gallery from localStorage
 */
export function loadGallery() {
  try {
    const gallery = JSON.parse(localStorage.getItem('simusolve.gallery') || '[]')
    return gallery
  } catch (error) {
    console.error('Failed to load gallery:', error)
    return []
  }
}

/**
 * Delete a config from gallery
 */
export function deleteFromGallery(id) {
  try {
    const gallery = JSON.parse(localStorage.getItem('simusolve.gallery') || '[]')
    const updated = gallery.filter((item) => item.id !== id)
    localStorage.setItem('simusolve.gallery', JSON.stringify(updated))
    return true
  } catch (error) {
    console.error('Failed to delete from gallery:', error)
    return false
  }
}

/**
 * Get friendly name for a simulation type
 */
export function getSimulationName(type) {
  return TYPE_NAMES[type] || type
}

/**
 * Get all supported simulation types
 */
export function getSupportedSimulationTypes() {
  return Object.keys(VARIABLE_SCHEMAS)
}
