<script setup lang="ts">
import { FileText, FolderTree, Image, LayoutDashboard, Tags, UserRound } from '@lucide/vue'

interface NavigationItem {
  label: string
  routeName: string
  icon: typeof LayoutDashboard
}

interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

defineProps<{
  showLabels: boolean
}>()

defineEmits<{
  navigate: []
}>()

const navigationGroups: NavigationGroup[] = [
  {
    label: '内容',
    items: [
      { label: '概览', routeName: 'dashboard', icon: LayoutDashboard },
      { label: '文章', routeName: 'posts', icon: FileText },
      { label: '分类', routeName: 'categories', icon: FolderTree },
      { label: '标签', routeName: 'tags', icon: Tags },
      { label: '媒体', routeName: 'media', icon: Image },
    ],
  },
  {
    label: '系统',
    items: [{ label: '账户', routeName: 'account', icon: UserRound }],
  },
]
</script>

<template>
  <nav class="admin-navigation" aria-label="主要功能">
    <section
      v-for="group in navigationGroups"
      :key="group.label"
      class="admin-navigation__group"
      :aria-label="group.label"
    >
      <p v-if="showLabels" class="admin-navigation__group-label">{{ group.label }}</p>
      <div class="admin-navigation__links">
        <RouterLink
          v-for="item in group.items"
          :key="item.routeName"
          class="admin-navigation__link"
          :class="{ 'admin-navigation__link--compact': !showLabels }"
          :to="{ name: item.routeName }"
          :title="showLabels ? undefined : item.label"
          @click="$emit('navigate')"
        >
          <component :is="item.icon" :size="18" :stroke-width="1.8" aria-hidden="true" />
          <span v-if="showLabels">{{ item.label }}</span>
        </RouterLink>
      </div>
    </section>
  </nav>
</template>

<style scoped>
.admin-navigation {
  flex: 1;
  overflow-y: auto;
  padding: 0.4rem 0.7rem 1rem;
}

.admin-navigation__group + .admin-navigation__group {
  margin-top: 1.5rem;
}

.admin-navigation__group-label {
  margin: 0 0 0.45rem;
  padding: 0 0.65rem;
  color: var(--nav-text-faint);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.admin-navigation__links {
  display: grid;
  gap: 0.2rem;
}

.admin-navigation__link {
  display: flex;
  min-height: 2.65rem;
  align-items: center;
  gap: 0.72rem;
  padding: 0.62rem 0.68rem;
  border-radius: 0.48rem;
  color: var(--nav-text);
  font-size: 0.84rem;
  font-weight: 600;
  white-space: nowrap;
}

.admin-navigation__link svg {
  flex: 0 0 auto;
}

.admin-navigation__link:hover,
.admin-navigation__link.router-link-active {
  background: var(--nav-active);
  color: var(--nav-text-strong);
}

.admin-navigation__link.router-link-active {
  box-shadow: inset 2px 0 var(--nav-accent);
}

.admin-navigation__link--compact {
  justify-content: center;
}
</style>
