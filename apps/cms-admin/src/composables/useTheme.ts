import { computed, readonly, shallowRef } from 'vue'
import {
  getNextTheme,
  getThemeToggleLabel,
  isTheme,
  resolveTheme,
} from '@chen-blog/shared-utils'
import type { Theme } from '@chen-blog/shared-utils'

const theme = shallowRef<Theme>('light')
const initialized = shallowRef(false)
const hasManualTheme = shallowRef(false)
let colorSchemeQuery: MediaQueryList | undefined

function applyTheme(nextTheme: Theme) {
  theme.value = nextTheme
  document.documentElement.dataset.theme = nextTheme
}

function handleSystemTheme(event: MediaQueryListEvent) {
  if (!hasManualTheme.value) applyTheme(event.matches ? 'dark' : 'light')
}

export function useTheme() {
  const label = computed(() => getThemeToggleLabel(theme.value))

  function initialize() {
    if (initialized.value) return
    const saved = localStorage.getItem('chen-blog-cms-theme')
    colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    hasManualTheme.value = isTheme(saved)
    applyTheme(resolveTheme(saved, colorSchemeQuery.matches))
    colorSchemeQuery.addEventListener('change', handleSystemTheme)
    initialized.value = true
  }

  function toggle() {
    const nextTheme = getNextTheme(theme.value)
    hasManualTheme.value = true
    applyTheme(nextTheme)
    localStorage.setItem('chen-blog-cms-theme', nextTheme)
  }

  return {
    theme: readonly(theme),
    label,
    initialize,
    toggle,
  }
}
