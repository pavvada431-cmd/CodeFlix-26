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

class InvalidJsonResponseError extends Error {
  constructor(message, rawResponse) {
    super(message)
    this.name = 'InvalidJsonResponseError'
    this.rawResponse = rawResponse
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
  try {
    return JSON.parse(rawText)
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
    throw new Error(
      payload?.error?.message ?? 'Anthropic request failed',
    )
  }

  return getResponseText(payload)
}

export async function parseProblem(problemText) {
  if (typeof problemText !== 'string' || problemText.trim().length === 0) {
    throw new Error('problemText must be a non-empty string')
  }

  if (!ANTHROPIC_API_KEY) {
    throw new Error('Missing VITE_ANTHROPIC_API_KEY')
  }

  try {
    const rawResponse = await requestProblemParse(problemText, BASE_SYSTEM_PROMPT)
    const parsedProblem = parseModelJson(rawResponse)
    return assertValidParsedProblem(parsedProblem)
  } catch (error) {
    if (!(error instanceof InvalidJsonResponseError)) {
      throw error
    }
  }

  const retryPrompt = `${STRICT_SYSTEM_PROMPT}

The previous reply was not valid JSON. Return corrected JSON for this same problem text.`

  const retryResponse = await requestProblemParse(problemText, retryPrompt)
  const parsedProblem = parseModelJson(retryResponse)
  return assertValidParsedProblem(parsedProblem)
}
