import ProblemInput from './ProblemInput'
import Panel from './ui/Panel'
import Button from './ui/Button'

export default function Sidebar({
  onSolved,
  isLoading,
  provider,
  onProviderChange,
  onApiStatusChange,
  onOpenLibrary,
  onDemoMode,
  onShowSession,
}) {
  return (
    <aside className="w-[280px] shrink-0 space-y-4 border-r border-[#1f2937] bg-[#111827] p-4">
      <ProblemInput
        onSolved={onSolved}
        isLoading={isLoading}
        provider={provider}
        onProviderChange={onProviderChange}
        onApiStatusChange={onApiStatusChange}
      />

      <Panel title="Workspace" subtitle="Quick actions">
        <div className="grid grid-cols-1 gap-2">
          <Button variant="secondary" onClick={onOpenLibrary}>
            Open Library
          </Button>
          <Button variant="secondary" onClick={onDemoMode}>
            Load Demo
          </Button>
          <Button variant="ghost" onClick={onShowSession}>
            Session Summary
          </Button>
        </div>
      </Panel>
    </aside>
  )
}
