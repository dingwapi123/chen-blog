<script setup lang="ts">
import { LogOut, PanelLeftClose, PanelLeftOpen, ShieldCheck } from '@lucide/vue'
import { computed } from 'vue'

const {
  collapsed,
  email = '',
  loggingOut = false,
  showCollapse = true,
  showLabels,
} = defineProps<{
  collapsed: boolean
  email?: string
  loggingOut?: boolean
  showCollapse?: boolean
  showLabels: boolean
}>()

defineEmits<{
  logout: []
  toggleCollapse: []
}>()

const shortEmail = computed(() => email.split('@')[0] || 'Owner')
</script>

<template>
  <div class="admin-owner-panel">
    <div v-if="showLabels" class="admin-owner-panel__security">
      <ShieldCheck :size="15" :stroke-width="1.8" aria-hidden="true" />
      <span>单管理员 · RLS 权限保护</span>
    </div>

    <div class="admin-owner-panel__owner" :class="{ 'admin-owner-panel__owner--compact': !showLabels }">
      <span class="admin-owner-panel__avatar" aria-hidden="true">C</span>
      <span v-if="showLabels" class="admin-owner-panel__copy">
        <strong>{{ shortEmail }}</strong>
        <small>{{ email || 'Owner session' }}</small>
      </span>
      <button
        class="admin-owner-panel__logout"
        :class="{ 'admin-owner-panel__logout--compact': !showLabels }"
        :disabled="loggingOut"
        type="button"
        :aria-label="loggingOut ? '正在退出登录' : '退出登录'"
        :title="loggingOut ? '正在退出…' : '退出登录'"
        @click="$emit('logout')"
      >
        <LogOut :size="17" :stroke-width="1.8" aria-hidden="true" />
        <span class="sr-only">退出登录</span>
      </button>
    </div>

    <button
      v-if="showCollapse"
      class="admin-owner-panel__collapse"
      :class="{ 'admin-owner-panel__collapse--compact': !showLabels }"
      type="button"
      :aria-label="collapsed ? '展开侧栏' : '收起侧栏'"
      :title="collapsed ? '展开侧栏' : '收起侧栏'"
      @click="$emit('toggleCollapse')"
    >
      <PanelLeftOpen v-if="collapsed" :size="17" aria-hidden="true" />
      <PanelLeftClose v-else :size="17" aria-hidden="true" />
      <span v-if="showLabels">{{ collapsed ? '展开侧栏' : '收起侧栏' }}</span>
    </button>
  </div>
</template>

<style scoped>
.admin-owner-panel {
  display: grid;
  gap: 0.5rem;
  padding: 0.7rem;
}

.admin-owner-panel__security {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.6rem;
  color: var(--nav-text-muted);
  font-size: 0.67rem;
}

.admin-owner-panel__security svg {
  color: var(--nav-accent);
}

.admin-owner-panel__owner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.6rem;
  padding: 0.62rem;
  border: 1px solid var(--nav-outline);
  border-radius: 0.6rem;
  background: color-mix(in srgb, var(--nav-text-strong) 4%, transparent);
}

.admin-owner-panel__owner--compact {
  grid-template-columns: 1fr;
  justify-items: center;
  padding: 0.5rem 0;
}

.admin-owner-panel__avatar {
  display: grid;
  width: 1.9rem;
  height: 1.9rem;
  place-items: center;
  border-radius: 50%;
  background: var(--nav-accent);
  color: var(--nav-on-accent);
  font-size: 0.72rem;
  font-weight: 800;
}

.admin-owner-panel__copy {
  display: grid;
  min-width: 0;
}

.admin-owner-panel__copy strong,
.admin-owner-panel__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-owner-panel__copy strong {
  color: var(--nav-text-strong);
  font-size: 0.76rem;
  font-weight: 700;
}

.admin-owner-panel__copy small {
  color: var(--nav-text-muted);
  font-size: 0.67rem;
}

.admin-owner-panel__logout,
.admin-owner-panel__collapse {
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: var(--nav-text-muted);
}

.admin-owner-panel__logout {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  padding: 0;
}

.admin-owner-panel__logout:hover {
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  color: var(--danger);
}

.admin-owner-panel__logout--compact {
  width: 100%;
}

.admin-owner-panel__collapse {
  display: flex;
  width: 100%;
  min-height: 2.65rem;
  align-items: center;
  gap: 0.72rem;
  padding: 0.62rem 0.68rem;
  font-size: 0.84rem;
  font-weight: 600;
}

.admin-owner-panel__collapse:hover {
  background: var(--nav-active);
  color: var(--nav-text-strong);
}

.admin-owner-panel__collapse--compact {
  justify-content: center;
}
</style>
