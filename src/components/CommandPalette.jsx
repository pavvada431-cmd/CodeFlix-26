import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  Search, Zap, FlaskConical, Wrench, Sparkles, BookOpen,
  Sun, Moon, Settings, Home, ArrowRight, CornerDownLeft, Shuffle, Atom,
} from 'lucide-react'
import { PHYSICS_DEMOS, CHEMISTRY_DEMOS } from '../data/demos'
import { GENERATIVE_PRESETS } from '../simulations/genericSimPresets'
import { useTheme } from '../contexts/useTheme'
import { getRecents, recordRecent, subscribe as subscribeRecents } from '../utils/recents'
import { Clock, Wand2 } from 'lucide-react'

/* Lightweight subsequence-fuzzy scorer — no deps, fast for ~50 items */
function fuzzyScore(query, target) {
  if (!query) return 1
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  if (t.includes(q)) return 1000 - (t.indexOf(q)) // prefer earlier matches
  let qi = 0, score = 0, lastIdx = -1
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += 1
      if (lastIdx >= 0 && i === lastIdx + 1) score += 4 // streak bonus
      lastIdx = i
      qi++
    }
  }
  return qi === q.length ? score : 0
}

const ACTION_KIND = {
  NAV: 'nav',
  DEMO: 'demo',
  ACTION: 'action',
}

/* Dispatched globally so /app can hear it across route boundaries */
const setPage = (page) => window.dispatchEvent(new CustomEvent('sts:set-page', { detail: { page } }))

export default function CommandPalette({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && <PaletteShell onClose={onClose} />}
    </AnimatePresence>
  )
}

