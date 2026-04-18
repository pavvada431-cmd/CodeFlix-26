const ENV = globalThis?.process?.env ?? {}
const DEFAULT_TIMEOUT_MS = 60000

const PROVIDERS = {
  openai: {
    model: 'gpt-4o',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
  },
  anthropic: {
    model: 'claude-sonnet-4-20250514',
    endpoint: 'https://api.anthropic.com/v1/messages',
    keyEnv: 'ANTHROPIC_API_KEY',
  },
  gemini: {
    model: 'gemini-1.5-flash',
    endpointBase: 'https://generativelanguage.googleapis.com/v1beta/models',
    keyEnv: 'GEMINI_API_KEY',
  },
  groq: {
    model: 'llama-3.3-70b-versatile',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    keyEnv: 'GROQ_API_KEY',
  },
  ollama: {
    model: 'llama3.2',
    endpointPath: '/api/chat',
  },
}

function hasAnyApiKey() {
  return Object.values(PROVIDERS).some(config => {
    if (config.keyEnv) return !!ENV[config.keyEnv]
    return false
  })
}

function createMockResponse(problemText) {
  const text = String(problemText).toLowerCase()
  
  let detectedType = 'projectile'
  let variables = {}
  
  if (text.includes('pendulum') || text.includes('swing')) {
    detectedType = 'pendulum'
    variables.length = 1.0
  } else if (text.includes('ramp') || text.includes('incline') || text.includes('slope')) {
    detectedType = 'inclined_plane'
    variables.mass = 10
    variables.angle = 30
  } else if (text.includes('spring') || text.includes('oscillat')) {
    detectedType = 'spring_mass'
    variables.mass = 2
    variables.k = 100
  } else if (text.includes('collision') || text.includes('collide') || text.includes('bounce')) {
    detectedType = 'collisions'
    variables.mass1 = 1
    variables.mass2 = 1
    variables.velocity1 = 5
    variables.velocity2 = 0
  } else if (text.includes('orbit') || text.includes('satellite') || text.includes('planet')) {
    detectedType = 'orbital'
    variables.centralMass = 1e24
    variables.orbitingMass = 1e20
    variables.distance = 1e8
  } else if (text.includes('wave') || text.includes('frequency') || text.includes('wavelength')) {
    detectedType = 'wave_motion'
    variables.amplitude = 1
    variables.frequency = 10
  } else if (text.includes('charge') || text.includes('electric')) {
    detectedType = 'electric_field'
    variables.charge1 = 1e-6
  } else if (text.includes('lens') || text.includes('mirror') || text.includes('focal')) {
    detectedType = text.includes('mirror') ? 'optics_mirror' : 'optics_lens'
    variables.focalLength = 0.1
    variables.objectDistance = 0.3
  } else if (text.includes('gas') || text.includes('temperature') || text.includes('pressure') || text.includes('pv=nrt')) {
    detectedType = 'ideal_gas'
    variables.temperature = 300
    variables.volume = 1
  } else if (text.includes('radioactive') || text.includes('decay') || text.includes('half-life')) {
    detectedType = 'radioactive_decay'
    variables.initialAtoms = 1000
    variables.halfLife = 1000
  } else if (text.includes('chemistry') || text.includes('molecule') || text.includes('bond')) {
    detectedType = 'chemical_bonding'
    variables.mode = 'covalent'
  } else {
    // default projectile
    variables.velocity = 20
    variables.angle = 45
  }
  
  return {
    domain: text.includes('chemi') ? 'chemistry' : 'physics',
    isMultiConcept: false,
    type: detectedType,
    variables,
    units: {},
    formula: 'Demo mode: Using local detection without live API',
    steps: ['Local detection mode active', 'Showing simpler analysis', 'Configure API keys for advanced parsing'],
    answer: {
      value: 0,
      unit: '',
      explanation: 'Mock response generated (API keys not configured). Run with real API for detailed analysis.'
    }
  }
}

function createProviderError(message, { status = 500, code = 'AI_PROVIDER_ERROR', provider, details } = {}) {
  const error = new Error(message)
  error.status = status
  error.code = code
  error.provider = provider
  error.details = details
  return error
}

function normalizeMessageContent(content) {
  if (typeof content === 'string') return content.trim()

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part.text === 'string') return part.text
        return ''
      })
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  if (content && typeof content === 'object' && typeof content.text === 'string') {
    return content.text.trim()
  }

  return ''
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw createProviderError('messages must be a non-empty array', {
      status: 400,
      code: 'INVALID_MESSAGES',
    })
  }

  const normalized = messages
    .map((message) => {
      const role = typeof message?.role === 'string' ? message.role.toLowerCase() : 'user'
      return {
        role,
        content: normalizeMessageContent(message?.content),
      }
    })
    .filter((message) => message.content.length > 0)

  if (normalized.length === 0) {
    throw createProviderError('messages must include at least one message with content', {
      status: 400,
      code: 'EMPTY_MESSAGES',
    })
  }

  return normalized
}

