import { assertValidParsedProblem } from './validator'
import { normalizeProblemText } from './problemCleaner'

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
const AI_PROXY_URL = `${API_BASE_URL}/ai`

const VARIABLE_SCHEMAS = {
  inclined_plane: {
    required: ['mass', 'angle'],
    optional: ['friction', 'height'],
    units: { mass: 'kg', angle: 'degrees', friction: 'coefficient', height: 'm' },
  },
  projectile: {
    required: ['velocity', 'angle'],
    optional: ['height', 'gravity'],
    units: { velocity: 'm/s', angle: 'degrees', height: 'm', gravity: 'm/s²' },
  },
  pendulum: {
    required: ['length'],
    optional: ['mass', 'angle', 'gravity', 'damping'],
    units: { length: 'm', mass: 'kg', angle: 'degrees', gravity: 'm/s²', damping: 'coefficient' },
  },
  spring_mass: {
    required: ['k', 'mass'],
    optional: ['displacement', 'damping'],
    units: { k: 'N/m', mass: 'kg', displacement: 'm', damping: 'coefficient' },
  },
  circular_motion: {
    required: ['radius'],
    optional: ['mass', 'angularVelocity', 'frequency'],
    units: { radius: 'm', mass: 'kg', angularVelocity: 'rad/s', frequency: 'Hz' },
  },
  collisions: {
    required: ['mass1', 'mass2', 'velocity1', 'velocity2'],
    optional: ['elasticity'],
    units: { mass1: 'kg', mass2: 'kg', velocity1: 'm/s', velocity2: 'm/s', elasticity: 'coefficient' },
  },
  wave_motion: {
    required: ['amplitude', 'frequency'],
    optional: ['wavelength', 'waveType'],
    units: { amplitude: 'm', frequency: 'Hz', wavelength: 'm' },
    waveTypes: ['transverse', 'longitudinal', 'standing', 'interference'],
  },
  rotational_mechanics: {
    required: ['mass', 'radius'],
    optional: ['force', 'forcePosition', 'objectType'],
    units: { mass: 'kg', radius: 'm', force: 'N', forcePosition: 'degrees' },
    objectTypes: ['disk', 'rod', 'ring', 'sphere'],
  },
  orbital: {
    required: ['centralMass', 'orbitingMass', 'distance'],
    optional: ['velocity', 'orbitType'],
    units: { centralMass: 'kg', orbitingMass: 'kg', distance: 'm', velocity: 'm/s' },
    orbitTypes: ['circular', 'elliptical', 'escape'],
  },
  buoyancy: {
    required: ['fluidDensity', 'objectDensity', 'volume'],
    optional: ['objectShape', 'gravity'],
    units: { fluidDensity: 'kg/m³', objectDensity: 'kg/m³', volume: 'm³', gravity: 'm/s²' },
    objectShapes: ['sphere', 'cube', 'cylinder'],
  },
  ideal_gas: {
    required: ['temperature', 'volume'],
    optional: ['pressure', 'moles', 'numParticles'],
    units: { temperature: 'K', volume: 'm³', pressure: 'Pa', moles: 'mol' },
  },
  electric_field: {
    required: ['charge1'],
    optional: ['charge2', 'distance', 'chargeMagnitude'],
    units: { charge1: 'C', charge2: 'C', distance: 'm' },
  },
  optics_lens: {
    required: ['focalLength', 'objectDistance'],
    optional: ['lensType', 'objectHeight'],
    units: { focalLength: 'm', objectDistance: 'm', objectHeight: 'm' },
    lensTypes: ['convex', 'concave', 'plano-convex'],
  },
  optics_mirror: {
    required: ['focalLength', 'objectDistance'],
    optional: ['mirrorType', 'objectHeight'],
    units: { focalLength: 'm', objectDistance: 'm', objectHeight: 'm' },
    mirrorTypes: ['plane', 'concave', 'convex'],
  },
  radioactive_decay: {
    required: ['initialAtoms', 'halfLife'],
    optional: ['decayType'],
    units: { initialAtoms: 'count', halfLife: 's' },
    decayTypes: ['alpha', 'beta', 'gamma'],
  },
  electromagnetic: {
    required: ['charge', 'velocity', 'magneticField'],
    optional: ['electricField'],
    units: { charge: 'C', velocity: 'm/s', magneticField: 'T', electricField: 'N/C' },
  },
  titration: {
    required: ['acidConcentration', 'baseConcentration'],
    optional: ['volume', 'indicator'],
    units: { acidConcentration: 'M', baseConcentration: 'M', volume: 'mL' },
  },
  combustion: {
    required: ['fuel', 'oxygenAmount'],
    optional: ['enthalpy', 'temperature'],
    units: { fuel: 'mol', oxygenAmount: 'mol', enthalpy: 'kJ/mol' },
  },
  stoichiometry: {
    required: ['reactantAmount', 'molarMass'],
    optional: ['productAmount', 'yield'],
    units: { reactantAmount: 'mol', molarMass: 'g/mol', productAmount: 'mol' },
  },
  atomic_structure: {
    required: ['atomicNumber'],
    optional: ['mode', 'massNumber'],
    units: { atomicNumber: 'count', massNumber: 'count' },
    modes: ['bohr', 'quantum'],
  },
  gas_laws: {
    required: ['pressure', 'volume', 'temperature'],
    optional: ['moles', 'mode'],
    units: { pressure: 'atm', volume: 'L', temperature: 'K', moles: 'mol' },
    modes: ['boyle', 'charles', 'gay_lussac'],
  },
  chemical_bonding: {
    required: ['mode'],
    optional: ['molecule', 'electronegativityDifference'],
    units: { electronegativityDifference: 'ΔEN' },
    modes: ['ionic', 'covalent', 'metallic'],
  },
  organic_chemistry: {
    required: ['compound', 'reactionType'],
    optional: ['temperature', 'catalyst', 'product'],
    units: { temperature: '°C', catalyst: 'type' },
    compounds: ['methane', 'ethane', 'propane', 'butane', 'ethanol', 'acetic acid', 'benzene'],
    reactionTypes: ['combustion', 'substitution', 'addition', 'elimination', 'esterification', 'polymerization'],
  },
}

