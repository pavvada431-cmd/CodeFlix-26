import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorFallback({ error, resetError, isDark = true }) {
  const bgClass = isDark ? 'bg-[#111827]' : 'bg-white'
  const borderClass = isDark ? 'border-[#1f2937]' : 'border-gray-200'
  const textClass = isDark ? 'text-[#e5e7eb]' : 'text-gray-900'
  const subtextClass = isDark ? 'text-[#9ca3af]' : 'text-gray-600'
  const buttonClass = isDark
    ? 'bg-[#0d1a28] border-[#1f2937] text-[#e5e7eb] hover:bg-[#1f2937]'
    : 'bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200'

  const errorMessage = error?.message || 'Something went wrong'
  const isNetworkError = errorMessage.includes('Network') || errorMessage.includes('fetch')
  const isAPIError = errorMessage.includes('API') || errorMessage.includes('400') || errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('502')

  let userFriendlyMessage = 'An unexpected error occurred'
  let suggestion = 'Try refreshing the page or contacting support if the problem persists.'

  if (isNetworkError) {
    userFriendlyMessage = 'Network Connection Error'
    suggestion = 'Check your internet connection and try again.'
  } else if (isAPIError) {
    userFriendlyMessage = 'API Server Error'
    suggestion = 'The physics engine is temporarily unavailable. Please try again in a moment.'
  } else if (errorMessage.includes('undefined') || errorMessage.includes('null')) {
    userFriendlyMessage = 'Application Error'
    suggestion = 'An internal error occurred. Try refreshing the page.'
  }

  return (
    <div className={`flex h-full flex-col items-center justify-center space-y-6 px-6 py-12 ${bgClass}`}>
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500/20 bg-red-500/10">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>

      {/* Message */}
      <div className="max-w-md text-center space-y-2">
        <h2 className={`text-2xl font-bold ${textClass}`}>
          {userFriendlyMessage}
        </h2>
        <p className={subtextClass}>
          {suggestion}
        </p>
      </div>

      {/* Technical Details (if in development) */}
      {process.env.NODE_ENV === 'development' && (
        <details className={`w-full max-w-md rounded-lg border ${borderClass} ${bgClass} p-4`}>
          <summary className={`cursor-pointer font-semibold ${textClass}`}>
            Technical Details
          </summary>
          <pre className={`mt-2 overflow-auto rounded bg-opacity-50 p-2 text-xs ${subtextClass}`}>
            {errorMessage}
          </pre>
        </details>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={resetError}
          className={`inline-flex items-center justify-center space-x-2 rounded-lg border px-6 py-2 font-semibold transition-colors ${buttonClass}`}
        >
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-gradient-to-r from-[#22d3ee] to-[#06b6d4] px-6 py-2 font-semibold text-[#0b0f17] hover:shadow-lg hover:shadow-[#22d3ee]/25 transition-all"
        >
          Go Home
        </button>
      </div>

      {/* Help */}
      <a
        href="https://github.com/pavvada431-cmd/CodeFlix-26/issues"
        target="_blank"
        rel="noopener noreferrer"
        className={`text-sm ${subtextClass} hover:text-[#22d3ee] transition-colors`}
      >
        Report this issue on GitHub
      </a>
    </div>
  )
}
