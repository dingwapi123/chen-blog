<script setup lang="ts">
defineProps<{
  resultLabel?: string
}>()
</script>

<template>
  <div class="data-toolbar" role="search">
    <div class="data-toolbar__controls">
      <div v-if="$slots.search" class="data-toolbar__search">
        <slot name="search" />
      </div>
      <div v-if="$slots.filters || $slots.default" class="data-toolbar__filters">
        <slot name="filters" />
        <slot />
      </div>
    </div>
    <div class="data-toolbar__aside">
      <span v-if="resultLabel" class="data-toolbar__result" aria-live="polite">{{ resultLabel }}</span>
      <div v-if="$slots.actions" class="data-toolbar__actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-toolbar {
  display: flex;
  min-height: 3.9rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem;
  border: 1px solid var(--outline-ghost);
  border-radius: var(--radius-large);
  background: var(--surface-elevated);
}

.data-toolbar__controls,
.data-toolbar__filters,
.data-toolbar__aside,
.data-toolbar__actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.55rem;
}

.data-toolbar__controls {
  flex: 1;
}

.data-toolbar__search {
  width: min(100%, 21rem);
  flex: 0 1 21rem;
}

.data-toolbar__filters {
  flex-wrap: wrap;
}

.data-toolbar__aside {
  flex: 0 0 auto;
}

.data-toolbar__result {
  color: var(--on-surface-faint);
  font-size: 0.75rem;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .data-toolbar,
  .data-toolbar__controls {
    align-items: stretch;
    flex-direction: column;
  }

  .data-toolbar__search {
    width: 100%;
    flex-basis: auto;
  }

  .data-toolbar__aside {
    justify-content: space-between;
  }
}

@media (max-width: 420px) {
  .data-toolbar__filters,
  .data-toolbar__filters :deep(.el-select),
  .data-toolbar__filters :deep(.el-input) {
    width: 100%;
  }
}
</style>
