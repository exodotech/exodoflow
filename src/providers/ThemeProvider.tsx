'use client'
// Preferência de TEMA por utilizador (claro/escuro). Persiste em localStorage e,
// enquanto não houver escolha explícita, segue o sistema operativo. O <html> já
// recebe a classe `.dark` por um script anti-FOUC no root layout (antes da
// pintura). Usamos useSyncExternalStore — o primitivo do React para ler estado
// externo (a classe do <html>) de forma SSR-safe e sem setState-em-efeito.
import {
  createContext, useContext, useCallback, useSyncExternalStore, type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark'
const STORAGE_KEY = 'exodo-theme'
const CHANGE_EVENT = 'exodo-theme-change'

function applyClass(t: Theme) {
  const el = document.documentElement
  el.classList.toggle('dark', t === 'dark')
  el.style.colorScheme = t
}

// Snapshot do tema atual a partir do DOM (fonte de verdade = classe .dark).
function getSnapshot(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}
// No servidor assumimos claro; o cliente re-sincroniza após a hidratação.
function getServerSnapshot(): Theme {
  return 'light'
}

// Subscreve a mudanças: do sistema (quando não há escolha explícita) e do toggle.
function subscribe(callback: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystem = () => {
    try { if (localStorage.getItem(STORAGE_KEY)) return } catch { /* ignore */ }
    applyClass(mq.matches ? 'dark' : 'light')
    callback()
  }
  mq.addEventListener('change', onSystem)
  window.addEventListener(CHANGE_EVENT, callback)
  return () => {
    mq.removeEventListener('change', onSystem)
    window.removeEventListener(CHANGE_EVENT, callback)
  }
}

interface ThemeContextValue {
  theme:    Theme
  toggle:   () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light', toggle: () => {}, setTheme: () => {},
})

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setTheme = useCallback((t: Theme) => {
    applyClass(t)
    try { localStorage.setItem(STORAGE_KEY, t) } catch { /* modo privado */ }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  const toggle = useCallback(() => {
    setTheme(getSnapshot() === 'dark' ? 'light' : 'dark')
  }, [setTheme])

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
