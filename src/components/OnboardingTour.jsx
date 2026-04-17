import { useState } from 'react'
import { X, ChevronRight } from 'lucide-react'

const STEPS = [
  {
    title: 'Welcome to CodeFlix! 👋',
    description: 'Transform physics problems into interactive simulations powered by AI.',
    highlight: null,
  },
  {
    title: 'Describe Your Problem',
    description: 'Simply tell us your physics problem in natural language. Our AI will understand it.',
    highlight: 'sidebar',
  },
  {
    title: 'Watch It Animate',
    description: 'See the physics unfold in real-time with beautiful visualizations.',
    highlight: 'canvas',
  },
  {
    title: 'Analyze with Graphs',
    description: 'View real-time graphs showing position, velocity, acceleration, and more.',
    highlight: 'graphs',
  },
  {
    title: 'You\'re Ready! 🚀',
    description: 'Start by entering a physics problem or trying a demo.',
    highlight: null,
  },
]

export default function OnboardingTour({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0)
  const step = STEPS[currentStep]
  const isLast = currentStep === STEPS.length - 1

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0b0f17]/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative rounded-2xl border border-[#1f2937] bg-[#111827] p-8 shadow-2xl max-w-md">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6b7280] hover:text-[#e5e7eb] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-[#e5e7eb]">{step.title}</h2>
          <p className="text-[#9ca3af]">{step.description}</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex gap-2">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  idx <= currentStep ? 'bg-[#22d3ee]' : 'bg-[#1f2937]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 rounded-lg border border-[#1f2937] bg-[#0d1a28] px-4 py-2 font-semibold text-[#e5e7eb] hover:bg-[#1f2937] transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (isLast) {
                onClose()
              } else {
                setCurrentStep(currentStep + 1)
              }
            }}
            className="flex-1 inline-flex items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-[#22d3ee] to-[#06b6d4] px-4 py-2 font-semibold text-[#0b0f17] hover:shadow-lg hover:shadow-[#22d3ee]/25 transition-all"
          >
            <span>{isLast ? 'Get Started' : 'Next'}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
