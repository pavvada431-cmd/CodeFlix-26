import { useEffect, useMemo, useState } from 'react'

const POSITION_CLASSES = {
  top: {
    bubble: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
    arrow: 'left-1/2 top-full -translate-x-1/2 border-x-6 border-t-6 border-x-transparent',
  },
  bottom: {
    bubble: 'left-1/2 top-full mt-2 -translate-x-1/2',
    arrow: 'bottom-full left-1/2 -translate-x-1/2 border-x-6 border-b-6 border-x-transparent',
  },
  left: {
    bubble: 'right-full top-1/2 mr-2 -translate-y-1/2',
    arrow: 'left-full top-1/2 -translate-y-1/2 border-y-6 border-l-6 border-y-transparent',
  },
  right: {
    bubble: 'left-full top-1/2 ml-2 -translate-y-1/2',
    arrow: 'right-full top-1/2 -translate-y-1/2 border-y-6 border-r-6 border-y-transparent',
  },
}

function isTouchDevice() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: none)').matches
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isTapMode, setIsTapMode] = useState(false)

  useEffect(() => {
    setIsTapMode(isTouchDevice())
  }, [])

  useEffect(() => {
    if (!isVisible) return undefined
    const timeout = window.setTimeout(() => setIsVisible(false), 3000)
    return () => window.clearTimeout(timeout)
  }, [isVisible])

  const resolvedPosition = POSITION_CLASSES[position] ? position : 'top'
  const classes = useMemo(() => POSITION_CLASSES[resolvedPosition], [resolvedPosition])

  const show = () => setIsVisible(true)
  const hide = () => {
    if (!isTapMode) setIsVisible(false)
  }
  const toggle = () => {
    if (isTapMode) setIsVisible((prev) => !prev)
  }

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={toggle}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setIsVisible((prev) => !prev)
        }
      }}
    >
      {children}

      {isVisible && content ? (
        <span
          className={`pointer-events-none absolute z-[100] max-w-[240px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] shadow-xl ${classes.bubble}`}
        >
          {content}
          <span
            className={`absolute h-0 w-0 border-[var(--color-surface)] ${classes.arrow}`}
          />
        </span>
      ) : null}
    </span>
  )
}
