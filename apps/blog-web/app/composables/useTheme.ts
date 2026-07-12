import { computed, readonly, shallowRef } from 'vue'

type Theme = 'light' | 'dark'

const theme = shallowRef<Theme>('light')
const initialized = shallowRef(false)

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const label = computed(() => (theme.value === 'dark' ? '切换到浅色模式' : '切换到深色模式'))

  function apply(nextTheme: Theme, persist = true) {
    theme.value = nextTheme
    document.documentElement.dataset.theme = nextTheme
    if (persist) {
      document.cookie = `chen-blog-theme=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`
    }
  }

  function initialize() {
    if (initialized.value || !import.meta.client) return
    const initialTheme = document.documentElement.dataset.theme
    apply(initialTheme === 'dark' || initialTheme === 'light' ? initialTheme : getSystemTheme(), false)
    initialized.value = true
  }

  function toggle() {
    apply(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme: readonly(theme), label, initialize, toggle }
}
