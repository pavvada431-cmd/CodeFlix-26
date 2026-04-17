const ALLOWED_DOMAINS = new Set(['physics', 'chemistry'])

// All supported simulation types
const ALLOWED_TYPES = new Set([
  'inclined_plane',
  'projectile',
  'free_fall',
  'pendulum',
  'spring_mass',
  'spring_launch',
  'circular_motion',
  'collisions',
  'wave_motion',
  'rotational_mechanics',
  'orbital',
  'buoyancy',
  'ideal_gas',
  'electric_field',
  'optics_lens',
  'optics_mirror',
  'radioactive_decay',
  'electromagnetic',
  'circuit',
  'titration',
  'combustion',
])

const DOMAIN_TYPES = {
  physics: new Set([
    'inclined_plane',
    'projectile',
    'free_fall',
    'pendulum',
    'spring_mass',
    'spring_launch',
    'circular_motion',
    'collisions',
    'wave_motion',
    'rotational_mechanics',
    'orbital',
    'buoyancy',
    'ideal_gas',
    'electric_field',
    'optics_lens',
    'optics_mirror',
    'radioactive_decay',
    'electromagnetic',
    'circuit',
  ]),
  chemistry: new Set(['titration', 'combustion']),
}

const WARNINGS = []
const MAX_INPUT_LENGTH = 500

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeKey(key) {
  return key.toLowerCase().trim()
}

function normalizeUnit(unit) {
  return String(unit ?? '')
    .toLowerCase()
    .trim()
}

export function clampAngle(value, unit) {
  const normalizedUnit = normalizeUnit(unit)
  const maxDegrees = 89
  const maxRadians = (89 * Math.PI) / 180

  if (normalizedUnit.includes('rad')) {
    const clamped = Math.min(Math.max(value, -maxRadians), maxRadians)
    if (clamped !== value) {
      WARNINGS.push(`Angle clamped from ${value.toFixed(3)} to ${clamped.toFixed(3)} radians`)
    }
    return clamped
  } else {
    const clamped = Math.min(Math.max(value, -maxDegrees), maxDegrees)
    if (clamped !== value) {
      WARNINGS.push(`Angle clamped from ${value.toFixed(1)}° to ${clamped.toFixed(1)}°`)
    }
    return clamped
  }
}

export function sanitizeMass(value) {
  if (value <= 0) {
    WARNINGS.push(`Mass must be positive, set to 0.1 kg`)
    return 0.1
  }
  return value
}

export function sanitizeVelocity(value) {
  const maxVelocity = 1000
  if (value > maxVelocity) {
    WARNINGS.push(`Velocity ${value} m/s exceeds safe limit, clamped to ${maxVelocity} m/s`)
    return maxVelocity
  }
  if (value < 0) {
    WARNINGS.push(`Velocity cannot be negative, using absolute value`)
    return Math.abs(value)
  }
  return value
}

export function getWarnings() {
  const warnings = [...WARNINGS]
  WARNINGS.length = 0
  return warnings
}

export function clearWarnings() {
  WARNINGS.length = 0
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return ''

  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .substring(0, MAX_INPUT_LENGTH)
}

export function validateInputLength(input) {
  if (input.length >= MAX_INPUT_LENGTH) {
    return {
      valid: false,
      message: `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters`,
    }
  }
  return { valid: true }
}

function validateAngle(key, value, unit, errors) {
  const normalizedUnit = normalizeUnit(unit)
  const upperBound = normalizedUnit.includes('rad') ? Math.PI / 2 : 90
  const unitLabel = normalizedUnit.includes('rad') ? 'radians' : 'degrees'

  if (value > 89 && !normalizedUnit.includes('rad')) {
    errors.push(`Angle ${key} (${value}°) exceeds maximum 89°, will be clamped`)
  } else if (value > Math.PI / 2 && normalizedUnit.includes('rad')) {
    errors.push(`Angle ${key} exceeds maximum π/2 radians, will be clamped`)
  }

  if (value < 0 || value > upperBound) {
    errors.push(`${key} must be between 0 and ${upperBound} ${unitLabel}`)
  }
}

function validateTemperature(key, value, unit, errors) {
  const normalizedUnit = normalizeUnit(unit)

  if (normalizedUnit.includes('k') && value <= 0) {
    errors.push(`${key} must be greater than 0 K`)
    return
  }

  if (
    (normalizedUnit.includes('c') || normalizedUnit.includes('celsius')) &&
    value < -273.15
  ) {
    errors.push(`${key} cannot be below absolute zero in Celsius`)
    return
  }

  if (
    (normalizedUnit.includes('f') || normalizedUnit.includes('fahrenheit')) &&
    value < -459.67
  ) {
    errors.push(`${key} cannot be below absolute zero in Fahrenheit`)
  }
}

