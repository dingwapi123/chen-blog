import { computed } from 'vue'
import {
  getNextTheme,
  getThemeToggleLabel,
  resolveTheme,
} from '@chen-blog/shared-utils'
import type { Theme } from '@chen-blog/shared-utils'

export function useTheme() {
  const colorMode = useColorMode()
  const theme = computed<Theme>(() => resolveTheme(colorMode.value, false))
  const label = computed(() => getThemeToggleLabel(theme.value))

  function toggle() {
    const nextTheme = getNextTheme(theme.value)
    colorMode.preference = nextTheme
    if (import.meta.client) {
      document.cookie = `chen-blog-theme=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`
    }
  }

  return { theme, label, toggle }
}
