import { assertValidParsedProblem } from './validator'

const ANTHROPIC_API_URL =
  import.meta.env.VITE_ANTHROPIC_API_URL ?? 'https://api.anthropic.com/v1/messages'

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const ANTHROPIC_VERSION =
  import.meta.env.VITE_ANTHROPIC_VERSION ?? '2023-06-01'

const MODEL_NAME = 'claude-sonnet-4-20250514'

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
}

const BASE_SYSTEM_PROMPT = `You are a physics problem parser. Extract all variables and identify the problem type from the user's input. Return ONLY a valid JSON object with no markdown, no explanation. The JSON must follow this schema:
{
  domain: 'physics' | 'chemistry',
  type: string,  // Must be one of: ${Object.keys(VARIABLE_SCHEMAS).join(' | ')},
  variables: { [key: string]: number | string },
  units: { [key: string]: string },
  formula: string,
  steps: string[],
  answer: { value: number, unit: string, explanation: string }
}

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

function getResponseText(payload) {
  const content = Array.isArray(payload?.content) ? payload.content : []
  const text = content
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim()

  if (!text) {
    throw new Error('Anthropic returned an empty response')
  }

  return text
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

async function requestProblemParse(problemText, systemPrompt) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': ANTHROPIC_VERSION,
      'x-api-key': ANTHROPIC_API_KEY,
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      max_tokens: 1200,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: problemText.trim(),
            },
          ],
        },
      ],
    }),
  })

  const payload = await response.json()

  if (!response.ok) {
    const errorMessage = payload?.error?.message ?? 'Anthropic request failed'
    throw new Error(`API Error (${response.status}): ${errorMessage}`)
  }

  return getResponseText(payload)
}

async function parseWithRetry(problemText, systemPrompt, maxRetries = 2) {
  let lastError = null

  try {
    const rawResponse = await requestProblemParse(problemText, systemPrompt)
    const parsedProblem = parseModelJson(rawResponse)
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
      const rawResponse = await requestProblemParse(problemText, retryPrompt)
      const parsedProblem = parseModelJson(rawResponse)
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

export async function parseProblem(problemText) {
  if (typeof problemText !== 'string' || problemText.trim().length === 0) {
    throw new Error('problemText must be a non-empty string')
  }

  if (!ANTHROPIC_API_KEY) {
    throw new Error('Missing VITE_ANTHROPIC_API_KEY - API key not configured')
  }

  return parseWithRetry(problemText, BASE_SYSTEM_PROMPT, 2)
}

export { VARIABLE_SCHEMAS }