function validateVariableRange(key, value, unit, errors) {
  const normalizedKey = normalizeKey(key)

  if (Math.abs(value) > 1e9) {
    errors.push(`${key} is outside the supported numeric range`)
    return
  }

  if (
    /angle|theta|phi|incline|inclination|slope/.test(normalizedKey)
  ) {
    validateAngle(key, value, unit, errors)
    return
  }

  if (/ph\b/.test(normalizedKey)) {
    if (value < 0 || value > 14) {
      errors.push(`${key} must be between 0 and 14`)
    }
    return
  }

  if (/coefficient|friction|^mu$|^μ$/.test(normalizedKey)) {
    if (value < 0 || value > 5) {
      errors.push(`${key} must be between 0 and 5`)
    }
    return
  }

  if (/temperature|temp/.test(normalizedKey)) {
    validateTemperature(key, value, unit, errors)
    return
  }

  if (
    /mass|weight|moles|molarity|concentration|volume|resistance|capacitance|inductance|period|time|duration|frequency|pressure|density|radius|diameter|length|distance|range|height|width|depth|area/.test(
      normalizedKey,
    ) ||
    /^h\d*$/.test(normalizedKey)
  ) {
    if (value <= 0) {
      errors.push(`${key} must be greater than 0`)
    }
    return
  }

  if (/gravity/.test(normalizedKey)) {
    if (value <= 0 || value > 100) {
      errors.push(`${key} must be greater than 0 and less than or equal to 100`)
    }
    return
  }

  if (/speed|velocity/.test(normalizedKey)) {
    if (value > 1000) {
      errors.push(`${key} (${value}) exceeds maximum safe velocity (1000 m/s), will be clamped`)
    }
    return
  }

  if (/acceleration|force|energy|work|power|current|voltage|charge/.test(normalizedKey)) {
    if (value > 10000) {
      errors.push(`${key} (${value}) exceeds maximum safe value, will be clamped`)
    }
    return
  }

  if (/^v\d*$/.test(normalizedKey)) {
    return
  }

  if (/efficiency|yield|percent/.test(normalizedKey)) {
    if (value < 0 || value > 100) {
      errors.push(`${key} must be between 0 and 100`)
    }
  }
}