function splitSystemMessages(messages) {
  const systemMessages = messages.filter((message) => message.role === 'system')
  const conversation = messages.filter((message) => message.role !== 'system')
  return {
    systemPrompt: systemMessages.map((message) => message.content).join('\n\n').trim(),
    conversation,
  }
}

function normalizeRole(role) {
  if (role === 'assistant' || role === 'system') return role
  return 'user'
}

function clampTimeout(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS
  return Math.max(1000, Math.min(parsed, 120000))
}

async function requestJson(url, init, { provider, timeoutMs }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })

    const rawText = await response.text()
    let payload = null

    if (rawText) {
      try {
        payload = JSON.parse(rawText)
      } catch {
        payload = null
      }
    }

    if (!response.ok) {
      throw createProviderError(
        payload?.error?.message ??
          payload?.error ??
          payload?.message ??
          rawText ??
          `${provider} request failed`,
        {
          status: response.status,
          code: 'PROVIDER_HTTP_ERROR',
          provider,
          details: payload ?? rawText,
        },
      )
    }

    if (!payload) {
      throw createProviderError(`${provider} returned invalid JSON`, {
        status: 502,
        code: 'INVALID_PROVIDER_RESPONSE',
        provider,
        details: rawText,
      })
    }

    return payload
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createProviderError(`${provider} request timed out after ${timeoutMs}ms`, {
        status: 504,
        code: 'TIMEOUT',
        provider,
      })
    }
    if (error?.status) throw error
    throw createProviderError(error?.message ?? `${provider} request failed`, {
      status: 502,
      code: 'NETWORK_ERROR',
      provider,
      details: error,
    })
  } finally {
    clearTimeout(timer)
  }
}

function extractOpenAIContent(payload) {
  const rawContent = payload?.choices?.[0]?.message?.content
  if (typeof rawContent === 'string') return rawContent.trim()
  if (Array.isArray(rawContent)) {
    return rawContent
      .map((part) => {
        if (typeof part === 'string') return part
        if (typeof part?.text === 'string') return part.text
        return ''
      })
      .join('\n')
      .trim()
  }
  return ''
}

async function callOpenAICompatible({ provider, messages, options, timeoutMs }) {
  const config = PROVIDERS[provider]
  const apiKey = ENV[config.keyEnv]
  if (!apiKey) {
    throw createProviderError(`Missing ${config.keyEnv}`, {
      status: 500,
      code: 'MISSING_API_KEY',
      provider,
    })
  }

  const payload = await requestJson(
    config.endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model ?? config.model,
        messages: messages.map((message) => ({
          role: normalizeRole(message.role),
          content: message.content,
        })),
        temperature: options.temperature,
        max_tokens: options.max_tokens ?? options.maxTokens,
      }),
    },
    { provider, timeoutMs },
  )

  const content = extractOpenAIContent(payload)
  console.log(`[AI:${provider}] response`, {
    model: payload.model ?? options.model ?? config.model,
    tokensUsed: payload?.usage?.total_tokens,
    hasContent: Boolean(content),
  })

  return {
    content,
    provider,
    model: payload.model ?? options.model ?? config.model,
    tokensUsed: Number.isFinite(payload?.usage?.total_tokens) ? payload.usage.total_tokens : undefined,
  }
}

async function callAnthropic({ messages, options, timeoutMs }) {
  const provider = 'anthropic'
  const config = PROVIDERS.anthropic
  const apiKey = ENV[config.keyEnv]
  if (!apiKey) {
    throw createProviderError(`Missing ${config.keyEnv}`, {
      status: 500,
      code: 'MISSING_API_KEY',
      provider,
    })
  }

  const { systemPrompt, conversation } = splitSystemMessages(messages)
  const anthropicMessages = conversation.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: [{ type: 'text', text: message.content }],
  }))

  if (anthropicMessages.length === 0) {
    throw createProviderError('Anthropic requires at least one non-system message', {
      status: 400,
      code: 'INVALID_MESSAGES',
      provider,
    })
  }

  const payload = await requestJson(
    config.endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ENV.ANTHROPIC_VERSION ?? '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model ?? config.model,
        max_tokens: options.max_tokens ?? options.maxTokens ?? 1200,
        temperature: options.temperature ?? 0,
        messages: anthropicMessages,
        ...(systemPrompt ? { system: systemPrompt } : {}),
      }),
    },
    { provider, timeoutMs },
  )

  const content = (payload.content ?? [])
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim()
  const tokensUsed = (payload?.usage?.input_tokens ?? 0) + (payload?.usage?.output_tokens ?? 0)

  console.log('[AI:anthropic] response', {
    model: payload.model ?? options.model ?? config.model,
    tokensUsed,
    hasContent: Boolean(content),
  })

  return {
    content,
    provider,
    model: payload.model ?? options.model ?? config.model,
    tokensUsed: Number.isFinite(tokensUsed) ? tokensUsed : undefined,
  }
}

