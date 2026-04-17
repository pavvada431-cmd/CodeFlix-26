import { useState, useRef, useCallback, useEffect } from 'react'
import ProblemInput from './ProblemInput'
import Panel from './ui/Panel'
import Button from './ui/Button'
import { GripVertical } from 'lucide-react'

export default function ResizableSidebar({
  width,
  onWidthChange,
  onSolved,
  isLoading,
  provider,
  onProviderChange,
  onApiStatusChange,
  onOpenLibrary,
  onDemoMode,
  onShowSession,
}) {
  const [isDragging, setIsDragging] = useState(false)
  const sidebarRef = useRef(null)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !sidebarRef.current) return
    
    const container = sidebarRef.current.parentElement
    if (!container) return
    
    const containerRect = container.getBoundingClientRect()
    const newWidth = e.clientX - containerRect.left
    onWidthChange(newWidth)
  }, [isDragging, onWidthChange])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <>
      <aside 
        ref={sidebarRef}
        className="shrink-0 space-y-4 overflow-hidden transition-opacity"
        style={{ 
          width: `${width}px`,
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          opacity: isDragging ? 0.9 : 1,
        }}
      >
        <div className="p-4">
          <ProblemInput
            onSolved={onSolved}
            isLoading={isLoading}
            provider={provider}
            onProviderChange={onProviderChange}
            onApiStatusChange={onApiStatusChange}
          />

          <div className="mt-4">
            <Panel title="🎯 Quick Actions" subtitle="Tools and features">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={onOpenLibrary} className="text-xs">
                  📚 Library
                </Button>
                <Button variant="secondary" onClick={onDemoMode} className="text-xs">
                  🎲 Demo
                </Button>
                <Button variant="ghost" onClick={onShowSession} className="text-xs col-span-2">
                  📊 Session Summary
                </Button>
              </div>
            </Panel>
          </div>

          <div className="mt-4">
            <Panel title="⌨️ Keyboard Shortcuts" subtitle="Press keys for quick actions">
              <div className="space-y-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <div className="flex justify-between">
                  <span>Play/Pause</span>
                  <kbd className="rounded bg-black/20 px-2 py-0.5 font-mono">Space</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Reset</span>
                  <kbd className="rounded bg-black/20 px-2 py-0.5 font-mono">R</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Demos 1-9</span>
                  <span><kbd className="rounded bg-black/20 px-1 py-0.5 font-mono">1</kbd>-<kbd className="rounded bg-black/20 px-1 py-0.5 font-mono">9</kbd></span>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </aside>

      <div
        className={`group relative shrink-0 w-1 cursor-col-resize transition-colors ${
          isDragging ? 'bg-[#22d3ee]' : 'hover:bg-[#22d3ee]/50'
        }`}
        onMouseDown={handleMouseDown}
        style={{ backgroundColor: isDragging ? 'var(--color-accent)' : 'var(--color-border)' }}
      >
        <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity ${
          isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <GripVertical className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
        </div>
      </div>
    </>
  )
}
