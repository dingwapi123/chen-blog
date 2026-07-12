<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import type { PostPreview } from '@chen-blog/shared-types'

defineProps<{ posts: PostPreview[] }>()
</script>

<template>
  <ol class="post-list">
    <li v-for="post in posts" :key="post.id" class="post-list__item">
      <article class="post-list__article">
        <PostMeta :post="post" />
        <NuxtLink class="post-list__title" :to="`/posts/${post.slug}`">
          <span>{{ post.title }}</span><ArrowUpRight :size="22" aria-hidden="true" />
        </NuxtLink>
        <p class="post-list__summary">{{ post.summary }}</p>
        <div class="post-list__tags">
          <NuxtLink v-for="tag in post.tags" :key="tag.id" :to="`/tags/${tag.slug}`"># {{ tag.name }}</NuxtLink>
        </div>
      </article>
    </li>
  </ol>
</template>

<style scoped>
.post-list { display: grid; margin: 0; padding: 0; list-style: none; }
.post-list__item { border-top: 1px solid var(--border); }
.post-list__item:last-child { border-bottom: 1px solid var(--border); }
.post-list__article { padding-block: var(--space-lg); }
.post-list__title { display: flex; align-items: start; justify-content: space-between; gap: var(--space-md); margin-top: var(--space-xs); font-size: clamp(1.3rem, 2.5vw, 1.85rem); font-weight: 650; letter-spacing: -0.04em; line-height: 1.2; }
.post-list__title svg { flex: none; margin-top: 0.1em; color: var(--text-faint); transition: transform 160ms ease, color 160ms ease; }
.post-list__title:hover { color: var(--accent); }
.post-list__title:hover svg { color: var(--accent); transform: translate(0.14rem, -0.14rem); }
.post-list__summary { max-width: 65ch; margin: var(--space-sm) 0 0; color: var(--text-muted); }
.post-list__tags { display: flex; flex-wrap: wrap; gap: var(--space-sm); margin-top: var(--space-md); }
.post-list__tags a { color: var(--text-muted); font-size: 0.82rem; }
.post-list__tags a:hover { color: var(--accent); }
</style>
