<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'

const { theme, label, toggle } = useTheme()
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
  border: 0;
  border-radius: 0.375rem;
  color: var(--text-muted);
  background: var(--surface-high);
}
.theme-toggle:hover { color: var(--accent); background: var(--accent-soft); box-shadow: 0 0 1rem color-mix(in srgb, var(--accent) 20%, transparent); }
</style>
