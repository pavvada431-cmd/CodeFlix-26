import axios from 'axios'

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

// Create axios instance with production-ready configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor for error handling
api.interceptors.response.use(
  response => {
    // Validate response structure
    if (response.data && typeof response.data === 'object') {
      return response
    }
    throw new Error('Invalid API response format')
  },
  error => {
    // Enhanced error information
    const enhancedError = {
      message: error.message,
      status: error.response?.status,
      code: error.code,
      endpoint: error.config?.url,
      method: error.config?.method,
    }

    // Log errors in development
    if (import.meta.env.DEV) {
      console.error('[API Error]', enhancedError)
    }

    return Promise.reject(enhancedError)
  }
)

// Retry logic for failed requests
export async function apiCall(method, url, data = null, retries = 3) {
  let lastError = null

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const config = {
        method,
        url,
        ...(data && { data }),
      }
      const response = await api(config)
      return response.data
    } catch (error) {
      lastError = error
      
      // Don't retry on client errors (4xx)
      if (error.status >= 400 && error.status < 500) {
        throw error
      }

      // Wait before retrying (exponential backoff)
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }

  throw lastError
}

export default api
