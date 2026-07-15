<script setup lang="ts">
import { Inbox, RefreshCw, SearchX, TriangleAlert } from '@lucide/vue'
import { computed } from 'vue'

export type AsyncStateMode = 'loading' | 'error' | 'empty' | 'filtered-empty' | 'ready'

const {
  actionLabel = '重新加载',
  description,
  refreshing = false,
  skeletonRows = 6,
  state,
  title,
} = defineProps<{
  actionLabel?: string
  description?: string
  refreshing?: boolean
  skeletonRows?: number
  state: AsyncStateMode
  title?: string
}>()

defineEmits<{
  clearFilters: []
  retry: []
}>()

const defaultCopy = computed(() => {
  if (state === 'error') {
    return {
      title: '数据暂时无法读取',
      description: '请检查网络连接后重试，已有内容不会受到影响。',
    }
  }
  if (state === 'filtered-empty') {
    return {
      title: '没有符合条件的结果',
      description: '调整关键词或筛选条件，查看其他内容。',
    }
  }
  return {
    title: '这里还没有内容',
    description: '创建第一条内容后，它会出现在这里。',
  }
})
</script>

<template>
  <section
    class="async-state"
    :class="`async-state--${state}`"
    :aria-busy="state === 'loading' || refreshing"
    :aria-live="state === 'error' ? 'assertive' : 'polite'"
  >
    <div v-if="state === 'loading'" class="async-state__skeleton" aria-label="正在加载">
      <span class="async-state__skeleton-toolbar" />
      <span
        v-for="row in skeletonRows"
        :key="row"
        class="async-state__skeleton-row"
        :style="{ '--skeleton-offset': `${(row % 3) * 7}%` }"
      />
    </div>

    <div v-else-if="state !== 'ready'" class="async-state__message">
      <span class="async-state__icon" aria-hidden="true">
        <TriangleAlert v-if="state === 'error'" :size="22" />
        <SearchX v-else-if="state === 'filtered-empty'" :size="22" />
        <Inbox v-else :size="22" />
      </span>
      <h2>{{ title || defaultCopy.title }}</h2>
      <p>{{ description || defaultCopy.description }}</p>
      <div class="async-state__actions">
        <slot name="actions">
          <button v-if="state === 'error'" class="button" type="button" @click="$emit('retry')">
            <RefreshCw :size="16" aria-hidden="true" />
            {{ actionLabel }}
          </button>
          <button
            v-else-if="state === 'filtered-empty'"
            class="button"
            type="button"
            @click="$emit('clearFilters')"
          >
            清除筛选
          </button>
        </slot>
      </div>
    </div>

    <div v-else class="async-state__content">
      <div v-if="refreshing" class="async-state__refreshing" role="status">
        <RefreshCw class="async-state__spin" :size="14" aria-hidden="true" />
        正在刷新数据
      </div>
      <slot />
    </div>
  </section>
</template>

<style scoped>
.async-state {
  position: relative;
  min-width: 0;
}

.async-state__message {
  display: grid;
  min-height: 17rem;
  place-items: center;
  align-content: center;
  padding: 2.5rem 1.25rem;
  border: 1px dashed var(--outline-ghost);
  border-radius: var(--radius-large);
  background: var(--surface-container);
  text-align: center;
}

.async-state__icon {
  display: grid;
  width: 2.8rem;
  height: 2.8rem;
  place-items: center;
  margin-bottom: 0.75rem;
  border-radius: 50%;
  background: var(--surface-high);
  color: var(--on-surface-muted);
}

.async-state--error .async-state__icon {
  background: var(--danger-soft);
  color: var(--danger);
}

.async-state__message h2 {
  margin: 0;
  font-size: 1rem;
  letter-spacing: -0.02em;
}

.async-state__message p {
  max-width: 28rem;
  margin: 0.4rem 0 0;
  color: var(--on-surface-muted);
  font-size: 0.82rem;
}

.async-state__actions {
  min-height: 2.5rem;
  margin-top: 1.15rem;
}

.async-state__skeleton {
  display: grid;
  gap: 0.1rem;
  overflow: hidden;
  border: 1px solid var(--outline-ghost);
  border-radius: var(--radius-large);
  background: var(--surface-elevated);
}

.async-state__skeleton-toolbar,
.async-state__skeleton-row {
  position: relative;
  display: block;
  overflow: hidden;
  background: var(--surface-container);
}

.async-state__skeleton-toolbar {
  height: 3.65rem;
  border-bottom: 1px solid var(--outline-ghost);
}

.async-state__skeleton-row {
  width: calc(100% - var(--skeleton-offset));
  height: 4.25rem;
}

.async-state__skeleton-toolbar::after,
.async-state__skeleton-row::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--on-surface) 6%, transparent), transparent);
  content: '';
  transform: translateX(-100%);
  animation: async-state-shimmer 1.4s infinite;
}

.async-state__refreshing {
  position: absolute;
  z-index: 4;
  top: 0.6rem;
  right: 0.6rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.55rem;
  border: 1px solid var(--outline-ghost);
  border-radius: 999px;
  background: var(--surface-elevated);
  box-shadow: var(--shadow-small);
  color: var(--on-surface-muted);
  font-size: 0.7rem;
}

.async-state__spin {
  animation: async-state-spin 0.9s linear infinite;
}

@keyframes async-state-shimmer {
  to { transform: translateX(100%); }
}

@keyframes async-state-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .async-state__skeleton-toolbar::after,
  .async-state__skeleton-row::after,
  .async-state__spin {
    animation: none;
  }
}
</style>
