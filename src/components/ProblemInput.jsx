import { useMemo, useRef, useState } from 'react'
import { parseProblem } from '../utils/problemParser'
import { sanitizeInput } from '../utils/validator'
import Button from './ui/Button'
import Badge from './ui/Badge'
import Panel from './ui/Panel'
import { Select, Textarea } from './ui/Input'

const MAX_INPUT_LENGTH = 500
const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI (GPT-4o)' },
  { value: 'anthropic', label: 'Anthropic (Claude Sonnet 4)' },
  { value: 'gemini', label: 'Google Gemini (1.5 Flash)' },
  { value: 'groq', label: 'Groq (Llama 3.3 70B)' },
  { value: 'ollama', label: 'Ollama (Local / Cloud)' },
]

const EXAMPLES = [
  { label: '🎯 Projectile', text: 'A ball is launched at 20 m/s at 45 degrees. Find range and flight time.' },
  { label: '⏱️ Pendulum', text: 'A simple pendulum has length 2 m. Calculate period.' },
  { label: '📐 Inclined Plane', text: 'A 10kg block slides down a 30-degree ramp with friction 0.2.' },
  { label: '🔄 Spring', text: 'A 2kg mass attached to a spring with k=100 N/m is displaced and released.' },
  { label: '💥 Collision', text: 'Two balls collide elastically. Ball 1 (2kg) at 5 m/s hits Ball 2 (3kg) at rest.' },
  { label: '🧪 Methane', text: 'Show me the methane molecule CH4 and explain its structure.' },
  { label: '🌊 Wave', text: 'A wave has frequency 5 Hz and wavelength 2 m. Calculate wave speed.' },
  { label: '⚡ Electric', text: 'Two charges of 1e-6 C are 0.1 m apart. Find the force between them.' },
  { label: '☀️ Orbit', text: 'A satellite orbits Earth at 400 km altitude. Calculate orbital velocity.' },
  { label: '🫧 Buoyancy', text: 'A wooden block (density 600 kg/m³) with volume 0.1 m³ floats in water.' },
  { label: '🔬 Gas', text: '2 moles of ideal gas at 300 K in 0.05 m³. Find the pressure.' },
  { label: '☢️ Decay', text: 'A sample has 1000 atoms with half-life of 5 seconds. How much remains after 15s?' },
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
      setError('Describe a problem before starting the parser.')
      setSuccess(false)
      textareaRef.current?.focus()
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)
    setConnected(true)
    onApiStatusChange?.(true)  // Mark as connected while loading

    try {
      const parsedData = await parseProblem(trimmedProblem, provider)
      console.log('PARSED DATA:', parsedData)

      if (!parsedData?.type || !parsedData?.variables || typeof parsedData.variables !== 'object') {
        throw new Error('Parsed data is missing required fields: type and variables')
      }

      setConnected(true)
      setSuccess(true)
      onApiStatusChange?.(true)
      onSolved?.(parsedData)
    } catch (solveError) {
      setConnected(false)
      setError(solveError?.message || 'Failed to parse problem')
      setSuccess(false)
      onApiStatusChange?.(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel
      title="📝 Describe Your Problem"
      subtitle="Type or click an example to get started!"
      action={<Badge variant={connected ? 'success' : 'error'}>{connected ? '🟢 Online' : '🔴 Offline'}</Badge>}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-[#9ca3af]" htmlFor="ai-provider">🤖 AI Model</label>
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
          <label className="text-xs text-[#9ca3af]" htmlFor="problem-input">✏️ Your Problem</label>
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
            placeholder="Type your physics or chemistry problem here... You can use casual language!"
            disabled={isBusy}
            maxLength={MAX_INPUT_LENGTH}
            className="min-h-36"
          />
          <p className="text-xs text-[#9ca3af]">{charCount}/{MAX_INPUT_LENGTH}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#9ca3af]">💡 Try these examples (click to use)</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <Button
                key={example.label}
                variant="ghost"
                className="px-2 py-1 text-xs hover:bg-[rgba(0,245,255,0.1)]"
                onClick={() => handleExampleClick(example.text)}
                disabled={isBusy}
              >
                {example.label}
              </Button>
            ))}
          </div>
        </div>

        <Button variant="primary" className="w-full text-base py-3" onClick={handleSolve} disabled={isBusy || !sanitizedText.trim()}>
          {loading ? '⏳ Analyzing your problem...' : '🚀 Solve & Simulate'}
        </Button>

        {loading ? (
          <div className="flex items-center gap-2 text-[#00f5ff]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00f5ff] border-t-transparent"></div>
            <span className="text-sm">Processing...</span>
          </div>
        ) : null}
        {success ? <Badge variant="success">✅ Parsed successfully! Check the simulation!</Badge> : null}
        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400 font-medium">❌ Oops! Something went wrong</p>
            <p className="mt-1 text-xs text-red-300">{error}</p>
            <div className="mt-3 rounded bg-[rgba(0,0,0,0.3)] p-2">
              <p className="text-xs text-slate-400">
                💡 <span className="text-[#00f5ff]">Tips:</span>
              </p>
              <ul className="mt-1 space-y-1 text-xs text-slate-400">
                <li>• Include numbers with units (like "20 m/s" or "45 degrees")</li>
                <li>• Describe what you want to find (like "find the range")</li>
                <li>• Click an example above to see how it's done!</li>
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  )
}
