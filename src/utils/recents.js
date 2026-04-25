/**
 * Recent simulations — persisted in localStorage.
 * One module, no deps, zero new infra.
 */

const KEY = 'sts.recents.v1'
const LIMIT = 8

function read() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(list) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)))
    window.dispatchEvent(new CustomEvent('sts:recents-changed'))
  } catch { /* quota / private mode */ }
}

export function getRecents() {
  return read()
}

/**
 * Record a run.
 * @param {{ id?: string, label: string, problemText?: string, domain?: string, parsedData?: object, params?: object }} entry
 */
export function recordRecent(entry) {
  if (!entry || !entry.label) return
  const id = entry.id || `r-${Date.now().toString(36)}`
  const next = {
    id,
    label: entry.label,
    problemText: entry.problemText || '',
    domain: entry.domain || 'physics',
    parsedData: entry.parsedData || null,
    params: entry.params || null,
    at: Date.now(),
  }
  const list = read().filter((r) => r.id !== id && r.label !== next.label)
  list.unshift(next)
  write(list)
}

export function clearRecents() {
  write([])
}

/** React-friendly subscriber (use with useSyncExternalStore or useEffect+useState). */
export function subscribe(callback) {
  const handler = () => callback(read())
  window.addEventListener('sts:recents-changed', handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('sts:recents-changed', handler)
    window.removeEventListener('storage', handler)
  }
}
