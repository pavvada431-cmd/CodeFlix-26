import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

app.post('/api/claude', async (req, res) => {
  try {
    const { prompt, max_tokens = 500 } = req.body

    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ 
        error: 'API key not configured',
        message: 'Set ANTHROPIC_API_KEY environment variable'
      })
    }

    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(response.status).json({ 
        error: 'Anthropic API error',
        details: errorText 
      })
    }

    const data = await response.json()
    res.json({ 
      completion: data.content?.[0]?.text || '',
      response: data.content?.[0]?.text || ''
    })
  } catch (error) {
    console.error('API proxy error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`API proxy running on port ${PORT}`)
})
