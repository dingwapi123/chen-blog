<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import { formatDate } from '@chen-blog/shared-utils'

const { data: posts } = await useAsyncData('archive-posts', fetchPublishedPosts)
const yearGroups = computed(() => groupPostsByYear(posts.value ?? []))

usePageSeo({
  title: '归档',
  description: '按年份浏览陈信至发布过的技术文章与学习笔记。',
})
</script>

<template>
  <main class="page-shell page-section archive-page">
    <header class="archive-heading">
      <p class="eyebrow">archive</p>
      <h1 class="section-title">归档</h1>
      <p>沿着时间，回看已经写下的理解。</p>
    </header>

    <div v-if="yearGroups.length" class="archive-groups">
      <section v-for="group in yearGroups" :key="group.year" class="archive-group">
        <h2>{{ group.year }}</h2>
        <ol>
          <li v-for="post in group.posts" :key="post.id">
            <time :datetime="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
            <NuxtLink :to="`/posts/${post.slug}`">
              <span>{{ post.title }}</span>
              <ArrowUpRight :size="18" aria-hidden="true" />
            </NuxtLink>
          </li>
        </ol>
      </section>
    </div>
    <p v-else class="archive-empty">还没有发布文章。</p>
  </main>
</template>

<style scoped>
.archive-page { padding-top: var(--space-3xl); }
.archive-heading { margin-bottom: var(--space-2xl); }
.archive-heading .eyebrow, .archive-heading > p { margin: 0 0 var(--space-sm); }
.archive-heading > p:last-child { color: var(--on-surface-muted); }
.archive-groups { display: grid; gap: var(--space-2xl); }
.archive-group { display: grid; grid-template-columns: minmax(6rem, 0.3fr) minmax(0, 1.7fr); gap: var(--space-xl); }
.archive-group h2 { margin: 0; color: var(--on-surface-faint); font-family: var(--font-reading); font-size: clamp(2rem, 5vw, 3.4rem); font-weight: 500; letter-spacing: -0.04em; line-height: 1; }
.archive-group ol { display: grid; gap: var(--space-xs); margin: 0; padding: 0; list-style: none; }
.archive-group li { display: grid; grid-template-columns: 7rem minmax(0, 1fr); align-items: baseline; gap: var(--space-md); padding: var(--space-sm); border-radius: 0.45rem; }
.archive-group li:hover { background: var(--surface-low); }
.archive-group time { color: var(--on-surface-faint); font-size: 0.78rem; }
.archive-group a { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: var(--space-md); font-weight: 650; }
.archive-group a span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.archive-group a svg { flex: none; color: var(--on-surface-faint); transition: color 160ms ease, transform 160ms ease; }
.archive-group a:hover { color: var(--accent); }
.archive-group a:hover svg { color: var(--accent); transform: translate(0.14rem, -0.14rem); }
.archive-empty { color: var(--on-surface-muted); }
@media (max-width: 640px) { .archive-group { grid-template-columns: 1fr; gap: var(--space-md); }.archive-group li { grid-template-columns: 5.5rem minmax(0, 1fr); } }
</style>
