<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { formatDate } from '@chen-blog/shared-utils'

const route = useRoute()
const postSlug = computed(() => String(route.params.postSlug))
const { data: post } = await useAsyncData(() => `post-${postSlug.value}`, () => fetchPublishedPost(postSlug.value))

if (!post.value) throw createError({ statusCode: 404, statusMessage: '文章不存在或尚未发布。' })

useSeoMeta({ title: post.value.title, description: post.value.summary, articlePublishedTime: post.value.publishedAt, articleModifiedTime: post.value.updatedAt })
</script>

<template>
  <main class="article-page">
    <article class="article-shell">
      <NuxtLink class="back-link" to="/posts"><ArrowLeft :size="16" aria-hidden="true" /> 返回文章</NuxtLink>
      <header class="article-header">
        <PostMeta :post="post!" />
        <h1>{{ post!.title }}</h1>
        <p class="article-summary">{{ post!.summary }}</p>
        <p class="article-updated">更新于 <time :datetime="post!.updatedAt">{{ formatDate(post!.updatedAt) }}</time></p>
      </header>
      <MarkdownContent :content="post!.content" />
      <footer class="article-footer"><NuxtLink v-for="tag in post!.tags" :key="tag.id" :to="`/tags/${tag.slug}`"># {{ tag.name }}</NuxtLink></footer>
    </article>
  </main>
</template>

<style scoped>
.article-page { padding-block: var(--space-3xl); }.article-shell { width: min(100% - 2.5rem, 44rem); margin: 0 auto; }.back-link { display: inline-flex; align-items: center; gap: var(--space-xs); color: var(--text-muted); font-size: 0.88rem; }.back-link:hover { color: var(--accent); }.article-header { margin: var(--space-xl) 0 var(--space-2xl); }.article-header h1 { margin: var(--space-sm) 0 0; font-size: clamp(2.4rem, 6vw, 4.75rem); font-weight: 600; letter-spacing: -0.06em; line-height: 1.02; }.article-summary { margin: var(--space-lg) 0 0; color: var(--text-muted); font-size: 1.15rem; }.article-updated { margin: var(--space-md) 0 0; color: var(--text-faint); font-size: 0.84rem; }.article-footer { display: flex; flex-wrap: wrap; gap: var(--space-sm); margin-top: var(--space-2xl); padding-top: var(--space-lg); border-top: 1px solid var(--border); }.article-footer a { color: var(--text-muted); font-size: 0.88rem; }.article-footer a:hover { color: var(--accent); }@media (max-width: 640px) { .article-shell { width: min(100% - 2rem, 44rem); } }
</style>
