<script setup lang="ts">
import { computed } from 'vue'

export type StatusBadgeStatus =
  | 'archived'
  | 'draft'
  | 'error'
  | 'neutral'
  | 'published'
  | 'success'
  | 'warning'

const { label, status } = defineProps<{
  label?: string
  status: StatusBadgeStatus
}>()

const statusLabels: Record<StatusBadgeStatus, string> = {
  archived: '已归档',
  draft: '草稿',
  error: '异常',
  neutral: '未设置',
  published: '已发布',
  success: '正常',
  warning: '需处理',
}

const displayLabel = computed(() => label || statusLabels[status])
</script>

<template>
  <span class="status-badge" :class="`status-badge--${status}`">
    <span class="status-badge__dot" aria-hidden="true" />
    {{ displayLabel }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  min-height: 1.55rem;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: var(--surface-high);
  color: var(--on-surface-muted);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.status-badge__dot {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 50%;
  background: currentColor;
}

.status-badge--published,
.status-badge--success {
  background: var(--success-soft);
  color: var(--success);
}

.status-badge--draft,
.status-badge--warning {
  background: var(--warning-soft);
  color: var(--warning);
}

.status-badge--error {
  background: var(--danger-soft);
  color: var(--danger);
}

.status-badge--archived {
  background: var(--surface-high);
  color: var(--on-surface-faint);
}
</style>
