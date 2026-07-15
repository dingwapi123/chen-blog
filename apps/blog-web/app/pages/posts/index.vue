<script setup lang="ts">
const { data: posts } = await useAsyncData('posts', fetchPublishedPosts)
usePageSeo({ title: '文章', description: '陈信至的技术文章与学习笔记。' })
</script>

<template>
  <main class="page-shell page-section posts-page">
    <header class="page-heading"><p class="eyebrow">all writing</p><h1 class="section-title">文章</h1><p>关于构建、学习和保持清醒的一些记录。</p></header>
    <PostList :posts="posts ?? []" />
  </main>
</template>

<style scoped>
.posts-page { padding-top: var(--space-3xl); }.page-heading { margin-bottom: var(--space-xl); }.page-heading .eyebrow, .page-heading p { margin: 0 0 var(--space-sm); }.page-heading > p:last-child { color: var(--on-surface-muted); }
</style>
