<script setup lang="ts">
const route = useRoute()
const categorySlug = computed(() => String(route.params.categorySlug))
const { data: categories } = await useAsyncData('categories', fetchCategories)
const { data: posts } = await useAsyncData('category-posts', fetchPublishedPosts)
const category = computed(() => categories.value?.find((item) => item.slug === categorySlug.value))
const filteredPosts = computed(() => posts.value?.filter((post) => post.category?.slug === categorySlug.value) ?? [])
if (!category.value) throw createError({ statusCode: 404, statusMessage: '分类不存在。' })
useSeoMeta({ title: category.value.name, description: category.value.description })
</script>

<template><main class="page-shell page-section taxonomy-page"><header><p class="eyebrow">category</p><h1 class="section-title">{{ category!.name }}</h1><p>{{ category!.description }}</p></header><PostList :posts="filteredPosts" /></main></template>

<style scoped>.taxonomy-page { padding-top: var(--space-3xl); }.taxonomy-page header { margin-bottom: var(--space-xl); }.taxonomy-page p { color: var(--text-muted); }.taxonomy-page .eyebrow { margin: 0 0 var(--space-sm); color: var(--accent); }</style>
