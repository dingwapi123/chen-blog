<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { useTheme } from '@/composables/useTheme'
const { theme, label, initialize, toggle } = useTheme()
onMounted(initialize)
</script>
<template><button class="theme-toggle" type="button" :aria-label="label" :title="label" @click="toggle"><Sun v-if="theme === 'dark'" :size="17" aria-hidden="true" /><Moon v-else :size="17" aria-hidden="true" /></button></template>
<style scoped>.theme-toggle{display:grid;width:2.5rem;height:2.5rem;place-items:center;border:0;border-radius:.5rem;background:var(--surface-high);color:var(--on-surface-muted)}.theme-toggle:hover{color:var(--accent);background:var(--accent-soft)}</style>
