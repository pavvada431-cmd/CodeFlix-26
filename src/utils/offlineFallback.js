import { detectProblemType, extractVariables } from './problemCleaner'
import { PHYSICS_DEMOS, CHEMISTRY_DEMOS } from '../data/demos'

/**
 * Generate a parsedData object using offline local parsing.
 * Does not require any API calls — ideal for presentations with unreliable WiFi.
 */
export function getOfflineParsedData(problemText) {
  try {
    // Detect problem type using local regex patterns
    const detectedType = detectProblemType(problemText)
    if (!detectedType) {
      return null
    }

    // Extract variables using local regex extraction
    const extracted = extractVariables(problemText)
    
    // Find a demo that matches the detected type
    const allDemos = [...PHYSICS_DEMOS, ...CHEMISTRY_DEMOS]
    const template = allDemos.find(
      (demo) => demo.type === detectedType || demo.type?.toLowerCase() === detectedType?.toLowerCase()
    )

    if (!template) {
      return null
    }

    // Clone the template and substitute extracted variables
    const parsedData = {
      ...template,
      type: detectedType,
      domain: template.domain,
      variables: {
        ...template.variables,
        ...extracted, // Extracted values override template defaults
      },
      // Mark this as a demo/offline solution
      isOfflineMode: true,
      originalInput: problemText,
    }

    return parsedData
  } catch (error) {
    console.warn('Offline fallback parsing failed:', error)
    return null
  }
}

/**
 * Check if offline mode is enabled via environment variable
 */
export function isOfflineModeEnabled() {
  return import.meta.env.VITE_OFFLINE_FALLBACK === 'true'
}
