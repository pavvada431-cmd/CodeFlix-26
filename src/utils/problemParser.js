import { assertValidParsedProblem } from './validator'

const ANTHROPIC_API_URL =
  import.meta.env.VITE_ANTHROPIC_API_URL ?? 'https://api.anthropic.com/v1/messages'

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const ANTHROPIC_VERSION =
  import.meta.env.VITE_ANTHROPIC_VERSION ?? '2023-06-01'

const MODEL_NAME = 'claude-sonnet-4-20250514'

const BASE_SYSTEM_PROMPT = `You are a physics and chemistry problem parser. Extract all variables and identify the problem type from the user's input. Return ONLY a valid JSON object with no markdown, no explanation. The JSON must follow this schema:
{
  domain: 'physics' | 'chemistry',
  type: 'inclined_plane' | 'projectile' | 'circuit' | 'pendulum' | 'titration' | 'combustion',
  variables: { [key: string]: number },
  units: { [key: string]: string },
  formula: string,
  steps: string[],
  answer: { value: number, unit: string, explanation: string }
}`

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
