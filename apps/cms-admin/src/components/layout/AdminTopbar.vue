<script setup lang="ts">
import { ExternalLink, Menu, Plus, X } from '@lucide/vue'
import { useTemplateRef } from 'vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const {
  blogUrl,
  description = '',
  mobile = false,
  mobileMenuOpen = false,
  title,
} = defineProps<{
  blogUrl: string
  description?: string
  mobile?: boolean
  mobileMenuOpen?: boolean
  title: string
}>()

defineEmits<{
  toggleMenu: []
}>()

const menuButton = useTemplateRef<HTMLButtonElement>('menuButton')

function focusMenuButton() {
  menuButton.value?.focus()
}

defineExpose({ focusMenuButton })
</script>

<template>
  <header class="admin-topbar">
    <div class="admin-topbar__context">
      <button
        v-if="mobile"
        ref="menuButton"
        class="admin-topbar__menu"
        type="button"
        aria-controls="cms-navigation"
        :aria-expanded="mobileMenuOpen"
        :aria-label="mobileMenuOpen ? '关闭导航菜单' : '打开导航菜单'"
        @click="$emit('toggleMenu')"
      >
        <X v-if="mobileMenuOpen" :size="19" aria-hidden="true" />
        <Menu v-else :size="19" aria-hidden="true" />
      </button>
      <div class="admin-topbar__copy">
        <strong>{{ title }}</strong>
        <span v-if="description">{{ description }}</span>
      </div>
    </div>

    <div class="admin-topbar__actions">
      <a
        class="admin-topbar__action admin-topbar__action--blog"
        :href="blogUrl"
        rel="noreferrer"
        target="_blank"
        title="访问公开博客"
      >
        <ExternalLink :size="17" aria-hidden="true" />
        <span>访问博客</span>
      </a>
      <RouterLink
        class="admin-topbar__create"
        :to="{ name: 'post-new' }"
        title="新建文章"
      >
        <Plus :size="17" aria-hidden="true" />
        <span>新建文章</span>
      </RouterLink>
      <ThemeToggle />
    </div>
  </header>
</template>

<style scoped>
.admin-topbar {
  position: sticky;
  z-index: 15;
  top: 0;
  display: flex;
  min-height: var(--topbar-height);
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem clamp(1rem, 2.3vw, 2rem);
  border-bottom: 1px solid var(--outline-ghost);
  background: color-mix(in srgb, var(--surface) 91%, transparent);
  backdrop-filter: blur(18px);
}

.admin-topbar__context,
.admin-topbar__actions,
.admin-topbar__action,
.admin-topbar__create {
  display: flex;
  align-items: center;
}

.admin-topbar__context {
  min-width: 0;
  gap: 0.65rem;
}

.admin-topbar__copy {
  display: grid;
  min-width: 0;
}

.admin-topbar__copy strong {
  overflow: hidden;
  font-size: 0.84rem;
  font-weight: 750;
  letter-spacing: -0.015em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-topbar__copy span {
  overflow: hidden;
  max-width: 34rem;
  color: var(--on-surface-faint);
  font-size: 0.68rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-topbar__actions {
  flex: 0 0 auto;
  gap: 0.4rem;
}

.admin-topbar__menu,
.admin-topbar__action,
.admin-topbar__create {
  min-height: 2.35rem;
  justify-content: center;
  gap: 0.42rem;
  padding: 0 0.7rem;
  border: 1px solid transparent;
  border-radius: 0.45rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.admin-topbar__menu {
  width: 2.35rem;
  padding: 0;
  background: transparent;
  color: var(--on-surface);
}

.admin-topbar__action {
  border-color: var(--outline-ghost);
  background: var(--surface-elevated);
  color: var(--on-surface-muted);
}

.admin-topbar__action:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--outline-ghost));
  color: var(--accent);
}

.admin-topbar__create {
  background: var(--accent);
  color: var(--on-accent);
}

.admin-topbar__create:hover {
  background: var(--accent-container);
}

@media (max-width: 720px) {
  .admin-topbar__copy span,
  .admin-topbar__action span {
    display: none;
  }

  .admin-topbar__action {
    width: 2.35rem;
    padding: 0;
  }
}

@media (max-width: 430px) {
  .admin-topbar {
    gap: 0.45rem;
    padding-inline: 0.65rem;
  }

  .admin-topbar__create {
    width: 2.35rem;
    padding: 0;
  }

  .admin-topbar__create span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
</style>
