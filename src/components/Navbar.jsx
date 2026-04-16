import { useState } from 'react'
import { encodeProblemToURL, encodeDemoToURL, copyToClipboard } from '../utils/share'
import { showSuccess, showError } from '../utils/toast'

function Navbar({ activeDomain, onDomainChange, onDemoMode, parsedData, demoId }) {
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    setIsSharing(true)

    try {
      let url
      if (demoId) {
        url = encodeDemoToURL(demoId)
      } else if (parsedData) {
        const problemText = parsedData.steps?.join(' ') || ''
        url = encodeProblemToURL(problemText)
      }

      if (url) {
        const success = await copyToClipboard(url)
        if (success) {
          showSuccess('Link copied to clipboard!')
        } else {
          showError('Failed to copy link')
        }
      }
    } catch {
      showError('Failed to generate share link')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0f1e]/80 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-[1800px] flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(0,245,255,0.3)] bg-[rgba(0,245,255,0.1)] shadow-[0_0_20px_rgba(0,245,255,0.12)]">
            <span className="font-heading text-2xl font-bold text-[#00f5ff]">S</span>
          </div>
          <div>
            <p className="font-heading text-2xl font-bold leading-none tracking-tight text-white">
              SimuSolve
            </p>
            <p className="mt-1 font-mono-display text-[10px] uppercase tracking-[0.34em] text-[rgba(0,245,255,0.6)]">
              Interactive Physics Workspace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => onDomainChange('physics')}
              className={`rounded-full px-4 py-1.5 font-mono-display text-xs uppercase tracking-[0.2em] transition-all ${
                activeDomain === 'physics'
                  ? 'bg-[rgba(0,245,255,0.2)] text-[#00f5ff] shadow-[0_0_16px_rgba(0,245,255,0.2)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Physics
            </button>
            <button
              onClick={() => onDomainChange('chemistry')}
              className={`rounded-full px-4 py-1.5 font-mono-display text-xs uppercase tracking-[0.2em] transition-all ${
                activeDomain === 'chemistry'
                  ? 'bg-[rgba(0,245,255,0.2)] text-[#00f5ff] shadow-[0_0_16px_rgba(0,245,255,0.2)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Chemistry
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onDemoMode}
            className="hidden rounded-full border border-[rgba(0,245,255,0.25)] bg-[rgba(0,245,255,0.08)] px-4 py-2 font-mono-display text-xs uppercase tracking-[0.2em] text-[#00f5ff] transition hover:border-[rgba(0,245,255,0.4)] hover:bg-[rgba(0,245,255,0.15)] lg:inline-flex"
          >
            Demo Mode
          </button>

          {(parsedData || demoId) && (
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="flex items-center gap-2 rounded-full border border-[rgba(0,245,255,0.25)] bg-[rgba(0,245,255,0.08)] px-4 py-2 font-mono-display text-xs uppercase tracking-[0.2em] text-[#00f5ff] transition hover:border-[rgba(0,245,255,0.4)] hover:bg-[rgba(0,245,255,0.15)] disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          )}

          <a
            href="https://github.com/pavvada431-cmd/CodeFlix-26"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            aria-label="View on GitHub"
          >
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
              />
            </svg>
          </a>
        </div>
      </div>
    </header>
  )
}

export default Navbar
