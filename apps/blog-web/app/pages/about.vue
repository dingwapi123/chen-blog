<script setup lang="ts">
import { site } from '~/config/site'
usePageSeo({ title: '关于', description: site.description })
</script>

<template><main class="page-shell page-section about-page"><p class="eyebrow">about</p><h1 class="section-title">{{ site.name }}</h1><p class="about-page__lead">{{ site.introduction }}</p><div class="about-page__body"><p>这里是一个长期维护的个人技术博客。它不会追逐所有新鲜事，只希望把真正理解过的内容写得更清楚一些。</p><p>如果你也在思考如何更好地构建、学习与工作，可以通过 GitHub 找到我。</p><a class="text-link" :href="site.links.github" rel="noreferrer" target="_blank">访问 GitHub</a></div></main></template>

<style scoped>.about-page { width: min(100% - 2.5rem, 44rem); padding-top: var(--space-3xl); }.about-page .eyebrow { margin: 0 0 var(--space-sm); }.about-page__lead { max-width: 38rem; margin: var(--space-lg) 0 0; color: var(--text-muted); font-size: 1.2rem; }.about-page__body { margin-top: var(--space-2xl); font-family: var(--font-reading); font-size: 1.12rem; line-height: 1.9; }.about-page__body p { margin: 1.2em 0; }</style>
