import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { parseProblem } from '../utils/problemParser'
import { sanitizeInput } from '../utils/validator'
import Button from './ui/Button'
import Badge from './ui/Badge'
import Panel from './ui/Panel'
import { Select, Textarea } from './ui/Input'
import { ParsingSteps } from './LoadingStates'

const MAX_INPUT_LENGTH = 1000

const AI_PROVIDERS = [
  { value: 'anthropic', label: 'Claude (Detailed - Recommended)' },
  { value: 'openai', label: 'GPT-4o (Fast & Smart)' },
  { value: 'gemini', label: 'Gemini (Free)' },
  { value: 'groq', label: 'Groq (Very Fast)' },
  { value: 'ollama', label: 'Ollama (Local AI)' },
]

const PHYSICS_EXAMPLES = [
  { label: '🎯 Projectile', text: 'A ball is launched at 20 m/s at 45 degrees. Find range.' },
  { label: '⏱️ Pendulum', text: 'A pendulum has length 2m. Find its period.' },
  { label: '📐 Inclined Plane', text: 'A 10kg block slides down a 30° frictionless ramp.' },
  { label: '🔄 Spring', text: 'A 2kg mass on a spring with k=100 N/m oscillates.' },
  { label: '💥 Collision', text: 'Two balls collide elastically. Ball 1 at 5 m/s hits Ball 2 at rest.' },
]

const CHEMISTRY_EXAMPLES = [
  { label: '🧪 Methane', text: 'Show me the methane molecule and explain its structure.' },
  { label: '⚗️ Reaction', text: 'Balance: CH4 + O2 → CO2 + H2O' },
  { label: '⚖️ Stoichiometry', text: 'How many moles in 36g of water?' },
  { label: '🧫 Titration', text: '0.1M HCl is titrated with 0.1M NaOH. Find equivalence point.' },
]