const MULTI_CONCEPT_PROMPT = `IMPORTANT: This problem may involve MULTIPLE physics concepts happening sequentially.

If the problem involves multiple stages or transitions (e.g., "slides down then becomes projectile"), return:
{
  domain: 'physics',
  isMultiConcept: true,
  stages: [
    {
      type: string,
      variables: { [key: string]: number | string },
      units: { [key: string]: string }
    }
  ],
  transitions: [
    {
      from: number,
      to: number,
      condition: "position_threshold" | "velocity_change" | "time_based",
      conditionValue: number
    }
  ],
  formula: string,
  steps: string[],
  answer: { value: number, unit: string, explanation: string }
}

If the problem is SINGLE concept only, return:
{
  domain: 'physics' | 'chemistry',
  isMultiConcept: false,
  type: string,
  variables: { [key: string]: number | string },
  units: { [key: string]: string },
  formula: string,
  steps: string[],
  answer: { value: number, unit: string, explanation: string }
}`

const BASE_SYSTEM_PROMPT = `You are a friendly science problem parser for students! Your job is to understand ANY problem description and turn it into structured data for a simulation.

You can understand problems written in many ways:
- Casual: "a ball thrown up at 20 meters per second"
- Technical: "projectile launched with v=20m/s at 45°"
- Mixed: "a 2kg mass slides down a ramp at 30 degrees"
- Partial: "calculate what happens with a pendulum"
- Short: "ball at 30m/s"
- Even typos and informal language!

${MULTI_CONCEPT_PROMPT}

AVAILABLE TYPES: ${Object.keys(VARIABLE_SCHEMAS).join(' | ')}

If you CANNOT determine the exact type but understand the concept, pick the closest match and fill in reasonable defaults.
Always provide a "steps" array explaining how to solve the problem.
Always provide an "answer" with the main result.

For MULTI-CONCEPT problems, identify the sequence of physics concepts and how they transition.
EXAMPLES of transitions:
- "slides down incline then becomes projectile" → inclined_plane → projectile (transition when velocity becomes horizontal)
- "ball bounces multiple times" → collisions repeated (transition on each bounce)
- "pendulum released then swings up ramp" → pendulum → inclined_plane

VARIABLE SCHEMAS (use these to extract correct variables):
${Object.entries(VARIABLE_SCHEMAS).map(([type, schema]) => `
${type}:
  - Required variables: ${schema.required.join(', ')}
  - Optional variables: ${schema.optional.join(', ')}
  - Units: ${Object.entries(schema.units).map(([k, v]) => `${k}=${v}`).join(', ')}
  ${schema.waveTypes ? `- waveTypes: ${schema.waveTypes.join(', ')}` : ''}
  ${schema.objectTypes ? `- objectTypes: ${schema.objectTypes.join(', ')}` : ''}
  ${schema.orbitTypes ? `- orbitTypes: ${schema.orbitTypes.join(', ')}` : ''}
  ${schema.objectShapes ? `- objectShapes: ${schema.objectShapes.join(', ')}` : ''}
  ${schema.lensTypes ? `- lensTypes: ${schema.lensTypes.join(', ')}` : ''}
  ${schema.decayTypes ? `- decayTypes: ${schema.decayTypes.join(', ')}` : ''}
