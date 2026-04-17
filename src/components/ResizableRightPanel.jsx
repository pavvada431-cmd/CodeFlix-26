import { useState, useRef, useCallback, useEffect } from 'react'
import SolutionPanel from './SolutionPanel'
import { GripVertical, BookOpen } from 'lucide-react'

export default function ResizableRightPanel({ 
  width, 
  onWidthChange, 
  parsedData, 
  onVariableChange 
}) {
  const [isDragging, setIsDragging] = useState(false)
  const panelRef = useRef(null)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !panelRef.current) return
    
    const container = panelRef.current.parentElement
    if (!container) return
    
    const containerRect = container.getBoundingClientRect()
    const newWidth = containerRect.right - e.clientX
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

      <aside 
        ref={panelRef}
        className="shrink-0 space-y-4 overflow-hidden transition-opacity"
        style={{ 
          width: `${width}px`,
          backgroundColor: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
          opacity: isDragging ? 0.9 : 1,
        }}
      >
        <div className="p-4">
          {parsedData ? (
            <SolutionPanel parsedData={parsedData} onVariableChange={onVariableChange} />
          ) : (
            <div 
              className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div 
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: 'var(--color-accent-dim)' }}
              >
                <BookOpen className="h-8 w-8" style={{ color: 'var(--color-accent)' }} />
              </div>
              <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                Solution Details
              </h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Load a simulation to see variables and solutions here.
              </p>
              <div className="mt-4 rounded-lg bg-black/10 px-4 py-2 text-xs" style={{ color: 'var(--color-text-dim)' }}>
                💡 Try clicking "Load Demo" or entering a problem
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
