<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { useTheme } from '@/composables/useTheme'
const { theme, label, initialize, toggle } = useTheme()
onMounted(initialize)
</script>
<template><button class="theme-toggle" type="button" :aria-label="label" :title="label" @click="toggle"><Sun v-if="theme === 'dark'" :size="17" /><Moon v-else :size="17" /></button></template>
<style scoped>.theme-toggle{display:grid;width:2.25rem;height:2.25rem;place-items:center;border:1px solid var(--border);border-radius:.5rem;background:transparent;color:var(--text-muted)}.theme-toggle:hover{color:var(--accent);background:var(--accent-soft)}</style>
