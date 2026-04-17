import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import { callAI } from './providers.js'
import { logger } from './logger.js'
import { createRateLimitMiddleware } from './rateLimit.js'

// Load environment variables from .env file
dotenv.config()

const app = express()
const NODE_ENV = process.env.NODE_ENV || 'development'
const PORT = process.env.PORT || 4000

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['POST', 'GET', 'OPTIONS'],
  maxAge: 86400,
}))

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ limit: '10kb', extended: true }))

// Rate limiting
app.use(createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'Too many API requests. Please try again later.',
}))

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    })
  })
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  })
})

// Main AI API endpoint
app.post('/api/ai', async (req, res) => {
  try {
    const {
      provider = 'openai',
      messages,
      options = {},
    } = req.body ?? {}

    logger.debug('AI request received', { provider, messageCount: messages?.length })

    // Validation
    if (!Array.isArray(messages) || messages.length === 0) {
      logger.warn('Invalid AI request - empty messages', { provider })
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        code: 'EMPTY_MESSAGES',
        message: 'messages must be a non-empty array',
      })
    }

    if (typeof provider !== 'string' || !provider.match(/^[a-z]+$/)) {
      logger.warn('Invalid provider', { provider })
      return res.status(400).json({
        success: false,
        error: 'Invalid provider',
        code: 'INVALID_PROVIDER',
        message: 'provider must be a valid identifier',
      })
    }

    // Call AI
    const response = await callAI({ provider, messages, options })
    
    logger.info('AI response successful', {
      provider,
      model: response.model,
      tokensUsed: response.tokensUsed,
    })

    return res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500
    const errorCode = error?.code ?? 'AI_REQUEST_FAILED'
    
    logger.error('AI request failed', {
      status,
      code: errorCode,
      message: error?.message,
      provider: error?.provider ?? req.body?.provider,
      details: NODE_ENV === 'development' ? error?.details : undefined,
    })

    return res.status(status).json({
      success: false,
      error: 'AI request failed',
      code: errorCode,
      message: error?.message ?? 'Unknown error',
      provider: error?.provider ?? req.body?.provider,
      timestamp: new Date().toISOString(),
    })
  }
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    code: 'NOT_FOUND',
    path: req.path,
  })
})

// Global error handler
app.use((err, req, res) => {
  logger.error('Unhandled error', {
    message: err?.message,
    stack: NODE_ENV === 'development' ? err?.stack : undefined,
  })

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: NODE_ENV === 'development' ? err?.message : 'An error occurred',
    timestamp: new Date().toISOString(),
  })
})

// Start server with proper shutdown handling
const server = app.listen(PORT, () => {
  logger.info(`Server started`, {
    port: PORT,
    environment: NODE_ENV,
  })
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason: String(reason),
    promise: String(promise),
  })
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    message: error?.message,
    stack: error?.stack,
  })
  process.exit(1)
})

export default app
