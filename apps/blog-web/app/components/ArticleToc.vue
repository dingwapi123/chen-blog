<script setup lang="ts">
import type { ArticleHeading } from '@chen-blog/content-rules'

defineProps<{
  headings: readonly ArticleHeading[]
}>()
</script>

<template>
  <aside v-if="headings.length >= 2" class="article-toc">
    <p class="article-toc__label">本文目录</p>
    <nav aria-label="本文目录">
      <ol class="article-toc__list">
        <li
          v-for="heading in headings"
          :key="heading.id"
          class="article-toc__item"
          :class="`article-toc__item--depth-${heading.depth}`"
        >
          <NuxtLink class="article-toc__link" :to="{ hash: `#${heading.id}` }">
            {{ heading.text }}
          </NuxtLink>
        </li>
      </ol>
    </nav>
  </aside>
</template>

<style scoped>
.article-toc { display: grid; grid-template-columns: minmax(6.5rem, 0.32fr) minmax(0, 1fr); gap: var(--space-lg); margin: 0 0 var(--space-2xl); padding-block: var(--space-md); }
.article-toc__label { margin: 0; padding-top: var(--space-xs); color: var(--accent); font-size: 0.75rem; font-weight: 750; letter-spacing: 0.12em; text-transform: uppercase; }
.article-toc__list { display: grid; gap: var(--space-2xs); margin: 0; padding: 0; list-style: none; }
.article-toc__item { min-width: 0; }
.article-toc__item--depth-3 { padding-left: var(--space-md); }
.article-toc__item--depth-4 { padding-left: calc(var(--space-md) * 2); }
.article-toc__link { display: flex; min-height: 2.5rem; align-items: center; padding: var(--space-2xs) var(--space-xs); border-radius: 0.375rem; color: var(--on-surface-muted); font-size: 0.9rem; line-height: 1.45; transition: color 160ms ease, background-color 160ms ease, transform 160ms ease; }
.article-toc__link:hover { color: var(--accent); background: var(--surface-low); transform: translateX(0.18rem); }
.article-toc__link:focus-visible { color: var(--accent); background: var(--surface-low); }

@media (max-width: 640px) {
  .article-toc { grid-template-columns: 1fr; gap: var(--space-xs); margin-bottom: var(--space-xl); }
  .article-toc__item--depth-3 { padding-left: var(--space-sm); }
  .article-toc__item--depth-4 { padding-left: var(--space-lg); }
}
</style>