function PaletteShell({ onClose }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [recents, setRecents] = useState(() => getRecents())
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => subscribeRecents(setRecents), [])

  /* ---------- Build the command corpus ---------- */
  const allItems = useMemo(() => {
    const navItems = [
      { kind: ACTION_KIND.NAV, id: 'nav-home',       label: 'Home',           hint: 'Landing page',         icon: Home,         run: () => navigate('/') },
      { kind: ACTION_KIND.NAV, id: 'nav-physics',    label: 'Physics',        hint: 'Mechanics, EM, optics', icon: Zap,         run: () => { navigate('/app'); setPage('physics') } },
      { kind: ACTION_KIND.NAV, id: 'nav-chemistry',  label: 'Chemistry',      hint: 'Reactions, gas laws',  icon: FlaskConical, run: () => { navigate('/app'); setPage('chemistry') } },
      { kind: ACTION_KIND.NAV, id: 'nav-builder',    label: 'Builder',        hint: 'Sandbox playground',   icon: Wrench,       run: () => { navigate('/app'); setPage('builder') } },
      { kind: ACTION_KIND.NAV, id: 'nav-formulas',   label: 'Formula Sheet',  hint: 'Quick reference',      icon: BookOpen,     run: () => navigate('/formulas') },
    ]

    const actions = [
      { kind: ACTION_KIND.ACTION, id: 'act-random',  label: 'Surprise me',    hint: 'Random demo problem',  icon: Shuffle,
        run: () => { window.dispatchEvent(new CustomEvent('sts:random-demo')) } },
      { kind: ACTION_KIND.ACTION, id: 'act-theme',   label: theme.name === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        hint: 'Toggle appearance', icon: theme.name === 'dark' ? Sun : Moon, run: () => toggleTheme() },
      { kind: ACTION_KIND.ACTION, id: 'act-settings',label: 'Open Settings',  hint: 'API providers, prefs', icon: Settings,
        run: () => window.dispatchEvent(new CustomEvent('sts:open-settings')) },
    ]

    const demos = [
      ...PHYSICS_DEMOS.map(d => ({
        kind: ACTION_KIND.DEMO, id: `demo-${d.id}`, label: d.label,
        hint: d.problemText, icon: Atom, domain: 'physics',
        problemText: d.problemText, parsedData: d.parsedData,
      })),
      ...CHEMISTRY_DEMOS.map(d => ({
        kind: ACTION_KIND.DEMO, id: `demo-${d.id}`, label: d.label,
        hint: d.problemText, icon: FlaskConical, domain: 'chemistry',
        problemText: d.problemText, parsedData: d.parsedData,
      })),
    ]

    const generative = GENERATIVE_PRESETS.map((p) => ({
      kind: ACTION_KIND.DEMO,
      id: `gen-${p.id}`,
      label: p.label,
      hint: p.description,
      icon: Wand2,
      domain: 'physics',
      problemText: p.description,
      // The router expects parsedData with { type, variables: { spec } }
      parsedData: {
        domain: 'physics',
        type: 'generative',
        variables: { spec: p.spec },
        units: {},
        steps: ['AI generated this scenario from a JSON spec.', 'Bodies + constraints are simulated by Matter.js in real time.'],
        formula: 'F = Σ (mass · acceleration)',
        problemText: p.description,
        label: p.label,
        answer: { value: '∞', unit: 'specs', explanation: 'Any spec runs without bespoke code.' },
      },
    }))

    const recentItems = recents.map((r) => ({
      kind: ACTION_KIND.DEMO,
      id: `recent-${r.id}`,
      label: r.label,
      hint: r.problemText,
      icon: Clock,
      domain: r.domain,
      problemText: r.problemText,
      parsedData: r.parsedData,
    }))

    return { navItems, actions, demos, recentItems, generative }
  }, [navigate, theme.name, toggleTheme, recents])

  /* ---------- Filter + group ---------- */
  const groups = useMemo(() => {
    const score = (item) => Math.max(
      fuzzyScore(query, item.label),
      fuzzyScore(query, item.hint || ''),
    )
    const sift = (arr) => arr
      .map(i => ({ i, s: score(i) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ i }) => i)

    const groupsList = []
    if (!query && allItems.recentItems.length > 0) {
      groupsList.push({ title: 'Recent', items: allItems.recentItems })
    } else if (query) {
      const recentMatches = sift(allItems.recentItems)
      if (recentMatches.length > 0) groupsList.push({ title: 'Recent', items: recentMatches })
    }
    groupsList.push({ title: 'Jump to',          items: sift(allItems.navItems) })
    groupsList.push({ title: 'AI · Generative',  items: sift(allItems.generative) })
    groupsList.push({ title: 'Actions',          items: sift(allItems.actions) })
    groupsList.push({ title: 'Simulations',      items: sift(allItems.demos).slice(0, 12) })
    return groupsList.filter(g => g.items.length > 0)
  }, [allItems, query])

  const flat = useMemo(() => groups.flatMap(g => g.items), [groups])

  /* ---------- Focus on mount ---------- */
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  /* Active index resets via the onChange handler below. */

  /* ---------- Run an item ---------- */
  const runItem = useCallback((item) => {
    if (!item) return
    if (item.kind === ACTION_KIND.DEMO) {
      navigate('/app')
      setPage(item.domain)
      recordRecent({
        id: item.id.replace(/^demo-|^recent-/, ''),
        label: item.label,
        problemText: item.problemText,
        domain: item.domain,
        parsedData: item.parsedData,
      })
      // Defer so the App route mounts and event listeners are attached
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sts:run-example', {
          detail: { text: item.problemText, domain: item.domain, parsedData: item.parsedData },
        }))
      }, 80)
    } else {
      item.run?.()
    }
    onClose()
  }, [navigate, onClose])

  /* ---------- Keyboard nav ---------- */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((a) => Math.min(flat.length - 1, a + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((a) => Math.max(0, a - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        runItem(flat[active])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flat, active, runItem, onClose])

  /* ---------- Auto-scroll active into view ---------- */
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cmd-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  /* ---------- Index helper for grouped flat list ---------- */
  let runningIdx = -1
  const nextIdx = () => { runningIdx += 1; return runningIdx }

  return (
    <Motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh] backdrop-blur-md"
      style={{ backgroundColor: 'rgba(2, 6, 14, 0.55)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
          <Motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="gradient-border w-full max-w-2xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-[15px] bg-[color:color-mix(in_srgb,var(--color-bg)_92%,transparent)] backdrop-blur-xl">
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3.5">
                <Search size={18} className="shrink-0 text-cyan-300" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActive(0) }}
                  placeholder="Search simulations, jump to a page, run a command…"
                  className="flex-1 bg-transparent text-base text-white placeholder:text-[var(--color-text-muted)] focus:outline-none"
                  autoComplete="off"
                  spellCheck="false"
                />
                <span className="kbd hidden md:inline-flex">esc</span>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
                {flat.length === 0 && (
                  <div className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]">
                    <Sparkles size={20} className="mx-auto mb-3 text-cyan-300" />
                    No matches. Try <span className="kbd">projectile</span>, <span className="kbd">collision</span>, or <span className="kbd">titration</span>.
                  </div>
                )}

                {groups.map((group) => (
                  <div key={group.title} className="px-2 pb-2">
                    <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                      {group.title}
                    </div>
                    {group.items.map((item) => {
                      const idx = nextIdx()
                      const isActive = idx === active
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          data-cmd-idx={idx}
                          type="button"
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => runItem(item)}
                          className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                            isActive
                              ? 'bg-gradient-to-r from-cyan-500/20 via-violet-500/10 to-transparent text-white'
                              : 'text-[var(--color-text)] hover:bg-white/5'
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                            isActive
                              ? 'border-cyan-300/50 bg-cyan-400/15 text-cyan-200'
                              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                          }`}>
                            <Icon size={15} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{item.label}</span>
                            {item.hint && (
                              <span className="block truncate text-xs text-[var(--color-text-muted)]">{item.hint}</span>
                            )}
                          </span>
                          {isActive && (
                            <span className="hidden shrink-0 items-center gap-1 text-xs text-cyan-200 md:flex">
                              <CornerDownLeft size={12} />
                              open
                            </span>
                          )}
                          {!isActive && item.kind === ACTION_KIND.DEMO && (
                            <ArrowRight size={14} className="shrink-0 text-[var(--color-text-dim)] opacity-0 transition-opacity group-hover:opacity-100" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface)_50%,transparent)] px-4 py-2.5 text-[11px] text-[var(--color-text-muted)]">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={11} className="text-cyan-300" />
                  <span>SeeTheScience · Command</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden items-center gap-1 sm:flex">
                    <span className="kbd">↑</span><span className="kbd">↓</span> navigate
                  </span>
                  <span className="hidden items-center gap-1 sm:flex">
                    <span className="kbd">↵</span> select
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="kbd">esc</span> close
                  </span>
                </div>
              </div>
        </div>
      </Motion.div>
    </Motion.div>
  )
}
