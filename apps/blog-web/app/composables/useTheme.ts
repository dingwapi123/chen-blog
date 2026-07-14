import { computed } from 'vue'

type Theme = 'light' | 'dark'

export function useTheme() {
  const colorMode = useColorMode()
  const theme = computed<Theme>(() => colorMode.value === 'dark' ? 'dark' : 'light')
  const label = computed(() => (theme.value === 'dark' ? '切换到浅色模式' : '切换到深色模式'))

  function toggle() {
    const nextTheme = theme.value === 'dark' ? 'light' : 'dark'
    colorMode.preference = nextTheme
    if (import.meta.client) {
      document.cookie = `chen-blog-theme=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`
    }
  }

  return { theme, label, toggle }
}
