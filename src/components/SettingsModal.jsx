import { X } from 'lucide-react'
import { useTheme } from '../contexts/useTheme'

export default function SettingsModal({ isOpen, onClose, onShowOnboarding }) {
  const { theme, toggleTheme, sidebarWidth, updateSidebarWidth, rightPanelWidth, updateRightPanelWidth } = useTheme()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div 
        className="relative z-10 w-full max-w-lg rounded-2xl border p-6 shadow-2xl"
        style={{ 
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            ⚙️ Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-black/10"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Appearance
            </h3>
            
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                    🌙 Dark Mode
                  </p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-text-dim)' }}>
                    {theme.name === 'dark' ? 'Currently using dark theme' : 'Currently using light theme'}
                  </p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="relative h-8 w-14 rounded-full border transition-colors"
                  style={{ 
                    backgroundColor: theme.name === 'dark' ? 'var(--color-accent)' : 'var(--color-border)',
                    borderColor: theme.name === 'dark' ? 'var(--color-accent)' : 'var(--color-border)'
                  }}
                >
                  <span
                    className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform"
                    style={{ 
                      left: theme.name === 'dark' ? '28px' : '4px',
                      backgroundColor: theme.name === 'dark' ? 'var(--color-bg)' : 'var(--color-surface)'
                    }}
                  />
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Layout
            </h3>
            
            <div className="space-y-4 rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-medium" style={{ color: 'var(--color-text)' }}>
                    Left Sidebar Width
                  </label>
                  <span className="font-mono text-sm" style={{ color: 'var(--color-accent)' }}>
                    {sidebarWidth}px
                  </span>
                </div>
                <input
                  type="range"
                  min="250"
                  max="500"
                  step="10"
                  value={sidebarWidth}
                  onChange={(e) => updateSidebarWidth(parseInt(e.target.value, 10))}
                  className="w-full accent-[#22d3ee]"
                />
                <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--color-text-dim)' }}>
                  <span>250px</span>
                  <span>500px</span>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-medium" style={{ color: 'var(--color-text)' }}>
                    Right Panel Width
                  </label>
                  <span className="font-mono text-sm" style={{ color: 'var(--color-accent)' }}>
                    {rightPanelWidth}px
                  </span>
                </div>
                <input
                  type="range"
                  min="280"
                  max="500"
                  step="10"
                  value={rightPanelWidth}
                  onChange={(e) => updateRightPanelWidth(parseInt(e.target.value, 10))}
                  className="w-full accent-[#22d3ee]"
                />
                <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--color-text-dim)' }}>
                  <span>280px</span>
                  <span>500px</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              About
            </h3>
            
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div 
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl font-bold"
                  style={{ background: `linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end))` }}
                >
                  ℂ
                </div>
                <div>
                  <h4 className="font-bold" style={{ color: 'var(--color-text)' }}>SeeTheScience</h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Interactive Science Simulations</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Version 1.0.0</p>
                </div>
              </div>
              <p className="mt-4 text-sm" style={{ color: 'var(--color-text-dim)' }}>
                Learn physics and chemistry through interactive 3D simulations. 
                Built with React, Three.js, and Tailwind CSS.
              </p>

              <button
                type="button"
                onClick={onShowOnboarding}
                className="mt-4 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-black/10"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Show Onboarding
              </button>
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl px-6 py-2 font-medium transition-colors"
            style={{ 
              backgroundColor: 'var(--color-accent)',
              color: theme.name === 'dark' ? '#0b0f17' : '#ffffff'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
