import type { Theme } from '#/lib/preferences'
import { useSyncExternalStore } from 'react'

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

/** Puts the theme on <html>, settling "system" by the OS setting right now. */
export function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && darkQuery.matches)

  document.documentElement.classList.toggle('dark', dark)
}

/**
 * Keeps a "system" theme following the OS as it switches between light and
 * dark. Returns the unsubscribe, a no-op for an explicit theme.
 */
export function watchSystemTheme(theme: Theme): () => void {
  if (theme !== 'system') return () => {}

  const onChange = () => applyTheme('system')
  darkQuery.addEventListener('change', onChange)

  return () => darkQuery.removeEventListener('change', onChange)
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributeFilter: ['class'] })
  return () => observer.disconnect()
}

/** "light" or "dark" as actually shown, with "system" already settled. */
export function useResolvedTheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribe, () =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )
}
