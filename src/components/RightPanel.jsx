import SolutionPanel from './SolutionPanel'
import { BookOpen } from 'lucide-react'

export default function RightPanel({
  parsedData,
  onVariableChange,
  currentVariables,
  dataStream,
  isPlaying,
  simulationType,
  isEmpty = false,
}) {
  if (isEmpty) {
    return (
      <aside className="w-[320px] shrink-0 space-y-4 border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex h-full flex-col items-center justify-center space-y-4 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-border)]">
            <BookOpen className="h-6 w-6 text-[var(--color-accent,#22d3ee)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-text)]">Solution Details</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Load a simulation to see variables and solutions here.
            </p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-[320px] shrink-0 space-y-4 border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <SolutionPanel
        parsedData={parsedData}
        currentVariables={currentVariables}
        dataStream={dataStream}
        isPlaying={isPlaying}
        simulationType={simulationType}
        onUpdateVariable={onVariableChange}
      />
    </aside>
  )
}
