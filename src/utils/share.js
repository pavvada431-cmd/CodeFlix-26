import { DEMO_PROBLEMS } from '../data/demos'

export function encodeProblemToURL(problemText) {
  try {
    const encoded = btoa(encodeURIComponent(problemText))
    const url = new URL(window.location.href)
    url.searchParams.set('problem', encoded)
    return url.toString()
  } catch {
    return null
  }
}

export function decodeProblemFromURL() {
  try {
    const url = new URL(window.location.href)
    const encoded = url.searchParams.get('problem')
    if (!encoded) return null

    const decoded = decodeURIComponent(atob(encoded))
    return decoded
  } catch {
    return null
  }
}

export function encodeDemoToURL(demoId) {
  const url = new URL(window.location.href)
  url.searchParams.set('demo', demoId)
  return url.toString()
}

export function decodeDemoFromURL() {
  try {
    const url = new URL(window.location.href)
    const demoId = url.searchParams.get('demo')
    if (!demoId) return null

    return DEMO_PROBLEMS.find(d => d.id === demoId) || null
  } catch {
    return null
  }
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    } catch {
      document.body.removeChild(textarea)
      return false
    }
  }
}
