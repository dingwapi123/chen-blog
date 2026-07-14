import { computed, readonly, shallowRef } from 'vue'

type Theme = 'light' | 'dark'

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
  const label = computed(() => (
    theme.value === 'dark' ? '切换到浅色模式' : '切换到深色模式'
  ))

  function initialize() {
    if (initialized.value) return
    const saved = localStorage.getItem('chen-blog-cms-theme')
    colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    hasManualTheme.value = saved === 'dark' || saved === 'light'
    applyTheme(hasManualTheme.value ? saved as Theme : colorSchemeQuery.matches ? 'dark' : 'light')
    colorSchemeQuery.addEventListener('change', handleSystemTheme)
    initialized.value = true
  }

  function toggle() {
    const nextTheme = theme.value === 'dark' ? 'light' : 'dark'
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
