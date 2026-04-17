// Rate limiting middleware for production-ready API
const requests = new Map()

export function createRateLimitMiddleware(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100, // requests per window
    message = 'Too many requests, please try again later',
  } = options

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown'
    const now = Date.now()

    if (!requests.has(key)) {
      requests.set(key, [])
    }

    const timestamps = requests.get(key).filter(timestamp => now - timestamp < windowMs)

    if (timestamps.length >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        message,
      })
      return
    }

    timestamps.push(now)
    requests.set(key, timestamps)

    // Cleanup old entries
    if (requests.size > 1000) {
      for (const [k, v] of requests.entries()) {
        const valid = v.filter(timestamp => now - timestamp < windowMs)
        if (valid.length === 0) {
          requests.delete(k)
        } else {
          requests.set(k, valid)
        }
      }
    }

    next()
  }
}
