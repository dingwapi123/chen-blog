<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed, useTemplateRef } from 'vue'
import AdminNavigation from './AdminNavigation.vue'
import AdminOwnerPanel from './AdminOwnerPanel.vue'

const {
  collapsed,
  email = '',
  loggingOut = false,
  mobile = false,
  mobileOpen = false,
} = defineProps<{
  collapsed: boolean
  email?: string
  loggingOut?: boolean
  mobile?: boolean
  mobileOpen?: boolean
}>()

const emit = defineEmits<{
  close: []
  logout: []
  toggleCollapse: []
}>()

const sidebar = useTemplateRef<HTMLElement>('sidebar')
const showLabels = computed(() => mobile || !collapsed)

function getFocusableItems() {
  return [...(sidebar.value?.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ) ?? [])]
}

function focusFirst() {
  getFocusableItems()[0]?.focus()
}

defineExpose({ focusFirst, getFocusableItems })
</script>

<template>
  <aside
    id="cms-navigation"
    ref="sidebar"
    class="admin-sidebar"
    :class="{
      'admin-sidebar--collapsed': collapsed && !mobile,
      'admin-sidebar--mobile': mobile,
      'admin-sidebar--open': mobile && mobileOpen,
    }"
    aria-label="CMS 导航"
    :aria-hidden="mobile && !mobileOpen ? 'true' : undefined"
    :inert="mobile && !mobileOpen ? true : undefined"
  >
    <div class="admin-sidebar__brand-row">
      <RouterLink
        class="admin-sidebar__brand"
        :to="{ name: 'dashboard' }"
        :aria-label="showLabels ? undefined : 'Chen Blog CMS 首页'"
        @click="emit('close')"
      >
        <span class="admin-sidebar__brand-mark" aria-hidden="true">C</span>
        <span v-if="showLabels" class="admin-sidebar__brand-copy">
          <strong>Chen Blog</strong>
          <small>Content workspace</small>
        </span>
      </RouterLink>
      <button
        v-if="mobile"
        class="admin-sidebar__mobile-close"
        type="button"
        aria-label="关闭导航菜单"
        @click="emit('close')"
      >
        <X :size="18" aria-hidden="true" />
      </button>
    </div>

    <AdminNavigation :show-labels="showLabels" @navigate="emit('close')" />

    <AdminOwnerPanel
      v-if="!mobile"
      :collapsed
      :email
      :logging-out="loggingOut"
      :show-labels="showLabels"
      @logout="emit('logout')"
      @toggle-collapse="emit('toggleCollapse')"
    />
    <div v-else class="admin-sidebar__mobile-owner">
      <AdminOwnerPanel
        :collapsed="false"
        :email
        :logging-out="loggingOut"
        :show-collapse="false"
        :show-labels="true"
        @logout="emit('logout')"
        @toggle-collapse="emit('toggleCollapse')"
      />
    </div>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  position: sticky;
  z-index: 30;
  top: 0;
  display: flex;
  width: var(--sidebar-width);
  height: 100svh;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--nav-outline);
  background: var(--nav-surface);
  color: var(--nav-text);
  transition: width 180ms ease, transform 180ms ease;
}

.admin-sidebar--collapsed {
  width: var(--sidebar-width-collapsed);
}

.admin-sidebar__brand-row {
  display: flex;
  min-height: 5rem;
  align-items: center;
  padding: 0 1rem;
}

.admin-sidebar__brand {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 0.75rem;
  color: var(--nav-text-strong);
}

.admin-sidebar__brand-mark {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--nav-accent) 52%, transparent);
  border-radius: 0.55rem;
  background: color-mix(in srgb, var(--nav-accent) 13%, transparent);
  color: var(--nav-accent);
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.05em;
}

.admin-sidebar__brand-copy {
  display: grid;
  min-width: 0;
}

.admin-sidebar__brand-copy strong {
  font-size: 0.96rem;
  letter-spacing: -0.025em;
}

.admin-sidebar__brand-copy small {
  overflow: hidden;
  color: var(--nav-text-muted);
  font-size: 0.67rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-sidebar--collapsed .admin-sidebar__brand-row {
  justify-content: center;
}

.admin-sidebar__mobile-close {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 0.45rem;
  background: transparent;
  color: var(--nav-text);
}

.admin-sidebar__mobile-close:hover {
  background: var(--nav-active);
  color: var(--nav-text-strong);
}

.admin-sidebar__mobile-owner {
  margin-top: auto;
}

.admin-sidebar--mobile {
  position: fixed;
  left: 0;
  width: min(var(--sidebar-width), calc(100vw - 2rem));
  max-width: 19rem;
  transform: translateX(-101%);
  box-shadow: none;
}

.admin-sidebar--mobile.admin-sidebar--open {
  transform: translateX(0);
  box-shadow: var(--shadow-floating);
}

@media (prefers-reduced-motion: reduce) {
  .admin-sidebar {
    transition: none;
  }
}
</style>
