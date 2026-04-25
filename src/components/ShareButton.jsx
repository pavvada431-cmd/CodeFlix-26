import { useState, useCallback, useEffect } from 'react'
import { Link2, Check } from 'lucide-react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  buildSharePayload, encodeShare, buildShareUrl, copyToClipboard, writeShareToHash,
} from '../utils/share'

/**
 * Compact "Share" pill. Disabled until a simulation is loaded.
 * On click: encodes current state, copies URL to clipboard, drops a toast.
 *
 * Side effect: also stamps the current URL hash so the user can back-button
 * to this exact scenario.
 */
export default function ShareButton({ parsedData, currentVariables, problemText, className = '' }) {
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState(null)
  const disabled = !parsedData?.type

  // Keep the URL hash in sync as the user tweaks variables — a free
  // "always shareable" guarantee.
  useEffect(() => {
    if (disabled) return
    const payload = buildSharePayload({ parsedData, currentVariables, problemText })
    if (payload) writeShareToHash(encodeShare(payload))
  }, [disabled, parsedData, currentVariables, problemText])

  const handleClick = useCallback(async () => {
    if (disabled) return
    const payload = buildSharePayload({ parsedData, currentVariables, problemText })
    if (!payload) return
    const url = buildShareUrl(payload)
    const ok = await copyToClipboard(url)
    setCopied(true)
    setToast({
      kind: ok ? 'success' : 'error',
      message: ok ? 'Link copied — paste anywhere.' : 'Could not copy. Long-press the URL bar.',
      url,
    })
    setTimeout(() => setCopied(false), 1600)
    setTimeout(() => setToast(null), 3200)
  }, [disabled, parsedData, currentVariables, problemText])

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`btn-ghost ${className} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        aria-label="Share this scenario"
        title={disabled ? 'Run a simulation to share it' : 'Copy a shareable link'}
      >
        {copied ? <Check size={14} /> : <Link2 size={14} />}
        {copied ? 'Copied!' : 'Share'}
      </button>

      <AnimatePresence>
        {toast && (
          <Motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2"
          >
            <div className={`gradient-border max-w-md`}>
              <div className="flex items-center gap-3 rounded-[15px] bg-[color:color-mix(in_srgb,var(--color-bg)_94%,transparent)] px-4 py-3 backdrop-blur">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  toast.kind === 'success' ? 'bg-cyan-400/20 text-cyan-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {toast.kind === 'success' ? <Check size={14} /> : '!'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white">{toast.message}</div>
                  {toast.url && (
                    <div className="mt-0.5 truncate font-mono text-[11px] text-[var(--color-text-muted)]">
                      {toast.url.replace(/^https?:\/\//, '')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
