import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext()

const DARK_THEME = {
  name: 'dark',
  colors: {
    bg: '#0b0f17',
    surface: '#111827',
    surfaceHover: '#1f2937',
    border: '#1f2937',
    borderHover: '#374151',
    text: '#e5e7eb',
    textMuted: '#9ca3af',
    textDim: '#6b7280',
    accent: '#22d3ee',
    accentHover: '#06b6d4',
    accentDim: 'rgba(34, 211, 238, 0.2)',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    gradientStart: '#22d3ee',
    gradientEnd: '#06b6d4',
  }
}

const LIGHT_THEME = {
  name: 'light',
  colors: {
    bg: '#f0f9ff',
    surface: '#ffffff',
    surfaceHover: '#e0f2fe',
    border: '#bae6fd',
    borderHover: '#7dd3fc',
    text: '#0c4a6e',
    textMuted: '#0369a1',
    textDim: '#075985',
    accent: '#0284c7',
    accentHover: '#0369a1',
    accentDim: 'rgba(2, 132, 199, 0.15)',
    success: '#16a34a',
    error: '#dc2626',
    warning: '#d97706',
    gradientStart: '#0ea5e9',
    gradientEnd: '#38bdf8',
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return DARK_THEME
    const stored = localStorage.getItem('seethescience-theme')
    if (stored === 'light') return LIGHT_THEME
    if (stored === 'dark') return DARK_THEME
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return LIGHT_THEME
    return DARK_THEME
  })

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return 320
    const stored = localStorage.getItem('seethescience-sidebar-width')
    return stored ? parseInt(stored, 10) : 320
  })

  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 360
    const stored = localStorage.getItem('seethescience-rightpanel-width')
    return stored ? parseInt(stored, 10) : 360
  })

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev.name === 'dark' ? LIGHT_THEME : DARK_THEME
      localStorage.setItem('seethescience-theme', newTheme.name)
      return newTheme
    })
  }, [])

  const updateSidebarWidth = useCallback((width) => {
    const clampedWidth = Math.max(250, Math.min(500, width))
    setSidebarWidth(clampedWidth)
    localStorage.setItem('seethescience-sidebar-width', clampedWidth.toString())
  }, [])

  const updateRightPanelWidth = useCallback((width) => {
    const clampedWidth = Math.max(280, Math.min(500, width))
    setRightPanelWidth(clampedWidth)
    localStorage.setItem('seethescience-rightpanel-width', clampedWidth.toString())
  }, [])

  useEffect(() => {
    const root = document.documentElement
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value)
    })
    root.setAttribute('data-theme', theme.name)
  }, [theme])

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      sidebarWidth,
      updateSidebarWidth,
      rightPanelWidth,
      updateRightPanelWidth,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export { DARK_THEME, LIGHT_THEME }
