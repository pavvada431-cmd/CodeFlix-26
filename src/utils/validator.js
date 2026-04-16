const ALLOWED_DOMAINS = new Set(['physics', 'chemistry'])

const ALLOWED_TYPES = new Set([
  'inclined_plane',
  'projectile',
  'circuit',
  'pendulum',
  'titration',
  'combustion',
])

const DOMAIN_TYPES = {
  physics: new Set(['inclined_plane', 'projectile', 'circuit', 'pendulum']),
  chemistry: new Set(['titration', 'combustion']),
}

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

function validateAngle(key, value, unit, errors) {
  const normalizedUnit = normalizeUnit(unit)
  const upperBound = normalizedUnit.includes('rad') ? Math.PI / 2 : 90
  const unitLabel = normalizedUnit.includes('rad') ? 'radians' : 'degrees'

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

  if (/speed|velocity|acceleration|force|energy|work|power|current|voltage|charge/.test(normalizedKey)) {
    if (value === 0) {
      errors.push(`${key} should not be 0`)
    }
    return
  }

  if (/^v\d*$/.test(normalizedKey)) {
    if (value <= 0) {
      errors.push(`${key} must be greater than 0`)
    }
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
    if (!isFiniteNumber(problem.answer.value)) {
      errors.push('answer.value must be a finite number')
    }

    if (
      typeof problem.answer.unit !== 'string' ||
      problem.answer.unit.trim().length === 0
    ) {
      errors.push('answer.unit must be a non-empty string')
    }

    if (
      typeof problem.answer.explanation !== 'string' ||
      problem.answer.explanation.trim().length === 0
    ) {
      errors.push('answer.explanation must be a non-empty string')
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
    throw new Error(
      `Invalid parsed problem: ${validation.errors.join('; ')}`,
    )
  }

  return problem
}
