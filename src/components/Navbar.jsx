import { useNavigate, useLocation } from 'react-router-dom'
import { Sun, Moon, Settings, Zap, FlaskConical, ArrowLeft, Check, CircleHelp, Wrench } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export default function Navbar({
  onOpenSettings,
  apiConnected = true,
  onPageChange,
  currentPage = 'physics',
  isMobile = false,
  onOpenTour,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const isSimulator = location.pathname === '/app'

  if (isMobile) {
    return (
      <header
        className="fixed inset-x-0 top-0 z-40 border-b backdrop-blur-md"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'color-mix(in srgb, var(--color-surface) 95%, transparent)',
        }}
      >
        <div className="mx-auto flex h-16 max-w-[1800px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-xl font-bold shadow-lg"
              style={{
                background: 'linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end))',
                color: '#fff',
              }}
            >
              ℂ
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>SeeTheScience</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenTour}
              className="rounded-xl p-2 transition-all"
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
              }}
              aria-label="Open guided tour"
            >
              <CircleHelp className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-xl p-2 transition-all"
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
              }}
              aria-label="Open settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header 
      className="fixed inset-x-0 top-0 z-40 border-b backdrop-blur-md"
      style={{ 
        borderColor: 'var(--color-border)',
        backgroundColor: 'color-mix(in srgb, var(--color-surface) 95%, transparent)'
      }}
    >
      <div className="mx-auto flex h-16 max-w-[1800px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          {isSimulator && (
            <button
              onClick={() => navigate('/')}
              className="rounded-lg p-2 transition-colors hover:bg-black/5"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          
          <div className="flex items-center gap-3">
            <div 
              className="flex h-9 w-9 items-center justify-center rounded-xl text-xl font-bold shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end))`,
                color: '#fff'
              }}
            >
              ℂ
            </div>
            <div>
              <span className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>SeeTheScience</span>
              <span className="ml-2 hidden text-xs font-medium sm:inline" style={{ color: 'var(--color-text-muted)' }}>
                Interactive Science
              </span>
            </div>
          </div>
        </div>

        {isSimulator && (
          <div className="flex items-center gap-2">
            <div 
              className="flex rounded-xl border p-1"
              style={{ 
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg)'
              }}
            >
              <button
                onClick={() => onPageChange?.('physics')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  currentPage === 'physics' ? 'shadow-md' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: currentPage === 'physics' ? 'var(--color-accent)' : 'transparent',
                  color: currentPage === 'physics' ? '#fff' : 'var(--color-text-muted)'
                }}
              >
                <Zap className="h-4 w-4" />
                Physics
                {currentPage === 'physics' && (
                  <Check className="h-3 w-3" />
                )}
              </button>
              
              <button
                onClick={() => onPageChange?.('chemistry')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  currentPage === 'chemistry' ? 'shadow-md' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: currentPage === 'chemistry' ? 'var(--color-accent)' : 'transparent',
                  color: currentPage === 'chemistry' ? '#fff' : 'var(--color-text-muted)'
                }}
              >
                <FlaskConical className="h-4 w-4" />
                Chemistry
                {currentPage === 'chemistry' && (
                  <Check className="h-3 w-3" />
                )}
              </button>

              <button
                onClick={() => onPageChange?.('builder')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  currentPage === 'builder' ? 'shadow-md' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: currentPage === 'builder' ? 'var(--color-accent)' : 'transparent',
                  color: currentPage === 'builder' ? '#fff' : 'var(--color-text-muted)'
                }}
              >
                <Wrench className="h-4 w-4" />
                Builder
                {currentPage === 'builder' && (
                  <Check className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div 
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
              apiConnected ? '' : ''
            }`}
            style={{ 
              backgroundColor: apiConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: apiConnected ? '#22c55e' : '#ef4444'
            }}
          >
            <span 
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: apiConnected ? '#22c55e' : '#ef4444' }}
            />
            {apiConnected ? 'Connected' : 'Error'}
          </div>

          <button
            onClick={toggleTheme}
            className="rounded-xl p-2 transition-all hover:scale-110"
            style={{ 
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)'
            }}
            aria-label="Toggle theme"
          >
            {theme.name === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={onOpenTour}
            className="rounded-xl p-2 transition-all hover:scale-110"
            style={{ 
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)'
            }}
            aria-label="Open guided tour"
          >
            <CircleHelp className="h-5 w-5" />
          </button>

          <button
            onClick={onOpenSettings}
            className="rounded-xl p-2 transition-all hover:scale-110"
            style={{ 
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)'
            }}
            aria-label="Open settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
