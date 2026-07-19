<script lang="ts">
export type PostRowAction = {
  id: string
  type: 'publish' | 'draft' | 'archive'
} | null
</script>

<script setup lang="ts">
import {
  Archive,
  ArrowUpRight,
  Edit3,
  Eye,
  MoreHorizontal,
  RotateCcw,
  Send,
} from '@lucide/vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { AdminPostListItem } from '@/features/content/api'

const props = defineProps<{
  posts: readonly AdminPostListItem[]
  busyAction: PostRowAction
  blogUrl: string
  returnTo: string
}>()

const emit = defineEmits<{
  publish: [id: string]
  requestDraft: [id: string]
  archive: [id: string]
}>()

type RowCommand = 'publish' | 'draft' | 'archive'

function isBusy(id: string) {
  return props.busyAction?.id === id
}

function editorLocation(post: AdminPostListItem) {
  return {
    name: 'post-editor',
    params: { postId: post.id },
    query: { returnTo: props.returnTo },
  }
}

function publicUrl(post: AdminPostListItem) {
  return `${props.blogUrl.replace(/\/$/, '')}/posts/${encodeURIComponent(post.id)}`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function handleCommand(id: string, command: RowCommand) {
  if (isBusy(id)) return
  if (command === 'publish') emit('publish', id)
  else if (command === 'draft') emit('requestDraft', id)
  else emit('archive', id)
}
</script>

<template>
  <div class="post-collection">
    <ElTable
      :data="posts"
      class="post-table"
      row-key="id"
      table-layout="fixed"
    >
      <ElTableColumn label="文章" min-width="330">
        <template #default="{ row }: { row: AdminPostListItem }">
          <RouterLink class="post-title" :to="editorLocation(row)">
            <strong>{{ row.title }}</strong>
            <span>{{ row.summary || '尚未填写摘要' }}</span>
          </RouterLink>
        </template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="104">
        <template #default="{ row }: { row: AdminPostListItem }">
          <StatusBadge :status="row.status" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="分类" min-width="128">
        <template #default="{ row }: { row: AdminPostListItem }">
          <span class="post-meta">{{ row.category?.name || '未分类' }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="最近更新" width="126">
        <template #default="{ row }: { row: AdminPostListItem }">
          <span class="post-meta">{{ formatDate(row.updated_at) }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn align="right" label="操作" width="164">
        <template #default="{ row }: { row: AdminPostListItem }">
          <div class="row-actions">
            <RouterLink class="row-action" :to="editorLocation(row)">
              <Edit3 v-if="row.status === 'draft'" :size="15" aria-hidden="true" />
              <Eye v-else :size="15" aria-hidden="true" />
              {{ row.status === 'draft' ? '编辑' : '查看' }}
            </RouterLink>
            <a
              v-if="row.status === 'published'"
              class="icon-action"
              :href="publicUrl(row)"
              rel="noreferrer"
              target="_blank"
              :aria-label="`在公开博客查看：${row.title}`"
              title="在公开博客查看"
            >
              <ArrowUpRight :size="16" aria-hidden="true" />
            </a>
            <ElDropdown
              v-if="row.status !== 'archived'"
              :disabled="isBusy(row.id)"
              trigger="click"
              @command="(command: RowCommand) => handleCommand(row.id, command)"
            >
              <ElButton
                :aria-label="`更多文章操作：${row.title}`"
                :loading="isBusy(row.id)"
                circle
                link
              >
                <MoreHorizontal v-if="!isBusy(row.id)" :size="17" aria-hidden="true" />
              </ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem v-if="row.status === 'draft'" command="publish">
                    <Send :size="15" aria-hidden="true" />
                    发布文章
                  </ElDropdownItem>
                  <ElDropdownItem v-else command="draft">
                    <RotateCcw :size="15" aria-hidden="true" />
                    转回草稿
                  </ElDropdownItem>
                  <ElDropdownItem command="archive" divided>
                    <Archive :size="15" aria-hidden="true" />
                    归档文章
                  </ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </div>
        </template>
      </ElTableColumn>
    </ElTable>

    <div class="post-mobile-list" role="list" aria-label="文章列表">
      <article
        v-for="post in posts"
        :key="post.id"
        class="post-mobile-item"
        role="listitem"
      >
        <div class="post-mobile-item__topline">
          <StatusBadge :status="post.status" />
          <span>{{ post.category?.name || '未分类' }}</span>
          <span>{{ formatDate(post.updated_at) }}</span>
        </div>
        <RouterLink class="post-mobile-item__title" :to="editorLocation(post)">
          {{ post.title }}
        </RouterLink>
        <p>{{ post.summary || '尚未填写摘要' }}</p>
        <div class="post-mobile-item__actions">
          <RouterLink class="button" :to="editorLocation(post)">
            <Edit3 v-if="post.status === 'draft'" :size="15" aria-hidden="true" />
            <Eye v-else :size="15" aria-hidden="true" />
            {{ post.status === 'draft' ? '编辑文章' : '查看内容' }}
          </RouterLink>
          <a
            v-if="post.status === 'published'"
            class="button"
            :href="publicUrl(post)"
            rel="noreferrer"
            target="_blank"
          >
            <ArrowUpRight :size="15" aria-hidden="true" />
            公开页面
          </a>
          <ElDropdown
            v-if="post.status !== 'archived'"
            :disabled="isBusy(post.id)"
            trigger="click"
            @command="(command: RowCommand) => handleCommand(post.id, command)"
          >
            <ElButton :loading="isBusy(post.id)">更多</ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem v-if="post.status === 'draft'" command="publish">发布文章</ElDropdownItem>
                <ElDropdownItem v-else command="draft">转回草稿</ElDropdownItem>
                <ElDropdownItem command="archive" divided>归档文章</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.post-collection {
  overflow: hidden;
  border: 1px solid var(--outline-ghost);
  border-radius: var(--radius-large);
  background: var(--surface-elevated);
}

.post-table {
  width: 100%;
  --el-table-bg-color: var(--surface-elevated);
  --el-table-header-bg-color: var(--surface-container);
  --el-table-tr-bg-color: var(--surface-elevated);
  --el-table-row-hover-bg-color: var(--surface-low);
}

.post-title {
  display: grid;
  min-width: 0;
  gap: 0.12rem;
  padding: 0.2rem 0;
  color: var(--on-surface);
}

.post-title strong,
.post-title span,
.post-title small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-title strong {
  font-size: 0.91rem;
  letter-spacing: -0.01em;
}

.post-title span {
  color: var(--on-surface-muted);
  font-size: 0.76rem;
}

.post-title small {
  color: var(--on-surface-faint);
  font-size: 0.68rem;
}

.post-title:hover strong {
  color: var(--accent);
}

.post-meta {
  color: var(--on-surface-muted);
  font-size: 0.78rem;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.2rem;
}

.row-action,
.icon-action {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: var(--radius-small);
  color: var(--on-surface-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.row-action {
  padding: 0 0.55rem;
}

.icon-action {
  width: 2.5rem;
}

.row-action:hover,
.icon-action:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.post-mobile-list {
  display: none;
}

@media (max-width: 820px) {
  .post-table {
    display: none;
  }

  .post-mobile-list {
    display: grid;
    padding: 0.45rem;
  }

  .post-mobile-item {
    display: grid;
    gap: 0.55rem;
    padding: 1rem;
    border-radius: var(--radius-medium);
  }

  .post-mobile-item + .post-mobile-item {
    margin-top: 0.25rem;
  }

  .post-mobile-item:hover,
  .post-mobile-item:focus-within {
    background: var(--surface-low);
  }

  .post-mobile-item__topline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem;
    color: var(--on-surface-muted);
    font-size: 0.72rem;
  }

  .post-mobile-item__title {
    font-size: 1rem;
    font-weight: 750;
    letter-spacing: -0.02em;
    line-height: 1.4;
  }

  .post-mobile-item p {
    display: -webkit-box;
    overflow: hidden;
    margin: 0;
    color: var(--on-surface-muted);
    font-size: 0.8rem;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .post-mobile-item__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    padding-top: 0.3rem;
  }
}
</style>
