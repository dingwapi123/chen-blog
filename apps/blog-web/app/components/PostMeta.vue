<script setup lang="ts">
import type { PostPreview } from '@chen-blog/shared-types'
import { formatDate } from '@chen-blog/shared-utils'

defineProps<{ post: Pick<PostPreview, 'publishedAt' | 'readingMinutes' | 'category'> }>()
</script>

<template>
  <p class="post-meta">
    <NuxtLink v-if="post.category" :to="`/categories/${post.category.slug}`">{{ post.category.name }}</NuxtLink>
    <span v-if="post.category" aria-hidden="true">·</span>
    <time :datetime="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
    <span aria-hidden="true">·</span>
    <span>{{ post.readingMinutes }} 分钟阅读</span>
  </p>
</template>

<style scoped>
.post-meta { display: flex; flex-wrap: wrap; gap: var(--space-xs); margin: 0; color: var(--on-surface-muted); font-size: 0.82rem; }
.post-meta a:hover { color: var(--accent); }
</style>
