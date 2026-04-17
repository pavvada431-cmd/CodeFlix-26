import { useMemo, useRef, useState } from 'react'
import { parseProblem } from '../utils/problemParser'
import { sanitizeInput } from '../utils/validator'
import Button from './ui/Button'
import Badge from './ui/Badge'
import Panel from './ui/Panel'
import { Select, Textarea } from './ui/Input'
import { ParsingSteps } from './LoadingStates'

const MAX_INPUT_LENGTH = 500

const AI_PROVIDERS = [
  { value: 'openai', label: 'GPT-4o (Fast & Smart)' },
  { value: 'anthropic', label: 'Claude (Detailed)' },
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

export default function ProblemInput({
  onSolved,
  isLoading = false,
  provider = 'openai',
  onProviderChange,
  onApiStatusChange,
}) {
  const textareaRef = useRef(null)
  const [problemText, setProblemText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [connected, setConnected] = useState(true)
  const isBusy = isLoading || loading

  const sanitizedText = useMemo(() => sanitizeInput(problemText), [problemText])
  const charCount = problemText.length

  const handleExampleClick = (text) => {
    setProblemText(text)
    setError('')
    setSuccess(false)
    textareaRef.current?.focus()
  }

  const handleSolve = async () => {
    const trimmedProblem = sanitizedText.trim()

    if (!trimmedProblem) {
      setError('Please describe a physics or chemistry problem first!')
      setSuccess(false)
      textareaRef.current?.focus()
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)
    setConnected(true)
    onApiStatusChange?.(true)

    try {
      const parsedData = await parseProblem(trimmedProblem, provider)
      console.log('Parsed:', parsedData)

      if (!parsedData?.type) {
        throw new Error('Could not understand the problem. Try rephrasing!')
      }

      setConnected(true)
      setSuccess(true)
      onApiStatusChange?.(true)
      onSolved?.(parsedData)
    } catch (solveError) {
      setConnected(false)
      setError(solveError?.message || 'Something went wrong. Please try again!')
      setSuccess(false)
      onApiStatusChange?.(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel
      title="✨ Describe Your Problem"
      subtitle="Type naturally or click an example!"
      action={<Badge variant={connected ? 'success' : 'error'}>
        {connected ? '🟢 Online' : '🔴 Offline'}
      </Badge>}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            🤖 AI Model
          </label>
          <Select
            id="ai-provider"
            value={provider}
            disabled={isBusy}
            onChange={(event) => onProviderChange?.(event.target.value)}
          >
            {AI_PROVIDERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            ✏️ Your Problem
          </label>
          <Textarea
            id="problem-input"
            ref={textareaRef}
            value={problemText}
            onChange={(event) => {
              let value = sanitizeInput(event.target.value)
              if (value.length > MAX_INPUT_LENGTH) value = value.slice(0, MAX_INPUT_LENGTH)
              setProblemText(value)
              if (error) setError('')
              setSuccess(false)
            }}
            placeholder="Example: A ball is thrown at 20 m/s at 45°. What is its range?&#10;&#10;You can also ask: Show me methane molecule, balance this equation, etc."
            disabled={isBusy}
            maxLength={MAX_INPUT_LENGTH}
            className="min-h-40"
          />
          <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-dim)' }}>
            <span>{charCount}/{MAX_INPUT_LENGTH} characters</span>
            <span>Include values like "20 m/s" or "45°"</span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            💡 Physics Examples
          </p>
          <div className="flex flex-wrap gap-2">
            {PHYSICS_EXAMPLES.map((example) => (
              <button
                key={example.label}
                className="rounded-lg border px-3 py-1.5 text-xs transition-all hover:scale-105"
                style={{ 
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)'
                }}
                onClick={() => handleExampleClick(example.text)}
                disabled={isBusy}
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            🧪 Chemistry Examples
          </p>
          <div className="flex flex-wrap gap-2">
            {CHEMISTRY_EXAMPLES.map((example) => (
              <button
                key={example.label}
                className="rounded-lg border px-3 py-1.5 text-xs transition-all hover:scale-105"
                style={{ 
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)'
                }}
                onClick={() => handleExampleClick(example.text)}
                disabled={isBusy}
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        <Button 
          variant="primary" 
          className="w-full text-base py-3" 
          onClick={handleSolve} 
          disabled={isBusy || !sanitizedText.trim()}
        >
          {loading ? '⏳ Analyzing...' : '🚀 Solve & Simulate'}
        </Button>

        {loading ? (
          <ParsingSteps isLoading={loading} />
        ) : null}
        
        {success && (
          <div className="flex items-center gap-2 rounded-lg p-3" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
            <span style={{ color: '#22c55e' }}>✅</span>
            <span className="text-sm" style={{ color: '#22c55e' }}>Success! Check the simulation →</span>
          </div>
        )}
        
        {error && (
          <div className="rounded-xl border p-4" style={{ 
            borderColor: 'rgba(239, 68, 68, 0.3)', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)' 
          }}>
            <p className="text-sm font-medium" style={{ color: '#ef4444' }}>❌ Oops!</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>{error}</p>
            <div className="mt-3 space-y-1 text-xs" style={{ color: 'var(--color-text-dim)' }}>
              <p>💡 Tips:</p>
              <p>• Include numbers with units (like "20 m/s")</p>
              <p>• Be specific about what you want to find</p>
              <p>• Click an example above to see how it's done</p>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
