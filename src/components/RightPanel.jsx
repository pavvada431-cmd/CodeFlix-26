import SolutionPanel from './SolutionPanel'
import { BookOpen } from 'lucide-react'

export default function RightPanel({ parsedData, onVariableChange, isEmpty = false }) {
  if (isEmpty) {
    return (
      <aside className="w-[320px] shrink-0 space-y-4 border-l border-[#1f2937] bg-[#111827] p-4">
        <div className="flex h-full flex-col items-center justify-center space-y-4 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1f2937]">
            <BookOpen className="h-6 w-6 text-[#22d3ee]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#e5e7eb]">Solution Details</h3>
            <p className="mt-1 text-sm text-[#6b7280]">
              Load a simulation to see variables and solutions here.
            </p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-[320px] shrink-0 space-y-4 border-l border-[#1f2937] bg-[#111827] p-4">
      <SolutionPanel parsedData={parsedData} onVariableChange={onVariableChange} />
    </aside>
  )
}
