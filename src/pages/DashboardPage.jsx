import { useState } from 'react'
import Navbar from '../components/Navbar'
import ProblemInputPanel from '../components/ProblemInputPanel'
import SimulationViewport from '../components/SimulationViewport'
import useProjectileSolution from '../hooks/useProjectileSolution'
import { defaultProblem } from '../simulations/projectileMath'

function DashboardPage() {
  const [problem, setProblem] = useState(defaultProblem)
  const solution = useProjectileSolution(problem)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-bg)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,245,255,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(0,245,255,0.1),transparent_28%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 pb-4 lg:px-6">
        <Navbar />

        <main className="flex-1 py-4">
          <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ProblemInputPanel
              problem={problem}
              setProblem={setProblem}
              solution={solution}
            />
            <SimulationViewport solution={solution} />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardPage
