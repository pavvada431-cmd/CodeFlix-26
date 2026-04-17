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
  { label: 'Inclined Plane', text: 'A 10kg block slides down a 30-degree frictionless incline. Find acceleration and normal force.' },
  { label: 'Projectile', text: 'A ball is launched at 20 m/s at 45 degrees. Find range and flight time.' },
  { label: 'Pendulum', text: 'A simple pendulum has length 2 m. Calculate period near Earth.' },
  { label: 'Spring-Mass', text: 'A 2kg mass attached to a spring with k=100 N/m is displaced and released.' },
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
      title="Problem"
      subtitle="Describe a scenario and parse it into simulation variables."
      action={<Badge variant={connected ? 'success' : 'error'}>{connected ? 'Online' : 'Offline'}</Badge>}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-[#9ca3af]" htmlFor="ai-provider">Provider</label>
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
          <label className="text-xs text-[#9ca3af]" htmlFor="problem-input">Problem input</label>
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
            placeholder="Describe your physics or chemistry problem..."
            disabled={isBusy}
            maxLength={MAX_INPUT_LENGTH}
            className="min-h-36"
          />
          <p className="text-xs text-[#9ca3af]">{charCount}/{MAX_INPUT_LENGTH}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#9ca3af]">Example problems</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <Button
                key={example.label}
                variant="ghost"
                className="px-2 py-1 text-xs"
                onClick={() => handleExampleClick(example.text)}
                disabled={isBusy}
              >
                {example.label}
              </Button>
            ))}
          </div>
        </div>

        <Button variant="primary" className="w-full" onClick={handleSolve} disabled={isBusy || !sanitizedText.trim()}>
          {loading ? 'Parsing problem...' : 'Solve'}
        </Button>

        {loading ? <Badge variant="accent">Parsing problem...</Badge> : null}
        {success ? <Badge variant="success">Parsed successfully</Badge> : null}
        {error ? <p className="text-sm text-[#ef4444]">{error}</p> : null}
      </div>
    </Panel>
  )
}
