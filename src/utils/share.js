import { PHYSICS_DEMOS, CHEMISTRY_DEMOS } from '../data/demos'

const ALL_DEMOS = [...PHYSICS_DEMOS, ...CHEMISTRY_DEMOS]

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

    return ALL_DEMOS.find(d => d.id === demoId) || null
  } catch {
    return null
  }
}

/* ============================================================
 * Rich scenario sharing (v1) — encodes a full simulation state
 * (type, variables, units, formula, prompt) into a URL hash.
 * Server-less, account-less. Lives at /app#s=<base64url>.
 * ============================================================ */

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(b64) {
  const norm = b64.replace(/-/g, '+').replace(/_/g, '/')
  const pad = norm.length % 4 ? '='.repeat(4 - (norm.length % 4)) : ''
  const bin = atob(norm + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export function buildSharePayload({ parsedData, currentVariables, problemText }) {
  if (!parsedData?.type) return null
  return {
    v: 1,
    t: parsedData.type,
    d: parsedData.domain || 'physics',
    vars: currentVariables || parsedData.variables || {},
    units: parsedData.units || {},
    formula: parsedData.formula,
    p: problemText || parsedData.problemText || '',
    label: parsedData.label,
  }
}

export function payloadToParsedData(payload) {
  if (!payload || payload.v !== 1) return null
  return {
    domain: payload.d || 'physics',
    type: payload.t,
    variables: payload.vars || {},
    units: payload.units || {},
    formula: payload.formula,
    label: payload.label,
    problemText: payload.p || '',
    steps: [],
    answer: null,
  }
}

export function encodeShare(payload) {
  return toBase64Url(JSON.stringify(payload))
}

export function decodeShare(token) {
  try {
    const parsed = JSON.parse(fromBase64Url(token))
    if (!parsed || parsed.v !== 1 || !parsed.t) return null
    return parsed
  } catch {
    return null
  }
}

export function readShareFromHash() {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash || ''
  const match = hash.match(/[#&]s=([^&]+)/)
  if (!match) return null
  return decodeShare(decodeURIComponent(match[1]))
}

export function writeShareToHash(token) {
  if (typeof window === 'undefined') return
  const next = `#s=${encodeURIComponent(token)}`
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`)
}

export function clearShareHash() {
  if (typeof window === 'undefined') return
  if (window.location.hash) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  }
}

export function buildShareUrl(payload) {
  const token = encodeShare(payload)
  const base = `${window.location.origin}/app`
  return `${base}#s=${encodeURIComponent(token)}`
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
