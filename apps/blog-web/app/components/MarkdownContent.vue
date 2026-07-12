<script setup lang="ts">
defineProps<{ content: string }>()
</script>

<template><MDC class="markdown-content" :value="content" tag="article" /></template>

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
</style>
