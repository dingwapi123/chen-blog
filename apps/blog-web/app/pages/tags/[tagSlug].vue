<script setup lang="ts">
const route = useRoute()
const tagSlug = computed(() => String(route.params.tagSlug))
const { data: tags } = await useAsyncData('tags', fetchTags)
const { data: posts } = await useAsyncData('tag-posts', fetchPublishedPosts)
const tag = computed(() => tags.value?.find((item) => item.slug === tagSlug.value))
const filteredPosts = computed(() => posts.value?.filter((post) => post.tags.some((item) => item.slug === tagSlug.value)) ?? [])
if (!tag.value) throw createError({ statusCode: 404, statusMessage: '标签不存在。' })
usePageSeo({
  title: computed(() => tag.value ? `# ${tag.value.name}` : '标签'),
  description: computed(() => tag.value ? `所有标记为 ${tag.value.name} 的文章。` : '按标签浏览文章。'),
})
</script>

<template><main v-if="tag" class="page-shell page-section taxonomy-page"><header><p class="eyebrow">tag</p><h1 class="section-title"># {{ tag.name }}</h1><p>所有带有这个标签的文章。</p></header><PostList :posts="filteredPosts" /></main></template>

<style scoped>.taxonomy-page { padding-top: var(--space-3xl); }.taxonomy-page header { margin-bottom: var(--space-xl); }.taxonomy-page p { color: var(--text-muted); }.taxonomy-page .eyebrow { margin: 0 0 var(--space-sm); color: var(--accent); }</style>
