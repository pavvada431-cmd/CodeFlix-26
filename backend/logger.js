// Production-ready logging utility with proper formatting and levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

const NODE_ENV = process.env.NODE_ENV || 'development'
const LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? (NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG)

function formatTimestamp() {
  return new Date().toISOString()
}

function formatLog(level, message, data = {}) {
  return {
    timestamp: formatTimestamp(),
    level,
    message,
    environment: NODE_ENV,
    ...data,
  }
}

function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVEL
}

export const logger = {
  debug: (message, data) => {
    if (shouldLog('DEBUG')) {
      console.log(JSON.stringify(formatLog('DEBUG', message, data)))
    }
  },
  info: (message, data) => {
    if (shouldLog('INFO')) {
      console.log(JSON.stringify(formatLog('INFO', message, data)))
    }
  },
  warn: (message, data) => {
    if (shouldLog('WARN')) {
      console.warn(JSON.stringify(formatLog('WARN', message, data)))
    }
  },
  error: (message, data) => {
    if (shouldLog('ERROR')) {
      console.error(JSON.stringify(formatLog('ERROR', message, data)))
    }
  },
}
