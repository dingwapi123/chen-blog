<script setup lang="ts">
import {
  createArticleHeadingPlugin,
  createContentSecurityPlugins,
  getPostImagesPublicUrlPrefix,
} from '@chen-blog/content-rules'

defineProps<{ content: string }>()

const config = useRuntimeConfig()
const allowedImagePrefixes = config.public.supabaseUrl
  ? [getPostImagesPublicUrlPrefix(config.public.supabaseUrl)]
  : []
const contentSecurityPlugins = createContentSecurityPlugins({ allowedImagePrefixes })
const rendererPlugins = [...contentSecurityPlugins, createArticleHeadingPlugin()]
</script>

<template>
  <article class="markdown-content">
    <Comark
      :markdown="content"
      :options="{ html: false }"
      :plugins="rendererPlugins"
    />
  </article>
</template>

<style scoped>
.markdown-content { color: var(--on-surface); font-family: var(--font-reading); font-size: clamp(1.08rem, 1.02rem + 0.2vw, 1.18rem); line-height: 1.9; }
.markdown-content :deep(h2), .markdown-content :deep(h3), .markdown-content :deep(h4) { margin: 2.6em 0 0.85em; scroll-margin-top: 6rem; font-family: var(--font-ui); letter-spacing: -0.04em; line-height: 1.16; }
.markdown-content :deep(h2) { font-size: 1.65em; }
.markdown-content :deep(h3) { font-size: 1.28em; }
.markdown-content :deep(h4) { font-size: 1.08em; }
.markdown-content :deep(p), .markdown-content :deep(ul), .markdown-content :deep(ol) { margin: 1.2em 0; }
.markdown-content :deep(a) { color: var(--accent); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 0.16em; }
.markdown-content :deep(blockquote) { margin: 1.6em 0; padding: 0.25em 0 0.25em 1.15em; border-left: 2px solid var(--accent); color: var(--on-surface-muted); }
.markdown-content :deep(code) { font-family: var(--font-code); }
.markdown-content :deep(:not(pre) > code) { padding: 0.13em 0.32em; border-radius: 0.25rem; background: var(--surface-highest); font-size: 0.82em; }
.markdown-content :deep(img) { display: block; width: auto; max-width: 100%; height: auto; margin: var(--space-xl) auto; border-radius: 0.5rem; background: var(--surface-low); }
.markdown-content :deep(table) { display: block; overflow-x: auto; width: 100%; margin: var(--space-xl) 0; border-spacing: 0; font-family: var(--font-ui); font-size: 0.88em; }
.markdown-content :deep(th), .markdown-content :deep(td) { padding: var(--space-sm) var(--space-md); background: var(--surface-low); text-align: left; }
.markdown-content :deep(th) { color: var(--on-surface-muted); font-weight: 700; }
.markdown-content :deep(hr) { height: 0.2rem; width: 3rem; margin: var(--space-2xl) auto; border: 0; border-radius: 999px; background: var(--accent); }
</style>
