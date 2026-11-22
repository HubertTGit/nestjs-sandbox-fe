import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type Theme = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: ResolvedTheme
}

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'
const DARK_THEME_COLOR = '#0a0a0a'
const LIGHT_THEME_COLOR = '#ffffff'

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function isTheme(value: string | null): value is Theme {
  return value === 'dark' || value === 'light' || value === 'system'
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light'
}

function getStoredTheme(storageKey: string): Theme | null {
  try {
    const value = localStorage.getItem(storageKey)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

function applyThemeToDocument(theme: Theme, resolvedTheme: ResolvedTheme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolvedTheme)

  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]')
  if (colorSchemeMeta) {
    colorSchemeMeta.setAttribute(
      'content',
      theme === 'system' ? 'light dark' : theme,
    )
  }

  const themeColorMeta = document.querySelector('meta[name="theme-color"]')
  if (themeColorMeta) {
    themeColorMeta.setAttribute(
      'content',
      resolvedTheme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR,
    )
  }
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => getStoredTheme(storageKey) ?? defaultTheme,
  )
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)

  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== storageKey) {
        return
      }
      setThemeState(isTheme(event.newValue) ? event.newValue : defaultTheme)
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [defaultTheme, storageKey])

  useEffect(() => {
    applyThemeToDocument(theme, resolvedTheme)
  }, [theme, resolvedTheme])

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme)
      try {
        localStorage.setItem(storageKey, nextTheme)
      } catch {}
    },
    [storageKey],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
    }),
    [theme, setTheme, resolvedTheme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
