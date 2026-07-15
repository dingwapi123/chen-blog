<script setup lang="ts">
import { ArrowDownRight, ArrowUpRight } from '@lucide/vue'
import { site } from '~/config/site'

const { data: posts } = await useAsyncData('home-posts', fetchPublishedPosts)
const { data: categories } = await useAsyncData('home-categories', fetchCategories)
const latestPosts = computed(() => (posts.value ?? []).slice(0, 6))

usePageSeo({ title: site.title, description: site.description })
</script>

<template>
  <main>
    <section class="home-hero">
      <div class="home-hero__texture" aria-hidden="true" />
      <div class="page-shell home-hero__content">
        <p class="eyebrow home-hero__eyebrow">{{ site.shortName }} · personal notes</p>
        <h1 class="display-title home-hero__title">为值得反复理解的事，留下文字。</h1>
        <p class="home-hero__intro">{{ site.introduction }}</p>
        <div class="home-hero__actions">
          <NuxtLink class="primary-action" to="/posts">阅读文章 <ArrowDownRight :size="18" aria-hidden="true" /></NuxtLink>
          <NuxtLink class="secondary-action" to="/about">了解我</NuxtLink>
        </div>
      </div>
    </section>

    <section class="page-shell page-section">
      <div class="section-heading">
        <div><p class="eyebrow">recent writing</p><h2 class="section-title">最近写了什么</h2></div>
        <NuxtLink class="section-link" to="/posts">所有文章 <ArrowUpRight :size="16" aria-hidden="true" /></NuxtLink>
      </div>
      <PostList :posts="latestPosts" />
    </section>

    <section class="page-shell page-section home-topics">
      <div><p class="eyebrow">topics</p><h2 class="section-title">我持续关注的主题</h2></div>
      <div class="topic-grid">
        <NuxtLink v-for="category in categories ?? []" :key="category.id" class="topic-link" :to="`/categories/${category.slug}`">
          <span class="topic-link__name">{{ category.name }}</span>
          <span class="topic-link__description">{{ category.description }}</span>
          <ArrowUpRight :size="18" aria-hidden="true" />
        </NuxtLink>
      </div>
    </section>

    <section class="page-shell page-section home-about">
      <p class="eyebrow">about</p>
      <div class="home-about__content"><h2 class="section-title">{{ site.name }}</h2><p>{{ site.introduction }}</p></div>
    </section>
  </main>
</template>

<style scoped>
.home-hero { position: relative; display: grid; min-height: min(45rem, calc(100svh - 4.45rem)); overflow: hidden; background: var(--surface-container); }
.home-hero__texture { position: absolute; inset: -22%; opacity: 0.82; background-image: linear-gradient(var(--outline-ghost) 1px, transparent 1px), linear-gradient(90deg, var(--outline-ghost) 1px, transparent 1px), radial-gradient(circle at 52% 45%, var(--accent-soft), transparent 30rem); background-size: 3.5rem 3.5rem, 3.5rem 3.5rem, auto; mask-image: radial-gradient(circle at 60% 50%, black, transparent 65%); transform: rotate(-8deg); }
.home-hero__content { position: relative; align-self: center; padding-block: var(--space-3xl); animation: rise-in 420ms ease-out both; }
.home-hero__eyebrow { margin-bottom: var(--space-lg); }
.home-hero__title { max-width: 11ch; }
.home-hero__intro { max-width: 34rem; margin: var(--space-lg) 0 0; color: var(--on-surface-muted); font-size: clamp(1.05rem, 1rem + 0.35vw, 1.25rem); }
.home-hero__actions { display: flex; flex-wrap: wrap; gap: var(--space-md); margin-top: var(--space-xl); }
.primary-action, .secondary-action { display: inline-flex; min-height: 2.5rem; align-items: center; justify-content: center; gap: var(--space-sm); padding: 0.72rem 1rem; border-radius: 0.375rem; font-size: 0.92rem; font-weight: 700; }
.primary-action { color: var(--surface-elevated); background: linear-gradient(135deg, var(--accent), var(--accent-container)); }
.primary-action:hover { background: linear-gradient(135deg, var(--accent-container), var(--accent)); }
.secondary-action { color: var(--accent); background: transparent; }
.secondary-action:hover { color: var(--accent-container); background: var(--surface-high); }
.section-heading { display: flex; align-items: end; justify-content: space-between; gap: var(--space-lg); margin-bottom: var(--space-xl); }
.section-heading .eyebrow, .home-topics .eyebrow, .home-about .eyebrow { margin: 0 0 var(--space-sm); }
.section-link { display: inline-flex; align-items: center; gap: var(--space-xs); color: var(--accent); font-size: 0.9rem; font-weight: 650; white-space: nowrap; }
.home-topics { display: grid; grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr); gap: var(--space-2xl); background: var(--surface-low); }
.topic-grid { display: grid; gap: var(--space-sm); }
.topic-link { position: relative; display: grid; grid-template-columns: 1fr auto; gap: var(--space-xs) var(--space-md); padding: var(--space-lg); border-radius: 0.5rem; background: var(--surface); }
.topic-link__name { font-size: 1.2rem; font-weight: 700; letter-spacing: -0.03em; }
.topic-link__description { grid-column: 1; color: var(--on-surface-muted); font-size: 0.92rem; }
.topic-link svg { grid-column: 2; grid-row: 1 / span 2; color: var(--on-surface-faint); transition: transform 160ms ease, color 160ms ease; }
.topic-link:hover { color: var(--accent); }.topic-link:hover svg { color: var(--accent); transform: translate(0.14rem, -0.14rem); }
.home-about { background: var(--surface-container); }.home-about__content { display: grid; grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr); gap: var(--space-2xl); }.home-about__content p { max-width: 40rem; margin: 0; color: var(--on-surface-muted); font-size: 1.15rem; }
@keyframes rise-in { from { opacity: 0; transform: translateY(0.8rem); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 700px) { .home-hero { min-height: 39rem; }.home-topics, .home-about__content { grid-template-columns: 1fr; gap: var(--space-xl); }.section-heading { align-items: start; flex-direction: column; }.display-title { max-width: 10ch; } }
</style>
