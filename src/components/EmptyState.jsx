import { FileText, Lightbulb, Play } from 'lucide-react'

export default function EmptyState({ onOpenLibrary, onTryDemo }) {
  const examples = [
    'A 10kg block slides down a 30° incline',
    'A ball is launched at 20 m/s at 45°',
    'A simple pendulum with length 2m',
  ]

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-8 px-6 py-12">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1f2937]">
        <FileText className="h-8 w-8 text-[#22d3ee]" />
      </div>

      {/* Main Message */}
      <div className="text-center max-w-md space-y-2">
        <h2 className="text-2xl font-bold text-[#e5e7eb]">
          No Simulation Yet
        </h2>
        <p className="text-[#9ca3af]">
          Describe a physics problem to get started, or try a prebuilt example.
        </p>
      </div>

      {/* CTA Buttons */}
      <div className="w-full space-y-2">
        <button
          onClick={onTryDemo}
          className="w-full inline-flex items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-[#22d3ee] to-[#06b6d4] px-4 py-2.5 font-semibold text-[#0b0f17] hover:shadow-lg hover:shadow-[#22d3ee]/25 transition-all"
        >
          <Play className="h-4 w-4" />
          <span>Try Demo</span>
        </button>
        <button
          onClick={onOpenLibrary}
          className="w-full rounded-lg border border-[#1f2937] bg-[#0d1a28] px-4 py-2.5 font-semibold text-[#e5e7eb] hover:bg-[#1f2937] transition-colors"
        >
          Browse Library
        </button>
      </div>

      {/* Examples */}
      <div className="w-full space-y-2">
        <div className="flex items-center space-x-2 text-sm text-[#6b7280]">
          <Lightbulb className="h-4 w-4" />
          <span>Try asking:</span>
        </div>
        <div className="space-y-2">
          {examples.map((example, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-[#1f2937] bg-[#0d1a28] p-3 text-sm text-[#9ca3af] hover:border-[#22d3ee]/50 cursor-help transition-colors"
              title="Use this as inspiration for your problem"
            >
              "{example}"
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="w-full text-xs text-[#6b7280] space-y-1">
        <p className="font-semibold text-[#9ca3af]">💡 Tips:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Be specific with values (mass, angle, velocity)</li>
          <li>Name the type of problem if possible</li>
          <li>Ask for variables you want analyzed</li>
        </ul>
      </div>
    </div>
  )
}
