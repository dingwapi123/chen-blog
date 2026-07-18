<script setup lang="ts">
import { extractArticleHeadings } from '@chen-blog/content-rules'
import { ArrowLeft } from '@lucide/vue'
import { formatDate } from '@chen-blog/shared-utils'

const route = useRoute()
const postSlug = computed(() => String(route.params.postSlug))
const { data: articleData } = await useAsyncData(
  () => `post-${postSlug.value}`,
  async () => {
    const page = await fetchPublishedPostPage(postSlug.value)
    const headings = page ? await extractArticleHeadings(page.post.content) : []
    return { page, headings }
  },
)
const post = computed(() => articleData.value?.page?.post ?? null)
const articleHeadings = computed(() => articleData.value?.headings ?? [])
const isNotFound = computed(() => !post.value)
const resolvePublicMediaUrl = usePublicMediaUrl()

useNotFoundResponse(isNotFound, '文章不存在或尚未发布。')

const coverUrl = computed(() => post.value?.cover ? resolvePublicMediaUrl(post.value.cover) : '')
const navigation = computed(() => articleData.value?.page?.navigation ?? { previous: null, next: null })

usePageSeo({
  title: computed(() => post.value?.title ?? '没有找到这篇文章'),
  description: computed(() => post.value?.summary ?? '这篇文章可能尚未发布，或已经移动。'),
  image: computed(() => coverUrl.value || undefined),
  type: 'article',
  publishedTime: computed(() => post.value?.publishedAt),
  modifiedTime: computed(() => post.value?.updatedAt),
  noindex: isNotFound,
})
</script>

<template>
  <PublicNotFound
    v-if="isNotFound"
    description="这篇文章可能尚未发布，或已经移动。"
    title="没有找到这篇文章"
  />
  <main v-else class="article-page">
    <article v-if="post" class="article-shell">
      <NuxtLink class="back-link" to="/posts"><ArrowLeft :size="16" aria-hidden="true" /> 返回文章</NuxtLink>
      <header class="article-header">
        <PostMeta :post="post" />
        <h1>{{ post.title }}</h1>
        <p class="article-summary">{{ post.summary }}</p>
        <p class="article-updated">更新于 <time :datetime="post.updatedAt">{{ formatDate(post.updatedAt) }}</time></p>
      </header>
      <figure v-if="post.cover && coverUrl" class="article-cover">
        <NuxtImg
          :alt="post.cover.altText"
          class="article-cover__image"
          fetchpriority="high"
          height="720"
          loading="eager"
          :src="coverUrl"
          sizes="sm:100vw md:768px lg:1152px"
          width="1200"
        />
      </figure>
      <ArticleToc :headings="articleHeadings" />
      <MarkdownContent :content="post.content" />
      <footer v-if="post.tags.length" class="article-footer"><NuxtLink v-for="tag in post.tags" :key="tag.id" :to="`/tags/${tag.slug}`"># {{ tag.name }}</NuxtLink></footer>
      <ArticleNavigation
        :next="navigation?.next ?? null"
        :previous="navigation?.previous ?? null"
      />
    </article>
  </main>
</template>

<style scoped>
.article-page { padding-block: var(--space-3xl); }.article-shell { width: min(100% - 2.5rem, 44rem); margin: 0 auto; }.back-link { display: inline-flex; min-height: 2.5rem; align-items: center; gap: var(--space-xs); color: var(--on-surface-muted); font-size: 0.88rem; }.back-link:hover { color: var(--accent); }.article-header { margin: var(--space-xl) 0 var(--space-2xl); }.article-header h1 { margin: var(--space-sm) 0 0; font-size: clamp(2.4rem, 6vw, 4.75rem); font-weight: 600; letter-spacing: -0.06em; line-height: 1.02; }.article-summary { margin: var(--space-lg) 0 0; color: var(--on-surface-muted); font-size: 1.15rem; }.article-updated { margin: var(--space-md) 0 0; color: var(--on-surface-faint); font-size: 0.84rem; }.article-cover { width: min(72rem, calc(100vw - 2.5rem)); margin: 0 0 var(--space-2xl) 50%; transform: translateX(-50%); }.article-cover__image { display: block; width: 100%; aspect-ratio: 5 / 3; border-radius: 0.5rem; background: var(--surface-low); object-fit: cover; }.article-footer { display: flex; flex-wrap: wrap; gap: var(--space-sm); margin-top: var(--space-2xl); padding: var(--space-md); border-radius: 0.5rem; background: var(--surface-low); }.article-footer a { display: inline-flex; min-height: 2.5rem; align-items: center; color: var(--on-surface-muted); font-size: 0.88rem; }.article-footer a:hover { color: var(--accent); }@media (max-width: 640px) { .article-shell { width: min(100% - 2rem, 44rem); }.article-cover { width: calc(100vw - 2rem); } }
</style>
