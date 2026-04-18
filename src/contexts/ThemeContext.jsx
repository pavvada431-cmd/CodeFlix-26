import { useState, useEffect, useCallback } from 'react'
import { DARK_THEME, LIGHT_THEME } from './themeConstants'
import { ThemeContext } from './themeContextInstance'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return DARK_THEME
    try {
      const stored = localStorage.getItem('seethescience-theme')
      if (stored === 'light') return LIGHT_THEME
      if (stored === 'dark') return DARK_THEME
    } catch {
      // localStorage not available (Safari private mode, etc)
    }
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return LIGHT_THEME
    return DARK_THEME
  })

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return 320
    try {
      const stored = localStorage.getItem('seethescience-sidebar-width')
      return stored ? parseInt(stored, 10) : 320
    } catch {
      return 320
    }
  })

  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 360
    try {
      const stored = localStorage.getItem('seethescience-rightpanel-width')
      return stored ? parseInt(stored, 10) : 360
    } catch {
      return 360
    }
  })

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev.name === 'dark' ? LIGHT_THEME : DARK_THEME
      try {
        localStorage.setItem('seethescience-theme', newTheme.name)
      } catch {
        // localStorage not available
      }
      return newTheme
    })
  }, [])

  const updateSidebarWidth = useCallback((width) => {
    const clampedWidth = Math.max(250, Math.min(500, width))
    setSidebarWidth(clampedWidth)
    try {
      localStorage.setItem('seethescience-sidebar-width', clampedWidth.toString())
    } catch {
      // localStorage not available
    }
  }, [])

  const updateRightPanelWidth = useCallback((width) => {
    const clampedWidth = Math.max(280, Math.min(500, width))
    setRightPanelWidth(clampedWidth)
    try {
      localStorage.setItem('seethescience-rightpanel-width', clampedWidth.toString())
    } catch {
      // localStorage not available
    }
  }, [])

  const resetLayout = useCallback(() => {
    setSidebarWidth(320)
    setRightPanelWidth(360)
    try {
      localStorage.setItem('seethescience-sidebar-width', '320')
      localStorage.setItem('seethescience-rightpanel-width', '360')
    } catch {
      // localStorage not available
    }
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
      resetLayout,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}
