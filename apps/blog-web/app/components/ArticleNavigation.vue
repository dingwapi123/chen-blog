<script setup lang="ts">
import { ArrowLeft, ArrowRight } from '@lucide/vue'
import type { ArticleNavigationItem } from '@chen-blog/shared-types'

defineProps<{
  previous: ArticleNavigationItem | null
  next: ArticleNavigationItem | null
}>()
</script>

<template>
  <nav v-if="previous || next" class="article-navigation" aria-label="相邻文章">
    <NuxtLink v-if="previous" class="article-navigation__link" :to="`/posts/${previous.slug}`">
      <ArrowLeft :size="18" aria-hidden="true" />
      <span>
        <small>上一篇</small>
        <strong>{{ previous.title }}</strong>
      </span>
    </NuxtLink>
    <span v-else />
    <NuxtLink v-if="next" class="article-navigation__link article-navigation__link--next" :to="`/posts/${next.slug}`">
      <span>
        <small>下一篇</small>
        <strong>{{ next.title }}</strong>
      </span>
      <ArrowRight :size="18" aria-hidden="true" />
    </NuxtLink>
  </nav>
</template>

<style scoped>
.article-navigation { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-md); margin-top: var(--space-xl); }
.article-navigation__link { display: flex; min-width: 0; align-items: center; gap: var(--space-sm); padding: var(--space-md); border-radius: 0.5rem; background: var(--surface-low); transition: color 160ms ease, background-color 160ms ease; }
.article-navigation__link:hover { color: var(--accent); background: var(--accent-soft); }
.article-navigation__link span { display: grid; min-width: 0; }
.article-navigation__link small { color: var(--on-surface-faint); font-size: 0.75rem; }
.article-navigation__link strong { overflow: hidden; font-size: 0.92rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.article-navigation__link--next { justify-content: flex-end; text-align: right; }
@media (max-width: 640px) { .article-navigation { grid-template-columns: 1fr; }.article-navigation > span { display: none; } }
</style>