function ExampleRow({ title, examples, onSelect, disabled, mobile = false }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
        {title}
      </p>
      <div className={mobile ? 'no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1' : 'flex flex-wrap gap-2'}>
        {examples.map((example) => (
          <button
            key={example.label}
            type="button"
            className={`rounded-lg border px-3 py-1.5 text-xs transition-all hover:scale-[1.02] ${
              mobile ? 'shrink-0 whitespace-nowrap' : ''
            }`}
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
            }}
            onClick={() => onSelect(example.text)}
            disabled={disabled}
          >
            {example.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ProblemInput({
  onSolved,
  isLoading = false,
  provider = 'openai',
  onProviderChange,
  onApiStatusChange,
  mobile = false,
  domain = 'physics',
}) {
  const textareaRef = useRef(null)
  const [problemText, setProblemText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [connected, setConnected] = useState(true)
  const [showProviderSelector, setShowProviderSelector] = useState(!mobile)
  const isBusy = isLoading || loading

  const sanitizedText = useMemo(() => sanitizeInput(problemText), [problemText])
  const charCount = problemText.length
  const selectedProviderLabel = AI_PROVIDERS.find((item) => item.value === provider)?.label || provider

  const handleExampleClick = (text) => {
    setProblemText(text)
    setError('')
    setSuccess(false)
    textareaRef.current?.focus()
  }

  const submitProblemText = useCallback(async (rawText) => {
    const trimmedProblem = sanitizeInput(rawText).trim()
    setLoading(true)
    setError('')
    setSuccess(false)
    setConnected(true)
    onApiStatusChange?.(true)

    try {
      const parsedData = await parseProblem(trimmedProblem, provider)
      const hasMultiConceptStages =
        parsedData?.isMultiConcept === true &&
        Array.isArray(parsedData?.stages) &&
        parsedData.stages.length > 0

      if (!parsedData?.type && !hasMultiConceptStages) {
        throw new Error('Could not understand the problem. Try rephrasing!')
      }

      setConnected(true)
      setSuccess(true)
      onApiStatusChange?.(true)
      onSolved?.(parsedData)
    } catch (solveError) {
      setConnected(false)
      
      let errorMsg = solveError?.message || 'Something went wrong. Please try again!'
      
      if (errorMsg.includes('Failed to reach API') || 
          errorMsg.includes('network error') ||
          errorMsg.includes('ECONNREFUSED')) {
        errorMsg = "⚠️ Backend not running. Start it with `npm run dev:api` or check your API keys in .env"
      }
      
      setError(errorMsg)
      setSuccess(false)
      onApiStatusChange?.(false)
    } finally {
      setLoading(false)
    }
  }, [onApiStatusChange, onSolved, provider])

  const handleSolve = async () => {
    const trimmedProblem = sanitizedText.trim()
    if (!trimmedProblem) {
      setError('Please describe a physics or chemistry problem first!')
      setSuccess(false)
      textareaRef.current?.focus()
      return
    }

    await submitProblemText(trimmedProblem)
  }

  useEffect(() => {
    const handler = (event) => {
      const text = event?.detail?.text
      const requestedDomain = event?.detail?.domain
      if (typeof text !== 'string' || text.trim().length === 0) return
      if (requestedDomain && requestedDomain !== 'both' && requestedDomain !== domain) return

      const cleaned = sanitizeInput(text).slice(0, MAX_INPUT_LENGTH)
      setProblemText(cleaned)
      submitProblemText(cleaned)
    }

    window.addEventListener('codeflix:run-example', handler)
    return () => window.removeEventListener('codeflix:run-example', handler)
  }, [domain, submitProblemText])

  const content = (
    <div className={`space-y-4 ${mobile ? 'pb-20' : ''}`}>
      <div className="space-y-2">
        {mobile ? (
          <>
            <button
              type="button"
              onClick={() => setShowProviderSelector((previous) => !previous)}
              data-tour="ai-provider"
              className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              <span>🤖 AI Provider: {selectedProviderLabel}</span>
              {showProviderSelector ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showProviderSelector ? (
              <Select
                id="ai-provider-mobile"
                data-tour="ai-provider"
                value={provider}
                disabled={isBusy}
                onChange={(event) => onProviderChange?.(event.target.value)}
              >
                {AI_PROVIDERS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            ) : null}
          </>
        ) : (
          <>
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              🤖 AI Model
            </label>
            <Select
              id="ai-provider"
              data-tour="ai-provider"
              value={provider}
              disabled={isBusy}
              onChange={(event) => onProviderChange?.(event.target.value)}
            >
              {AI_PROVIDERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            ✏️ Your Problem
          </label>
          <button
            type="button"
            onClick={() => {
              const allExamples = [...PHYSICS_EXAMPLES, ...CHEMISTRY_EXAMPLES]
              const random = allExamples[Math.floor(Math.random() * allExamples.length)]
              handleExampleClick(random.text)
              setTimeout(() => handleSolve(), 300)
            }}
            disabled={isBusy}
            className="text-xs px-2 py-1 rounded-lg border transition opacity-75 hover:opacity-100"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
            }}
          >
            🎲 Random
          </button>
        </div>
        <div className="relative">
          <Textarea
            id={mobile ? 'problem-input-mobile' : 'problem-input'}
            data-tour="problem-input"
            ref={textareaRef}
            value={problemText}
            onChange={(event) => {
              let value = sanitizeInput(event.target.value)
              if (value.length > MAX_INPUT_LENGTH) value = value.slice(0, MAX_INPUT_LENGTH)
              setProblemText(value)
              if (error) setError('')
              setSuccess(false)
            }}
            placeholder="Example: A ball is thrown at 20 m/s at 45°. What is its range?&#10;&#10;You can also ask: Show methane molecule, balance an equation, etc."
            disabled={isBusy}
            maxLength={MAX_INPUT_LENGTH}
            className={mobile ? 'min-h-[40vh] text-base' : 'min-h-40'}
          />
          {/* Character count progress ring */}
          {!mobile && (
            <svg
              className="absolute bottom-2 right-2"
              width="40"
              height="40"
              viewBox="0 0 40 40"
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="2"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke={charCount > MAX_INPUT_LENGTH * 0.9 ? '#ef4444' : 'var(--color-accent)'}
                strokeWidth="2"
                strokeDasharray={`${(charCount / MAX_INPUT_LENGTH) * 100.53} 100.53`}
                strokeLinecap="round"
                style={{ transition: 'stroke 0.2s ease' }}
              />
              <text
                x="20"
                y="20"
                textAnchor="middle"
                dy="0.3em"
                fontSize="10"
                fill="var(--color-text-muted)"
                style={{ transform: 'rotate(90deg)', transformOrigin: '20px 20px' }}
              >
                {Math.round((charCount / MAX_INPUT_LENGTH) * 100)}%
              </text>
            </svg>
          )}
        </div>
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-dim)' }}>
          <span>{charCount}/{MAX_INPUT_LENGTH} characters</span>
          <span>{mobile ? 'Use plain language' : 'Include values like "20 m/s" or "45°"'}</span>
        </div>
      </div>

      <ExampleRow
        title="💡 Physics Examples"
        examples={PHYSICS_EXAMPLES}
        onSelect={handleExampleClick}
        disabled={isBusy}
        mobile={mobile}
      />

      <ExampleRow
        title="🧪 Chemistry Examples"
        examples={CHEMISTRY_EXAMPLES}
        onSelect={handleExampleClick}
        disabled={isBusy}
        mobile={mobile}
      />

      {mobile ? (
        <div
          className="fixed inset-x-0 z-30 border-t bg-[var(--color-surface)]/95 px-4 pt-3 backdrop-blur-md"
          style={{
            borderColor: 'var(--color-border)',
            bottom: 'calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom))',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          <Button
            variant="primary"
            data-tour="solve-button"
            className="h-12 w-full text-base"
            onClick={handleSolve}
            disabled={isBusy || !sanitizedText.trim()}
          >
            {loading ? '⏳ Analyzing...' : '🚀 Solve'}
          </Button>
        </div>
      ) : (
        <Button
          variant="primary"
          data-tour="solve-button"
          className="w-full py-3 text-base"
          onClick={handleSolve}
          disabled={isBusy || !sanitizedText.trim()}
        >
          {loading ? '⏳ Analyzing...' : '🚀 Solve & Simulate'}
        </Button>
      )}

      {loading ? <ParsingSteps isLoading={loading} /> : null}

      {success ? (
        <div className="flex items-center gap-2 rounded-lg p-3" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
          <span style={{ color: '#22c55e' }}>✅</span>
          <span className="text-sm" style={{ color: '#22c55e' }}>Success! Check the simulation tab.</span>
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: 'rgba(239, 68, 68, 0.3)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
          }}
        >
          <p className="text-sm font-medium" style={{ color: '#ef4444' }}>❌ Oops!</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>{error}</p>
          <div className="mt-3 space-y-1 text-xs" style={{ color: 'var(--color-text-dim)' }}>
            <p>💡 Tips:</p>
            <p>• Include numbers with units (like "20 m/s")</p>
            <p>• Be specific about what you want to find</p>
            <p>• Click an example above to see how it works</p>
          </div>
        </div>
      ) : null}
    </div>
  )

  if (mobile) {
    return (
      <div data-tour="problem-input">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Describe Your Problem</h2>
          <Badge variant={connected ? 'success' : 'error'}>
            {connected ? 'Online' : 'Offline'}
          </Badge>
        </div>
        {content}
      </div>
    )
  }

  return (
    <Panel
      title="✨ Describe Your Problem"
      subtitle="Type naturally or click an example!"
      className="relative"
      action={<Badge variant={connected ? 'success' : 'error'}>
        {connected ? '🟢 Online' : '🔴 Offline'}
      </Badge>}
    >
      {content}
    </Panel>
  )
}
