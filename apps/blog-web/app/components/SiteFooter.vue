<script setup lang="ts">
import { site } from '~/config/site'
</script>

<template>
  <footer class="site-footer">
    <div class="page-shell site-footer__inner">
      <div>
        <p class="site-footer__name">{{ site.title }}</p>
        <p class="site-footer__note">写下值得长期保留的理解。</p>
      </div>
      <div class="site-footer__links">
        <a :href="site.links.github" rel="noreferrer" target="_blank">GitHub</a>
        <a :href="site.links.rss">RSS</a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer { margin-top: auto; background: var(--surface-low); }
.site-footer__inner { display: flex; align-items: end; justify-content: space-between; gap: var(--space-lg); padding-block: var(--space-xl); }
.site-footer__name, .site-footer__note { margin: 0; }
.site-footer__name { font-weight: 700; }
.site-footer__note { margin-top: var(--space-2xs); color: var(--on-surface-muted); font-size: 0.9rem; }
.site-footer__links { display: flex; flex-wrap: wrap; gap: var(--space-md); color: var(--on-surface-muted); font-size: 0.9rem; }
.site-footer__links a:hover { color: var(--accent); }
@media (max-width: 640px) { .site-footer__inner { align-items: start; flex-direction: column; } }
</style>
