<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'

const {
  description,
  returnLabel = '返回文章',
  returnTo = '/posts',
  title,
} = defineProps<{
  description: string
  returnLabel?: string
  returnTo?: string
  title: string
}>()
</script>

<template>
  <main class="not-found-page page-shell">
    <p class="eyebrow">404</p>
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    <NuxtLink :to="returnTo">
      <ArrowLeft :size="18" aria-hidden="true" />
      {{ returnLabel }}
    </NuxtLink>
  </main>
</template>

<style scoped>
.not-found-page {
  display: grid;
  flex: 1;
  align-content: center;
  justify-items: start;
  min-height: min(42rem, 70vh);
  padding-block: var(--space-3xl);
}

.not-found-page .eyebrow { margin: 0 0 var(--space-sm); }

.not-found-page h1 {
  max-width: 12ch;
  margin: 0;
  font-family: var(--font-reading);
  font-size: clamp(2.7rem, 7vw, 5.75rem);
  font-weight: 600;
  letter-spacing: -0.05em;
  line-height: 1;
}

.not-found-page > p:last-of-type {
  max-width: 34rem;
  margin: var(--space-lg) 0;
  color: var(--on-surface-muted);
}

.not-found-page a {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: 0.72rem 1rem;
  border-radius: 0.375rem;
  color: var(--surface-elevated);
  background: linear-gradient(135deg, var(--accent), var(--accent-container));
  font-weight: 700;
}

.not-found-page a:hover { background: linear-gradient(135deg, var(--accent-container), var(--accent)); }
</style>
