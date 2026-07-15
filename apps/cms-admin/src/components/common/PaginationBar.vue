<script setup lang="ts">
import { computed } from 'vue'

const page = defineModel<number>('page', { required: true })
const pageSize = defineModel<number>('pageSize', { required: true })

const {
  disabled = false,
  pageSizes = [10, 20, 50],
  total,
} = defineProps<{
  disabled?: boolean
  pageSizes?: number[]
  total: number
}>()

const rangeLabel = computed(() => {
  if (!total) return '共 0 条'
  const first = (page.value - 1) * pageSize.value + 1
  const last = Math.min(page.value * pageSize.value, total)
  return `${first}–${last} / ${total}`
})
</script>

<template>
  <footer class="pagination-bar" aria-label="分页导航">
    <span class="pagination-bar__range">{{ rangeLabel }}</span>
    <ElPagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      background
      :disabled
      layout="sizes, prev, pager, next"
      :page-sizes="pageSizes"
      :total
    />
  </footer>
</template>

<style scoped>
.pagination-bar {
  display: flex;
  min-height: 3.75rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 0;
}

.pagination-bar__range {
  color: var(--on-surface-faint);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.pagination-bar :deep(.el-pagination) {
  --el-pagination-button-bg-color: var(--surface-elevated);
  --el-pagination-hover-color: var(--accent);
  flex-wrap: wrap;
  justify-content: flex-end;
}

@media (max-width: 560px) {
  .pagination-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .pagination-bar :deep(.el-pagination) {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 390px) {
  .pagination-bar :deep(.el-pagination__sizes) {
    display: none;
  }
}
</style>