`).join('\n')}

EXAMPLES:
- "A 2kg mass on a spring with k=100 N/m" → type: "spring_mass", variables: {mass: 2, k: 100}
- "Electron moving at 1e6 m/s in 0.5T magnetic field" → type: "electromagnetic", variables: {charge: 1.6e-19, velocity: 1e6, magneticField: 0.5}
- "Uranium-238 with half-life of 4.5 billion years" → type: "radioactive_decay", variables: {initialAtoms: 100, halfLife: 1.42e17}
- "Light passing through a convex lens with f=10cm, object at 30cm" → type: "optics_lens", variables: {focalLength: 0.1, objectDistance: 0.3, lensType: "convex"}`

const STRICT_SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}

Your response must be raw JSON only.
Do not wrap the object in markdown or code fences.
Use double quotes for every key and every string value.
Do not include comments, ellipses, or trailing commas.
Return exactly one JSON object that can be parsed by JSON.parse.`

const RETRY_PROMPTS = [
  'Return ONLY raw JSON, no markdown. Previous response was invalid JSON.',
  'Return ONLY raw JSON, no markdown, no text, no code fences. Just the JSON object.',
]

class InvalidJsonResponseError extends Error {
  constructor(message, rawResponse) {
    super(message)
    this.name = 'InvalidJsonResponseError'
    this.rawResponse = rawResponse
  }
}

class MaxRetriesExceededError extends Error {
  constructor(message) {
    super(message)
    this.name = 'MaxRetriesExceededError'
  }
}

function parseModelJson(rawText) {
  let cleanedText = rawText.trim()

  const markdownMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (markdownMatch) {
    cleanedText = markdownMatch[1].trim()
  }

  const jsonStart = cleanedText.indexOf('{')
  const jsonEnd = cleanedText.lastIndexOf('}')

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1)
  }

  try {
    return JSON.parse(cleanedText)
  } catch {
    throw new InvalidJsonResponseError(
      'Anthropic response was not valid JSON',
      rawText,
    )
  }
}

async function requestProblemParse(problemText, systemPrompt, provider) {
  const requestPayload = {
    provider,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: problemText.trim(),
      },
    ],
    options: {
      max_tokens: 1200,
      temperature: 0,
    },
  }

  console.log('Parser request payload:', requestPayload)

  let response
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutMs = 30000 // 30 seconds
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      response = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('API request timeout - the service took too long to respond')
    }
    throw new Error(`Failed to reach API: ${error?.message ?? 'Unknown network error'}`)
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error(`Invalid API response format (status ${response.status})`)
  }

  console.log('Parser raw API response:', payload)

  if (!response.ok) {
    const errorMessage = payload?.message ?? payload?.error ?? 'AI request failed'
    throw new Error(`API Error (${response.status}): ${errorMessage}`)
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('AI provider returned an invalid response payload')
  }

  // Extract content from nested response structure (backend returns { success, data, timestamp })
  const responseText = typeof payload?.data?.content === 'string' ? payload.data.content.trim() : 
                       typeof payload?.content === 'string' ? payload.content.trim() : ''
  if (!responseText) {
    throw new Error('AI provider returned an empty response')
  }

  return responseText
}

async function parseWithRetry(problemText, systemPrompt, provider, maxRetries = 2) {
  let lastError = null

  try {
    const rawResponse = await requestProblemParse(problemText, systemPrompt, provider)
    const parsedProblem = parseModelJson(rawResponse)
    console.log('Parser parsed JSON output:', parsedProblem)
    return assertValidParsedProblem(parsedProblem)
  } catch (error) {
    if (!(error instanceof InvalidJsonResponseError)) {
      throw error
    }
    lastError = error
  }

  for (let retry = 0; retry < maxRetries; retry++) {
    const retryPrompt = `${STRICT_SYSTEM_PROMPT}\n\n${RETRY_PROMPTS[retry] || RETRY_PROMPTS[RETRY_PROMPTS.length - 1]}`

    try {
      const rawResponse = await requestProblemParse(problemText, retryPrompt, provider)
      const parsedProblem = parseModelJson(rawResponse)
      console.log('Parser parsed JSON output:', parsedProblem)
      return assertValidParsedProblem(parsedProblem)
    } catch (error) {
      lastError = error
      if (!(error instanceof InvalidJsonResponseError)) {
        throw error
      }
    }
  }

  throw new MaxRetriesExceededError(
    `Failed to parse problem after ${maxRetries + 1} attempts. ${lastError?.message ?? 'Invalid JSON responses'}`
  )
}

export async function parseProblem(problemText, provider = 'openai') {
  if (typeof problemText !== 'string' || problemText.trim().length === 0) {
    throw new Error('problemText must be a non-empty string')
  }

  const normalized = normalizeProblemText(problemText)
  const cleanedText = normalized.cleaned
  
  console.log('Problem type detected:', normalized.detectedType)
  console.log('Variables extracted:', normalized.extractedVariables)
  console.log('Cleaned problem text:', cleanedText)

  return parseWithRetry(cleanedText, BASE_SYSTEM_PROMPT, provider, 2)
}

export { VARIABLE_SCHEMAS }