export function validateParsedProblem(problem) {
  const errors = []

  if (!isPlainObject(problem)) {
    return {
      isValid: false,
      errors: ['Parsed problem must be a JSON object'],
    }
  }

  // Check for multi-concept format
  if (problem.isMultiConcept === true) {
    // Validate multi-concept structure
    if (!Array.isArray(problem.stages) || problem.stages.length < 1) {
      errors.push('Multi-concept problems must have at least one stage')
    } else {
      // Validate each stage
      problem.stages.forEach((stage, idx) => {
        if (!ALLOWED_TYPES.has(stage.type)) {
          errors.push(`Stage ${idx}: type "${stage.type}" is not supported`)
        }
        if (!isPlainObject(stage.variables)) {
          errors.push(`Stage ${idx}: variables must be an object`)
        }
      })

      // Validate transitions
      if (Array.isArray(problem.transitions)) {
        problem.transitions.forEach((transition, idx) => {
          if (!Number.isFinite(transition.from) || !Number.isFinite(transition.to)) {
            errors.push(`Transition ${idx}: from and to must be valid stage indices`)
          }
          if (transition.from >= problem.stages.length || transition.to >= problem.stages.length) {
            errors.push(`Transition ${idx}: stage indices out of range`)
          }
        })
      }
    }

    // Validate common fields
    if (typeof problem.domain !== 'string' || !ALLOWED_DOMAINS.has(problem.domain)) {
      errors.push('domain must be "physics" or "chemistry"')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  // Single-concept validation (existing logic)
  if (!ALLOWED_DOMAINS.has(problem.domain)) {
    errors.push('domain must be either "physics" or "chemistry"')
  }

  if (!ALLOWED_TYPES.has(problem.type)) {
    errors.push('type must be one of the supported problem types')
  }

  if (
    problem.domain &&
    problem.type &&
    DOMAIN_TYPES[problem.domain] &&
    !DOMAIN_TYPES[problem.domain].has(problem.type)
  ) {
    errors.push(`type "${problem.type}" does not match domain "${problem.domain}"`)
  }

  if (!isPlainObject(problem.variables)) {
    errors.push('variables must be an object')
  }

  if (!isPlainObject(problem.units)) {
    errors.push('units must be an object')
  }

  if (typeof problem.formula !== 'string' || problem.formula.trim().length === 0) {
    errors.push('formula must be a non-empty string')
  }

  if (
    !Array.isArray(problem.steps) ||
    problem.steps.length === 0 ||
    problem.steps.some(
      (step) => typeof step !== 'string' || step.trim().length === 0,
    )
  ) {
    errors.push('steps must be a non-empty array of strings')
  }

  if (!isPlainObject(problem.answer)) {
    errors.push('answer must be an object')
  } else {
    // Allow undefined/null and provide defaults
    if (problem.answer.value !== undefined && problem.answer.value !== null && !isFiniteNumber(problem.answer.value)) {
      errors.push('answer.value must be a finite number if provided')
    }

    if (
      problem.answer.unit !== undefined &&
      problem.answer.unit !== null &&
      (typeof problem.answer.unit !== 'string' || problem.answer.unit.trim().length === 0)
    ) {
      errors.push('answer.unit must be a non-empty string if provided')
    }

    if (
      problem.answer.explanation !== undefined &&
      problem.answer.explanation !== null &&
      (typeof problem.answer.explanation !== 'string' || problem.answer.explanation.trim().length === 0)
    ) {
      errors.push('answer.explanation must be a non-empty string if provided')
    }
  }

  if (isPlainObject(problem.variables) && isPlainObject(problem.units)) {
    for (const [key, value] of Object.entries(problem.variables)) {
      if (!isFiniteNumber(value)) {
        errors.push(`variables.${key} must be a finite number`)
        continue
      }

      if (!(key in problem.units)) {
        errors.push(`units.${key} is required`)
        continue
      }

      if (
        typeof problem.units[key] !== 'string' ||
        problem.units[key].trim().length === 0
      ) {
        errors.push(`units.${key} must be a non-empty string`)
        continue
      }

      validateVariableRange(key, value, problem.units[key], errors)
    }

    for (const [key, value] of Object.entries(problem.units)) {
      if (typeof value !== 'string' || value.trim().length === 0) {
        errors.push(`units.${key} must be a non-empty string`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function assertValidParsedProblem(problem) {
  const validation = validateParsedProblem(problem)

  if (!validation.isValid) {
    // Try to fix common issues
    const fixed = attemptProblemRecovery(problem)
    if (fixed) {
      const revalidation = validateParsedProblem(fixed)
      if (revalidation.isValid) {
        console.warn('Problem recovered from errors:', validation.errors)
        return fixed
      }
    }

    throw new Error(
      `Invalid parsed problem: ${validation.errors.join('; ')}`,
    )
  }

  return problem
}

function attemptProblemRecovery(problem) {
  if (!problem || typeof problem !== 'object') return null

  const recovered = { ...problem }

  // Fix missing/invalid answer
  if (!recovered.answer || typeof recovered.answer !== 'object') {
    recovered.answer = { value: null, unit: 'unknown' }
  }

  // Ensure answer has valid value if present
  if (recovered.answer.value !== undefined && recovered.answer.value !== null) {
    if (!isFiniteNumber(recovered.answer.value)) {
      recovered.answer.value = null
    }
  }

  // Ensure answer has valid unit
  if (!recovered.answer.unit || typeof recovered.answer.unit !== 'string' || recovered.answer.unit.trim().length === 0) {
    recovered.answer.unit = 'unknown'
  }

  // Fix variables
  if (!isPlainObject(recovered.variables)) {
    recovered.variables = {}
  }

  // Fix units
  if (!isPlainObject(recovered.units)) {
    recovered.units = {}
  }

  // Ensure all variables have units
  for (const key in recovered.variables) {
    if (!(key in recovered.units)) {
      recovered.units[key] = 'unknown'
    }
  }

  // Fix steps
  if (!Array.isArray(recovered.steps) || recovered.steps.length === 0) {
    recovered.steps = ['Problem parsed successfully']
  } else {
    recovered.steps = recovered.steps.filter(s => typeof s === 'string' && s.trim().length > 0)
    if (recovered.steps.length === 0) {
      recovered.steps = ['Problem parsed successfully']
    }
  }

  // Fix formula
  if (typeof recovered.formula !== 'string' || recovered.formula.trim().length === 0) {
    recovered.formula = 'Problem-specific calculation'
  }

  return recovered
}
