<script setup lang="ts">
import { Send, Trash2 } from 'lucide-vue-next'
import type { AdminPostListItem } from '@/features/content/api'

defineProps<{
  posts: AdminPostListItem[]
  loading: boolean
  publishingId: string | null
  archivingId: string | null
}>()

const emit = defineEmits<{
  publish: [id: string]
  archive: [id: string]
}>()

function statusLabel(status: AdminPostListItem['status']) {
  return { draft: '草稿', published: '已发布', archived: '已归档' }[status]
}

function statusType(status: AdminPostListItem['status']) {
  return { draft: 'info', published: 'success', archived: 'warning' }[status]
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value))
}
</script>

<template>
  <ElTable v-if="posts.length || loading" v-loading="loading" :data="posts" class="post-table" table-layout="fixed">
    <ElTableColumn label="文章" min-width="280">
      <template #default="{ row }">
        <RouterLink class="post-title" :to="{ name: 'post-editor', params: { postId: row.id } }">
          <strong>{{ row.title }}</strong>
          <span>{{ row.summary || '暂无摘要' }}</span>
        </RouterLink>
      </template>
    </ElTableColumn>
    <ElTableColumn label="状态" width="92">
      <template #default="{ row }"><ElTag :type="statusType(row.status)" effect="plain" size="small">{{ statusLabel(row.status) }}</ElTag></template>
    </ElTableColumn>
    <ElTableColumn label="更新于" width="126">
      <template #default="{ row }"><span class="updated-at">{{ formatUpdatedAt(row.updated_at) }}</span></template>
    </ElTableColumn>
    <ElTableColumn align="right" label="操作" width="132">
      <template #default="{ row }">
        <ElButton v-if="row.status === 'draft'" :aria-label="`发布文章：${row.title}`" :loading="publishingId === row.id" link title="发布" type="primary" @click="emit('publish', row.id)">
          <Send :size="15" /><span class="sr-only">发布</span>
        </ElButton>
        <ElButton v-if="row.status !== 'archived'" :aria-label="`归档文章：${row.title}`" :loading="archivingId === row.id" link title="软删除" type="danger" @click="emit('archive', row.id)">
          <Trash2 :size="15" /><span class="sr-only">软删除</span>
        </ElButton>
      </template>
    </ElTableColumn>
  </ElTable>
  <ElEmpty v-else description="还没有文章，开始写第一篇吧。" />
</template>

<style scoped>
.post-table { width: 100%; --el-table-header-bg-color: var(--surface-low); --el-table-tr-bg-color: var(--surface-elevated); --el-table-row-hover-bg-color: var(--accent-soft); }
.post-title { display: grid; gap: 0.2rem; min-width: 0; color: var(--on-surface); }
.post-title strong { font-size: 0.98rem; }
.post-title span { overflow: hidden; color: var(--on-surface-muted); font-size: 0.82rem; text-overflow: ellipsis; white-space: nowrap; }
.post-title:hover strong { color: var(--accent); }
.updated-at { color: var(--on-surface-muted); font-size: 0.82rem; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
</style>
