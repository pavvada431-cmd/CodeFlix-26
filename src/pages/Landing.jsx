import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Play, Zap, BarChart3, Brain, Code2 } from 'lucide-react'

const DEMO_PROBLEMS = [
  'A 10kg block slides down a 30-degree frictionless incline.',
  'A ball is launched at 20 m/s at an angle of 45 degrees.',
  'A simple pendulum has length 2 m.',
]

export default function Landing() {
  const navigate = useNavigate()
  const [isPlayingDemo, setIsPlayingDemo] = useState(false)

  const handleStartSolving = () => navigate('/app')
  const handleTryDemo = () => {
    navigate(`/app?demo=${encodeURIComponent(DEMO_PROBLEMS[0])}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0f17] via-[#0d1a28] to-[#0b0f17] text-[#e5e7eb]">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-[#1f2937] bg-[#0b0f17]/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#22d3ee] to-[#06b6d4] flex items-center justify-center font-bold">
                ℂ
              </div>
              <span className="text-xl font-bold">CodeFlix</span>
            </div>
            <div className="flex items-center space-x-6">
              <a
                href="#features"
                className="text-sm hover:text-[#22d3ee] transition-colors"
              >
                Features
              </a>
              <a
                href="https://github.com/pavvada431-cmd/CodeFlix-26"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-sm hover:text-[#22d3ee] transition-colors"
              >
                <Code2 className="h-4 w-4" />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        {/* Background gradient orbs */}
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-[#22d3ee]/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[#06b6d4]/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-block rounded-full border border-[#1f2937] bg-[#111827] px-4 py-2">
            <p className="text-xs font-semibold text-[#22d3ee]">✨ Physics visualization reimagined</p>
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl">
            Turn Physics Problems Into{' '}
            <span className="bg-gradient-to-r from-[#22d3ee] to-[#06b6d4] bg-clip-text text-transparent">
              Living Simulations
            </span>
          </h1>

          <p className="mb-8 text-xl text-[#9ca3af]">
            Visualize, understand, and interact with physics like never before. Simply describe your problem and watch it come alive.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row justify-center">
            <button
              onClick={handleStartSolving}
              className="inline-flex items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-[#22d3ee] to-[#06b6d4] px-8 py-3 font-semibold text-[#0b0f17] hover:shadow-lg hover:shadow-[#22d3ee]/25 transition-all duration-200"
            >
              <span>Start Solving</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={handleTryDemo}
              className="inline-flex items-center justify-center space-x-2 rounded-lg border border-[#1f2937] bg-[#111827]/50 px-8 py-3 font-semibold hover:bg-[#1f2937] transition-colors"
            >
              <Play className="h-5 w-5" />
              <span>Try Demo</span>
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold">Powerful Features</h2>
            <p className="text-lg text-[#9ca3af]">Everything you need to master physics</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Brain,
                title: 'AI-Powered Parsing',
                description: 'Describe physics problems in natural language and let AI understand them.',
              },
              {
                icon: Zap,
                title: 'Interactive Simulations',
                description: 'Play, pause, reset, and adjust parameters in real-time.',
              },
              {
                icon: BarChart3,
                title: 'Real-Time Graphs',
                description: 'Watch dynamics unfold with live plotting and analysis.',
              },
              {
                icon: Play,
                title: 'Multi-Concept Solving',
                description: 'Handle complex problems combining multiple physics concepts.',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#1f2937] bg-[#111827]/50 p-6 hover:border-[#22d3ee]/50 transition-colors"
              >
                <feature.icon className="mb-4 h-8 w-8 text-[#22d3ee]" />
                <h3 className="mb-2 font-semibold text-lg">{feature.title}</h3>
                <p className="text-[#9ca3af]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold">How It Works</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: 1,
                title: 'Describe Your Problem',
                description: 'Tell us about your physics problem in plain English.',
              },
              {
                step: 2,
                title: 'AI Understands',
                description: 'Our AI parses the problem and extracts all parameters.',
              },
              {
                step: 3,
                title: 'Simulation Runs',
                description: 'Watch the physics unfold in a beautiful visualization.',
              },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="rounded-xl border border-[#1f2937] bg-[#111827]/50 p-8 text-center">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[#22d3ee] to-[#06b6d4] font-bold text-[#0b0f17]">
                    {item.step}
                  </div>
                  <h3 className="mb-2 font-semibold text-lg">{item.title}</h3>
                  <p className="text-[#9ca3af]">{item.description}</p>
                </div>
                {idx < 2 && (
                  <div className="absolute top-1/2 -right-4 hidden md:block h-1 w-8 bg-gradient-to-r from-[#22d3ee] to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-[#1f2937] bg-gradient-to-br from-[#111827] to-[#0d1a28] p-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Ready to Master Physics?</h2>
            <p className="mb-8 text-lg text-[#9ca3af]">
              Start solving problems and visualizing physics concepts right now.
            </p>
            <button
              onClick={handleStartSolving}
              className="inline-flex items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-[#22d3ee] to-[#06b6d4] px-8 py-3 font-semibold text-[#0b0f17] hover:shadow-lg hover:shadow-[#22d3ee]/25 transition-all duration-200"
            >
              <span>Launch App</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f2937] bg-[#0b0f17]/50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#22d3ee] to-[#06b6d4] flex items-center justify-center font-bold text-xs">
                ℂ
              </div>
              <span className="font-semibold">CodeFlix</span>
            </div>
            <p className="text-center text-[#9ca3af]">
              Building the future of physics education
            </p>
            <a
              href="https://github.com/pavvada431-cmd/CodeFlix-26"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-[#9ca3af] hover:text-[#22d3ee] transition-colors"
            >
              <Code2 className="h-5 w-5" />
              <span>GitHub</span>
            </a>
          </div>
          <div className="mt-8 border-t border-[#1f2937] pt-8 text-center text-sm text-[#6b7280]">
            <p>© 2026 CodeFlix. Designed with ✨ for physics learners everywhere.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
