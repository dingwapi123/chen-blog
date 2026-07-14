<script setup lang="ts">
import {
  createContentSecurityPlugins,
  getPostImagesPublicUrlPrefix,
} from '@chen-blog/content-rules'

defineProps<{ content: string }>()

const config = useRuntimeConfig()
const allowedImagePrefixes = config.public.supabaseUrl
  ? [getPostImagesPublicUrlPrefix(config.public.supabaseUrl)]
  : []
const contentSecurityPlugins = createContentSecurityPlugins({ allowedImagePrefixes })
type ContentPlugin = ReturnType<typeof createContentSecurityPlugins>[number]

const demoteBodyH1Plugin: ContentPlugin = {
  name: 'chen-blog-demote-body-h1',
  post(state) {
    function demoteHeadings(nodes: typeof state.tree.nodes): void {
      for (const node of nodes) {
        if (typeof node === 'string' || node[0] === null) continue
        if (node[0] === 'h1') node[0] = 'h2'

        const [, , ...children] = node
        demoteHeadings(children)
      }
    }

    demoteHeadings(state.tree.nodes)
  },
}

const rendererPlugins = [...contentSecurityPlugins, demoteBodyH1Plugin]
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
.markdown-content { color: var(--text); font-family: var(--font-reading); font-size: clamp(1.08rem, 1.02rem + 0.2vw, 1.18rem); line-height: 1.9; }
.markdown-content :deep(h1), .markdown-content :deep(h2), .markdown-content :deep(h3) { margin: 2.6em 0 0.85em; font-family: var(--font-ui); letter-spacing: -0.04em; line-height: 1.16; }
.markdown-content :deep(h2) { font-size: 1.65em; }
.markdown-content :deep(h3) { font-size: 1.28em; }
.markdown-content :deep(p), .markdown-content :deep(ul), .markdown-content :deep(ol) { margin: 1.2em 0; }
.markdown-content :deep(a) { color: var(--accent); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 0.16em; }
.markdown-content :deep(blockquote) { margin: 1.6em 0; padding: 0.25em 0 0.25em 1.15em; border-left: 2px solid var(--accent); color: var(--text-muted); }
.markdown-content :deep(pre) { overflow-x: auto; margin: 1.6em 0 var(--space-xl); padding: 1.15rem; border: 0; border-radius: 0.375rem; background: var(--code-bg); color: var(--code-on-surface); font-family: var(--font-code); font-size: 0.8em; line-height: 1.7; }
.markdown-content :deep(code) { font-family: var(--font-code); }
.markdown-content :deep(:not(pre) > code) { padding: 0.13em 0.32em; border-radius: 0.25rem; background: var(--code-bg); font-size: 0.82em; }
.markdown-content :deep(img) { display: block; width: auto; max-width: 100%; height: auto; margin: var(--space-xl) auto; border-radius: 0.5rem; background: var(--surface-low); }
.markdown-content :deep(table) { display: block; overflow-x: auto; width: 100%; margin: var(--space-xl) 0; border-spacing: 0; font-family: var(--font-ui); font-size: 0.88em; }
.markdown-content :deep(th), .markdown-content :deep(td) { padding: var(--space-sm) var(--space-md); background: var(--surface-low); text-align: left; }
.markdown-content :deep(th) { color: var(--text-muted); font-weight: 700; }
.markdown-content :deep(hr) { height: 0.2rem; width: 3rem; margin: var(--space-2xl) auto; border: 0; border-radius: 999px; background: var(--accent); }
</style>
