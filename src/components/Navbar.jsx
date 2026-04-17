import { useNavigate, useLocation } from 'react-router-dom'
import Button from './ui/Button'
import Badge from './ui/Badge'
import { ArrowLeft } from 'lucide-react'

export default function Navbar({
  mode = 'physics',
  onModeChange,
  apiConnected = true,
  onOpenSettings,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const isSimulator = location.pathname === '/app'

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[#1f2937] bg-[#0b0f17]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1700px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {isSimulator && (
            <button
              onClick={() => navigate('/')}
              className="mr-4 p-1 rounded-lg hover:bg-[#1f2937] transition-colors text-[#9ca3af] hover:text-[#e5e7eb]"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#22d3ee] to-[#06b6d4] text-xs font-semibold text-[#0b0f17]">
            ℂ
          </div>
          <span className="text-xl font-semibold text-[#e5e7eb]">CodeFlix</span>
        </div>

        {isSimulator && (
          <div className="hidden items-center gap-2 md:flex">
            <Button
              variant={mode === 'physics' ? 'primary' : 'secondary'}
              className="min-w-[96px]"
              onClick={() => onModeChange?.('physics')}
            >
              Physics
            </Button>
            <Button
              variant={mode === 'chemistry' ? 'primary' : 'secondary'}
              className="min-w-[96px]"
              onClick={() => onModeChange?.('chemistry')}
            >
              Chemistry
            </Button>
          </div>
        )}

        <div className="flex items-center gap-3">
          {isSimulator && (
            <Badge variant={apiConnected ? 'success' : 'error'} className="gap-2">
              <span className={`h-2 w-2 rounded-full ${apiConnected ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
              API {apiConnected ? 'Connected' : 'Error'}
            </Badge>
          )}
          {isSimulator && (
            <Button variant="ghost" className="h-9 w-9 p-0" onClick={onOpenSettings} aria-label="Open settings">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317a1 1 0 011.35-.936l.83.34a1 1 0 00.79 0l.83-.34a1 1 0 011.35.936l.083.906a1 1 0 00.516.794l.782.45a1 1 0 01.371 1.371l-.446.774a1 1 0 000 .816l.446.774a1 1 0 01-.371 1.37l-.782.452a1 1 0 00-.516.793l-.083.906a1 1 0 01-1.35.936l-.83-.34a1 1 0 00-.79 0l-.83.34a1 1 0 01-1.35-.936l-.083-.906a1 1 0 00-.516-.793l-.782-.451a1 1 0 01-.371-1.37l.446-.775a1 1 0 000-.816l-.446-.774a1 1 0 01.371-1.37l.782-.452a1 1 0 00.516-.794l.083-.906z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