async function callGemini({ messages, options, timeoutMs }) {
  const provider = 'gemini'
  const config = PROVIDERS.gemini
  const apiKey = ENV[config.keyEnv] || ENV.GOOGLE_API_KEY
  if (!apiKey) {
    throw createProviderError('Missing GEMINI_API_KEY', {
      status: 500,
      code: 'MISSING_API_KEY',
      provider,
    })
  }

  const { systemPrompt, conversation } = splitSystemMessages(messages)
  if (conversation.length === 0) {
    throw createProviderError('Gemini requires at least one non-system message', {
      status: 400,
      code: 'INVALID_MESSAGES',
      provider,
    })
  }

  const model = options.model ?? config.model
  const payload = await requestJson(
    `${config.endpointBase}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: conversation.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: options.temperature ?? 0,
          maxOutputTokens: options.max_tokens ?? options.maxTokens ?? 1200,
        },
        ...(systemPrompt
          ? {
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
            }
          : {}),
      }),
    },
    { provider, timeoutMs },
  )

  const content = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim()

  console.log('[AI:gemini] response', {
    model,
    tokensUsed: payload?.usageMetadata?.totalTokenCount,
    hasContent: Boolean(content),
  })

  return {
    content,
    provider,
    model,
    tokensUsed: Number.isFinite(payload?.usageMetadata?.totalTokenCount)
      ? payload.usageMetadata.totalTokenCount
      : undefined,
  }
}

async function callOllama({ messages, options, timeoutMs }) {
  const provider = 'ollama'
  const config = PROVIDERS.ollama
  const baseUrl = String(options.ollamaBaseUrl || options.baseUrl || ENV.OLLAMA_BASE_URL || 'http://localhost:11434')
    .replace(/\/+$/, '')
  const endpoint = `${baseUrl}${config.endpointPath}`
  const model = options.model ?? ENV.OLLAMA_MODEL ?? config.model
  const apiKey = options.apiKey || ENV.OLLAMA_API_KEY

  const payload = await requestJson(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: messages.map((message) => ({
          role: normalizeRole(message.role),
          content: message.content,
        })),
        options: {
          temperature: options.temperature,
          num_predict: options.max_tokens ?? options.maxTokens,
        },
      }),
    },
    { provider, timeoutMs },
  )

  const content = typeof payload?.message?.content === 'string' ? payload.message.content.trim() : ''
  const tokensUsed = (payload?.prompt_eval_count ?? 0) + (payload?.eval_count ?? 0)

  console.log('[AI:ollama] response', {
    endpoint,
    model: payload?.model ?? model,
    tokensUsed,
    hasContent: Boolean(content),
  })

  return {
    content,
    provider,
    model: payload?.model ?? model,
    tokensUsed: Number.isFinite(tokensUsed) ? tokensUsed : undefined,
  }
}

export async function callAI({ provider = 'openai', messages, options = {} }) {
  const selectedProvider = String(provider || '').toLowerCase().trim() || 'openai'
  const normalizedMessages = normalizeMessages(messages)
  const timeoutMs = clampTimeout(options.timeoutMs ?? options.timeout)

  if (!Object.hasOwn(PROVIDERS, selectedProvider)) {
    throw createProviderError(`Unsupported provider: ${provider}`, {
      status: 400,
      code: 'INVALID_PROVIDER',
      provider: selectedProvider,
      details: {
        supportedProviders: Object.keys(PROVIDERS),
      },
    })
  }

  try {
    switch (selectedProvider) {
      case 'openai':
      case 'groq':
        return await callOpenAICompatible({
          provider: selectedProvider,
          messages: normalizedMessages,
          options,
          timeoutMs,
        })
      case 'anthropic':
        return await callAnthropic({
          messages: normalizedMessages,
          options,
          timeoutMs,
        })
      case 'gemini':
        return await callGemini({
          messages: normalizedMessages,
          options,
          timeoutMs,
        })
      case 'ollama':
        return await callOllama({
          messages: normalizedMessages,
          options,
          timeoutMs,
        })
      default:
        throw createProviderError(`Unsupported provider: ${provider}`, {
          status: 400,
          code: 'INVALID_PROVIDER',
          provider: selectedProvider,
        })
    }
  } catch (error) {
    if (error?.code === 'MISSING_API_KEY' && !hasAnyApiKey()) {
      const problemText = normalizedMessages
        .map(m => m.content)
        .join('\n')
      
      const mockData = createMockResponse(problemText)
      
      console.warn(`[AI:fallback] No API keys configured. Returning local detection mock response for: ${problemText.substring(0, 50)}...`)
      
      return {
        content: JSON.stringify(mockData),
        provider: 'fallback-local-detection',
        model: 'local-pattern-matcher',
        tokensUsed: undefined,
      }
    }
    
    throw error
  }
}

export default callAI
