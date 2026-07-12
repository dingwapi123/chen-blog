<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'

const { theme, label, initialize, toggle } = useTheme()
onMounted(initialize)
</script>

<template>
  <button class="theme-toggle" type="button" :aria-label="label" :title="label" @click="toggle">
    <Sun v-if="theme === 'dark'" :size="17" aria-hidden="true" />
    <Moon v-else :size="17" aria-hidden="true" />
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 0.55rem;
  color: var(--text-muted);
  background: transparent;
}
.theme-toggle:hover { border-color: var(--border-strong); color: var(--accent); background: var(--accent-soft); }
</style>
