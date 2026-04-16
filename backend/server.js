import express from 'express'
import cors from 'cors'
import { callAI } from './providers.js'

const app = express()
app.use(cors())
app.use(express.json())

app.post('/api/ai', async (req, res) => {
  console.log('Incoming request:', req.body)

  try {
    const {
      provider = 'anthropic',
      messages,
      options = {},
    } = req.body ?? {}

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'messages must be a non-empty array',
      })
    }

    const response = await callAI(provider, messages, options)
    console.log('AI response:', response?.data ?? response)
    return res.json(response)
  } catch (error) {
    console.error('API ERROR:', error?.response?.data || error?.message)
    const status = Number.isInteger(error?.status) ? error.status : 500
    return res.status(status).json({
      error: 'AI request failed',
      message: error?.message ?? 'Unknown error',
      provider: error?.provider,
      details: error?.details,
    })
  }
})

const PORT = globalThis?.process?.env?.PORT || 4000
app.listen(PORT, () => {
  console.log(`API proxy running on port ${PORT}`)
})
