import { computed, readonly, shallowRef } from 'vue'
type Theme = 'light' | 'dark'
const theme = shallowRef<Theme>('light')
const initialized = shallowRef(false)
export function useTheme() {
  const label = computed(() => theme.value === 'dark' ? '切换到浅色模式' : '切换到深色模式')
  function initialize() { if (initialized.value) return; const saved = localStorage.getItem('chen-blog-cms-theme'); theme.value = saved === 'dark' || saved === 'light' ? saved : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; document.documentElement.dataset.theme = theme.value; initialized.value = true }
  function toggle() { theme.value = theme.value === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme.value; localStorage.setItem('chen-blog-cms-theme', theme.value) }
  return { theme: readonly(theme), label, initialize, toggle }
}
