import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, X, Sparkles, ArrowUp, Bot, User, Calculator, Sigma,
} from 'lucide-react'

/**
 * Sim-as-Conversation drawer.
 *
 * The simulation IS the answer. This drawer is the *narration* —
 * AI reasoning streams in step-by-step, user can ask follow-ups
 * ("what if Mars?"), each follow-up is dispatched back to the page
 * which re-solves with the morphed prompt.
 *
 * Stateless about routing — it derives its messages from `parsedData`
 * and `currentVariables` and emits user-typed follow-ups via
 * the `onAsk` callback.
 */
export default function ConversationDrawer({ parsedData, currentVariables, onAsk, isLoading }) {
  /* Tri-state: 'auto' = follow parsedData, 'open' = forced open, 'closed' = forced closed. */
  const [intent, setIntent] = useState('auto')
  const [input, setInput] = useState('')
  const [seenLen, setSeenLen] = useState(0)
  const [streamedSteps, setStreamedSteps] = useState(0)
  const lastParsedKeyRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const open = intent === 'open' || (intent === 'auto' && !!parsedData)

  /* Compose the message list from parsedData each render. */
  const messages = useMemo(() => {
    if (!parsedData) return []
    const list = []
    if (parsedData.problemText) {
      list.push({ id: 'q', role: 'user', text: parsedData.problemText })
    }
    if (parsedData.formula) {
      list.push({ id: 'f', role: 'ai', kind: 'formula', text: parsedData.formula })
    }
    const steps = parsedData.steps || []
    steps.slice(0, streamedSteps).forEach((s, i) => {
      list.push({ id: `s-${i}`, role: 'ai', kind: 'step', text: s, index: i + 1 })
    })
    if (streamedSteps >= steps.length && parsedData.answer) {
      const a = parsedData.answer
      const txt = typeof a === 'string'
        ? a
        : `${a.value ?? ''}${a.unit ? ` ${a.unit}` : ''}${a.explanation ? ` — ${a.explanation}` : ''}`
      list.push({ id: 'a', role: 'ai', kind: 'answer', text: txt })
    }
    return list
  }, [parsedData, streamedSteps])

  /* Stream steps in: when parsedData identity changes, replay the steps.
     The state resets here are an intentional sync to the parsedData prop —
     this is the canonical use-case for useEffect, but the strict React lint
     flags it as "set-state-in-effect". */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!parsedData) {
      setStreamedSteps(0)
      lastParsedKeyRef.current = null
      return
    }
    const key = `${parsedData.type}|${parsedData.problemText || ''}|${(parsedData.steps || []).length}`
    if (key === lastParsedKeyRef.current) return
    lastParsedKeyRef.current = key
    setStreamedSteps(0)
    const steps = parsedData.steps || []
    let i = 0
    const tick = () => {
      i += 1
      setStreamedSteps(i)
      if (i < steps.length) {
        timer = setTimeout(tick, 480)
      }
    }
    let timer = setTimeout(tick, 320)
    return () => clearTimeout(timer)
  }, [parsedData])
  /* eslint-enable react-hooks/set-state-in-effect */

  /* Unread badge — computed from messages.length vs last-seen. */
  const unread = !open ? Math.max(0, messages.length - seenLen) : 0
  const handleToggle = useCallback(() => {
    setIntent(open ? 'closed' : 'open')
    if (!open) setSeenLen(messages.length)
  }, [open, messages.length])

  /* Auto-scroll to newest message. */
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, open])

  const handleSubmit = useCallback((e) => {
    e?.preventDefault?.()
    const trimmed = input.trim()
    if (!trimmed) return
    onAsk?.(trimmed, { parsedData, currentVariables })
    setInput('')
  }, [input, onAsk, parsedData, currentVariables])

  /* Pre-built "what-if" suggestion chips — adapt to the active sim type. */
  const suggestions = useMemo(() => {
    if (!parsedData) return []
    if (parsedData.type === 'generative') {
      return ['Add more balls', 'Make gravity weaker', 'Add a spring', 'Try Mars gravity']
    }
    return ['What if Mars?', 'Double the velocity', 'No friction', 'Build a custom scene']
  }, [parsedData])

  return (
    <>
      {/* Floating toggle */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={open ? 'Close conversation' : 'Open conversation'}
        className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-full border border-cyan-300/40 bg-gradient-to-br from-cyan-500 via-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_36px_-8px_rgba(34,211,238,0.55)] transition hover:scale-105"
      >
        {open ? <X size={16} /> : <MessageSquare size={16} />}
        {open ? 'Close' : 'Ask the AI'}
        {!open && unread > 0 && (
          <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-cyan-700">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <Motion.aside
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed bottom-24 right-6 z-[55] w-[min(92vw,420px)]"
          >
            <div className="gradient-border overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
              <div className="flex h-[min(72vh,640px)] flex-col rounded-[15px] bg-[color:color-mix(in_srgb,var(--color-bg)_94%,transparent)] backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-white">
                    <Sparkles size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white">SeeTheScience AI</div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">
                      {isLoading ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
                          thinking…
                        </span>
                      ) : parsedData ? (
                        <span>narrating · {parsedData.type?.replace(/_/g, ' ')}</span>
                      ) : (
                        <span>idle · ask anything</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center text-center text-sm text-[var(--color-text-muted)]">
                      <Bot size={28} className="mb-3 text-cyan-300" />
                      <p className="max-w-[28ch]">Run a simulation, then ask follow-ups here. The sim IS the answer; this is the narration.</p>
                    </div>
                  )}

                  {messages.map((m) => <Message key={m.id} message={m} />)}

                  {isLoading && (
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <Bot size={14} className="text-cyan-300" />
                      <span className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fuchsia-300" />
                      </span>
                    </div>
                  )}
                </div>

                {/* Suggestion chips */}
                {parsedData && !isLoading && (
                  <div className="flex flex-wrap gap-1.5 border-t border-[var(--color-border)] px-3 pt-2.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onAsk?.(s, { parsedData, currentVariables })}
                        className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-2.5 py-1 text-[11px] text-[var(--color-text-muted)] backdrop-blur transition hover:border-cyan-400/40 hover:text-cyan-200"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Composer */}
                <form onSubmit={handleSubmit} className="border-t border-[var(--color-border)] p-3">
                  <div className="flex items-end gap-2 rounded-xl border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_70%,transparent)] px-3 py-2 focus-within:border-cyan-400/50">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={parsedData ? 'Ask a follow-up… ("what if Mars?")' : 'Run a simulation first…'}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none"
                      disabled={!parsedData || isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading || !parsedData}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 text-white transition disabled:opacity-40"
                      aria-label="Send"
                    >
                      <ArrowUp size={14} />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

function Message({ message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] gap-2">
          <div className="rounded-2xl rounded-br-sm bg-gradient-to-br from-cyan-500/30 to-violet-500/20 px-3 py-2 text-sm text-white">
            {message.text}
          </div>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">
            <User size={12} />
          </div>
        </div>
      </div>
    )
  }
  // AI message
  const Icon = message.kind === 'formula' ? Sigma : message.kind === 'answer' ? Calculator : Bot
  const tone =
    message.kind === 'formula' ? 'border-violet-400/30 bg-violet-500/10 font-mono text-violet-100' :
    message.kind === 'answer'  ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100' :
                                 'border-[var(--color-border)] bg-[var(--color-surface)]/60 text-[var(--color-text)]'
  return (
    <Motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex gap-2"
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-white">
        <Icon size={12} />
      </div>
      <div className={`max-w-[85%] rounded-2xl rounded-bl-sm border px-3 py-2 text-sm ${tone}`}>
        {message.kind === 'step' && (
          <span className="mr-1.5 inline-block rounded-md bg-black/20 px-1.5 py-0.5 font-mono text-[10px] text-cyan-200">
            {String(message.index).padStart(2, '0')}
          </span>
        )}
        {message.text}
      </div>
    </Motion.div>
  )
}
