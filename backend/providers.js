const ENV = globalThis?.process?.env ?? {}

const PROVIDER_CONFIG = {
  anthropic: {
    model: 'claude-sonnet-4-20250514',
    keyEnv: 'ANTHROPIC_API_KEY',
    endpoint: 'https://api.anthropic.com/v1/messages',
  },
  openai: {
    model: 'gpt-4o',
    keyEnv: 'OPENAI_API_KEY',
    endpoint: 'https://api.openai.com/v1/chat/completions',
  },
  gemini: {
    model: 'gemini-1.5-flash',
    keyEnv: 'GEMINI_API_KEY',
  },
  groq: {
    model: 'llama-3.3-70b-versatile',
    keyEnv: 'GROQ_API_KEY',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
  },
}

function normalizeMessageContent(content) {
  if (typeof content === 'string') {
    return content.trim()
  }

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
    throw new Error('messages must be a non-empty array')
  }

  const normalized = messages
    .map((message) => {
      const role = typeof message?.role === 'string' ? message.role.toLowerCase() : 'user'
      const content = normalizeMessageContent(message?.content)
      return {
        role,
        content,
      }
    })
    .filter((message) => message.content.length > 0)

  if (normalized.length === 0) {
    throw new Error('messages must include at least one message with content')
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

async function requestJson(url, init, provider) {
  const response = await fetch(url, init)
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
    const errorMessage =
      payload?.error?.message ??
      payload?.error ??
      payload?.message ??
      rawText ??
      `${provider} request failed`
    const error = new Error(`${provider} API error (${response.status}): ${errorMessage}`)
    error.status = response.status
    error.provider = provider
    error.details = payload ?? rawText
    throw error
  }

  if (!payload) {
    throw new Error(`${provider} API returned an invalid JSON response`)
  }

  return payload
}

function getProviderKey(provider) {
  if (provider === 'gemini') {
    return ENV.GEMINI_API_KEY || ENV.GOOGLE_API_KEY
  }

  const config = PROVIDER_CONFIG[provider]
  return ENV[config.keyEnv]
}

function getTokensUsed(payload, usagePath) {
  const value = usagePath(payload)
  return Number.isFinite(value) ? value : 0
}

async function callAnthropic(messages, options = {}) {
  const apiKey = getProviderKey('anthropic')
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY')
  }

  const { systemPrompt, conversation } = splitSystemMessages(messages)
  const anthropicMessages = conversation.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: [{ type: 'text', text: message.content }],
  }))

  if (anthropicMessages.length === 0) {
    throw new Error('Anthropic requires at least one non-system message')
  }

  const body = {
    model: PROVIDER_CONFIG.anthropic.model,
    max_tokens: options.max_tokens ?? options.maxTokens ?? 1200,
    temperature: options.temperature ?? 0,
    messages: anthropicMessages,
  }

  if (systemPrompt) {
    body.system = systemPrompt
  }

  const payload = await requestJson(
    PROVIDER_CONFIG.anthropic.endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ENV.ANTHROPIC_VERSION ?? '2023-06-01',
      },
      body: JSON.stringify(body),
    },
    'anthropic',
  )

  const content = (payload.content ?? [])
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim()

  return {
    content,
    provider: 'anthropic',
    model: payload.model ?? PROVIDER_CONFIG.anthropic.model,
    tokensUsed: getTokensUsed(payload, (data) => (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0)),
  }
}

async function callOpenAICompatible(provider, messages, options = {}) {
  const config = PROVIDER_CONFIG[provider]
  const apiKey = getProviderKey(provider)

  if (!apiKey) {
    throw new Error(`Missing ${config.keyEnv}`)
  }

  const openAIMessages = messages.map((message) => ({
    role: ['system', 'assistant', 'user'].includes(message.role) ? message.role : 'user',
    content: message.content,
  }))

  const payload = await requestJson(
    config.endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: openAIMessages,
        max_tokens: options.max_tokens ?? options.maxTokens,
        temperature: options.temperature,
      }),
    },
    provider,
  )

  const choice = payload.choices?.[0]?.message?.content
  const content = Array.isArray(choice)
    ? choice
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('\n')
      .trim()
    : typeof choice === 'string'
      ? choice.trim()
      : ''

  return {
    content,
    provider,
    model: payload.model ?? config.model,
    tokensUsed: getTokensUsed(payload, (data) => data.usage?.total_tokens),
  }
}

async function callGemini(messages, options = {}) {
  const apiKey = getProviderKey('gemini')
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY')
  }

  const { systemPrompt, conversation } = splitSystemMessages(messages)
  const contents = conversation.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }))

  if (contents.length === 0) {
    throw new Error('Gemini requires at least one non-system message')
  }

  const body = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0,
      maxOutputTokens: options.max_tokens ?? options.maxTokens ?? 1200,
    },
  }

  if (systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt }],
    }
  }

  const payload = await requestJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${PROVIDER_CONFIG.gemini.model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    'gemini',
  )

  const content = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim()

  return {
    content,
    provider: 'gemini',
    model: PROVIDER_CONFIG.gemini.model,
    tokensUsed: getTokensUsed(payload, (data) => data.usageMetadata?.totalTokenCount),
  }
}

export async function callAI(provider, messages, options = {}) {
  const normalizedProvider = typeof provider === 'string' ? provider.toLowerCase() : ''
  const selectedProvider = normalizedProvider || 'anthropic'
  const normalizedMessages = normalizeMessages(messages)

  if (!Object.hasOwn(PROVIDER_CONFIG, selectedProvider)) {
    throw new Error(`Unsupported provider: ${provider}`)
  }

  switch (selectedProvider) {
    case 'anthropic':
      return callAnthropic(normalizedMessages, options)
    case 'openai':
      return callOpenAICompatible('openai', normalizedMessages, options)
    case 'gemini':
      return callGemini(normalizedMessages, options)
    case 'groq':
      return callOpenAICompatible('groq', normalizedMessages, options)
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

export default callAI
