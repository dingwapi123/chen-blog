<script setup lang="ts">
const route = useRoute()
const categorySlug = computed(() => String(route.params.categorySlug))
const { data: categories } = await useAsyncData('categories', fetchCategories)
const { data: posts } = await useAsyncData('category-posts', fetchPublishedPosts)
const category = computed(() => categories.value?.find((item) => item.slug === categorySlug.value))
const filteredPosts = computed(() => posts.value?.filter((post) => post.category?.slug === categorySlug.value) ?? [])
const isNotFound = computed(() => !category.value)

useNotFoundResponse(isNotFound, '分类不存在。')
usePageSeo({
  title: computed(() => category.value?.name ?? '没有找到这个分类'),
  description: computed(() => category.value?.description ?? '这个分类可能尚未公开，或已经移动。'),
  noindex: isNotFound,
})
</script>

<template>
  <PublicNotFound
    v-if="isNotFound"
    description="这个分类可能尚未公开，或已经移动。"
    title="没有找到这个分类"
  />
  <main v-else-if="category" class="page-shell page-section taxonomy-page">
    <header>
      <p class="eyebrow">category</p>
      <h1 class="section-title">{{ category.name }}</h1>
      <p>{{ category.description }}</p>
    </header>
    <PostList :posts="filteredPosts" />
  </main>
</template>

<style scoped>
.taxonomy-page { padding-top: var(--space-3xl); }
.taxonomy-page header { margin-bottom: var(--space-xl); }
.taxonomy-page p { color: var(--text-muted); }
.taxonomy-page .eyebrow { margin: 0 0 var(--space-sm); color: var(--accent); }
</style>
