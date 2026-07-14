<script setup lang="ts">
import type { NuxtError } from '#app'
import { ArrowLeft } from 'lucide-vue-next'

const props = defineProps<{ error: NuxtError }>()
const isNotFound = computed(() => props.error.statusCode === 404)
const title = computed(() => isNotFound.value ? '没有找到这个页面' : '页面暂时无法打开')
const description = computed(() => isNotFound.value
  ? '它可能已经移动，或从未公开发布。'
  : '请稍后再试，或者先返回首页。')

useSeoMeta({
  title: () => `${title.value} · Chen Blog`,
  description,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <UApp>
    <div class="app-shell">
      <SiteHeader />
      <main class="error-page page-shell">
        <p class="eyebrow">{{ error.statusCode }}</p>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
        <button type="button" @click="clearError({ redirect: '/' })">
          <ArrowLeft :size="18" aria-hidden="true" />
          返回首页
        </button>
      </main>
      <SiteFooter />
    </div>
  </UApp>
</template>

<style scoped>
.error-page { display: grid; flex: 1; align-content: center; justify-items: start; padding-block: var(--space-3xl); }
.error-page .eyebrow { margin: 0 0 var(--space-sm); }
.error-page h1 { max-width: 12ch; margin: 0; font-family: var(--font-reading); font-size: clamp(2.7rem, 7vw, 5.75rem); font-weight: 600; letter-spacing: -0.05em; line-height: 1; }
.error-page > p:last-of-type { max-width: 34rem; margin: var(--space-lg) 0; color: var(--text-muted); }
.error-page button { display: inline-flex; align-items: center; gap: var(--space-sm); padding: 0.72rem 1rem; border: 0; border-radius: 0.55rem; color: var(--bg-elevated); background: var(--accent); font-weight: 700; }
.error-page button:hover { background: var(--accent-hover); }
</style>
