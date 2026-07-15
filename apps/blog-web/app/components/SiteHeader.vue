<script setup lang="ts">
import { Menu, X } from '@lucide/vue'
import { shallowRef } from 'vue'
import { site } from '~/config/site'

const isMenuOpen = shallowRef(false)
const links = [
  { label: '文章', to: '/posts' },
  { label: '归档', to: '/archive' },
  { label: '关于', to: '/about' },
]
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner page-shell">
      <NuxtLink class="site-brand" to="/" @click="isMenuOpen = false">
        <span>{{ site.shortName }}</span>
      </NuxtLink>
      <nav class="desktop-nav" aria-label="主导航">
        <NuxtLink v-for="link in links" :key="link.to" class="nav-link" :to="link.to">{{ link.label }}</NuxtLink>
        <ThemeToggle />
      </nav>
      <div class="mobile-actions">
        <ThemeToggle />
        <button class="menu-button" type="button" :aria-expanded="isMenuOpen" aria-label="切换导航菜单" @click="isMenuOpen = !isMenuOpen">
          <X v-if="isMenuOpen" :size="20" aria-hidden="true" />
          <Menu v-else :size="20" aria-hidden="true" />
        </button>
      </div>
    </div>
    <nav v-if="isMenuOpen" class="mobile-nav page-shell" aria-label="移动端主导航">
      <NuxtLink v-for="link in links" :key="link.to" class="mobile-nav__link" :to="link.to" @click="isMenuOpen = false">{{ link.label }}</NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
.site-header { position: sticky; z-index: 10; top: 0; background: color-mix(in srgb, var(--surface-container) 80%, transparent); backdrop-filter: blur(20px); }
.site-header__inner { display: flex; min-height: 4.45rem; align-items: center; justify-content: space-between; }
.site-brand { display: inline-flex; min-height: 2.5rem; align-items: center; font-size: 0.95rem; font-weight: 750; letter-spacing: -0.03em; }
.desktop-nav, .mobile-actions { display: flex; align-items: center; gap: var(--space-md); }
.nav-link { display: inline-flex; min-height: 2.5rem; align-items: center; padding-inline: var(--space-xs); border-radius: 0.375rem; color: var(--on-surface-muted); font-size: 0.9rem; }
.nav-link:hover, .nav-link.router-link-active { color: var(--on-surface); background: var(--surface-low); }
.menu-button { display: inline-grid; width: 2.5rem; height: 2.5rem; place-items: center; border: 0; border-radius: 0.375rem; color: var(--on-surface); background: var(--surface-high); }
.mobile-nav { display: grid; padding-block: var(--space-sm) var(--space-md); }
.mobile-nav__link { display: flex; min-height: 2.5rem; align-items: center; padding: var(--space-sm); border-radius: 0.375rem; font-weight: 650; }.mobile-nav__link:hover { background: var(--surface-low); }
.mobile-actions, .mobile-nav { display: none; }
@media (max-width: 640px) { .desktop-nav { display: none; } .mobile-actions, .mobile-nav { display: flex; } .mobile-nav { flex-direction: column; } }
</style>
