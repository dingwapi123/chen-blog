<script setup lang="ts">
import {
  ArrowRight,
  FilePenLine,
  FileText,
  FolderTree,
  Image,
  Plus,
  RefreshCw,
  Tags,
} from '@lucide/vue'
import { computed, onMounted, shallowRef } from 'vue'
import AdminShell from '@/components/AdminShell.vue'
import AdminPage from '@/components/common/AdminPage.vue'
import { useAuth } from '@/composables/useAuth'
import {
  getDashboardOverview,
  type AdminPostListItem,
  type DashboardOverview,
} from '@/features/content/api'

const { user } = useAuth()
const overview = shallowRef<DashboardOverview | null>(null)
const loading = shallowRef(true)
const refreshing = shallowRef(false)
const errorMessage = shallowRef('')
let requestSequence = 0

const ownerName = computed(() => user.value?.email?.split('@')[0] || '管理员')
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const summaryItems = computed(() => {
  const value = overview.value
  return [
    { label: '全部文章', value: value?.posts.total ?? 0, to: { name: 'posts' } },
    { label: '草稿', value: value?.posts.draft ?? 0, to: { name: 'posts', query: { status: 'draft' } } },
    { label: '已发布', value: value?.posts.published ?? 0, to: { name: 'posts', query: { status: 'published' } } },
    { label: '已归档', value: value?.posts.archived ?? 0, to: { name: 'posts', query: { status: 'archived' } } },
    { label: '媒体', value: value?.media ?? 0, to: { name: 'media' } },
    { label: '分类 / 标签', value: `${value?.categories ?? 0} / ${value?.tags ?? 0}`, to: { name: 'categories' } },
  ]
})

async function loadOverview() {
  const sequence = ++requestSequence
  if (overview.value) refreshing.value = true
  else loading.value = true
  errorMessage.value = ''

  try {
    const nextOverview = await getDashboardOverview()
    if (sequence === requestSequence) overview.value = nextOverview
  } catch (error) {
    if (sequence === requestSequence) {
      errorMessage.value = error instanceof Error ? error.message : '概览载入失败。'
    }
  } finally {
    if (sequence === requestSequence) {
      loading.value = false
      refreshing.value = false
    }
  }
}

function statusLabel(status: AdminPostListItem['status']) {
  return { draft: '草稿', published: '已发布', archived: '已归档' }[status]
}

const statusTypes = {
  draft: 'info',
  published: 'success',
  archived: 'warning',
} as const

function statusType(status: AdminPostListItem['status']): 'info' | 'success' | 'warning' {
  return statusTypes[status]
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

onMounted(() => void loadOverview())
</script>

<template>
  <AdminShell>
    <AdminPage size="wide">
    <section class="dashboard-intro" aria-labelledby="dashboard-title">
      <div>
        <p class="eyebrow">CONTENT WORKSPACE</p>
        <h1 id="dashboard-title">{{ greeting }}，{{ ownerName }}</h1>
        <p>从最近修改继续，或者开始一篇新的文章。</p>
      </div>
      <div class="dashboard-intro__actions">
        <ElButton
          :aria-label="refreshing ? '正在刷新内容概览' : '刷新内容概览'"
          :loading="refreshing"
          circle
          @click="loadOverview"
        >
          <RefreshCw :size="17" aria-hidden="true" />
        </ElButton>
        <RouterLink class="button button--primary" :to="{ name: 'post-new' }">
          <Plus :size="17" aria-hidden="true" />
          新建文章
        </RouterLink>
      </div>
    </section>

    <ElAlert
      v-if="errorMessage"
      :closable="false"
      show-icon
      title="内容概览暂时无法载入"
      type="error"
      class="dashboard-error"
    >
      <template #default>
        <p>{{ errorMessage }}</p>
        <ElButton size="small" @click="loadOverview">重新载入</ElButton>
      </template>
    </ElAlert>

    <section v-if="loading" class="summary-strip" aria-busy="true" aria-label="正在载入内容统计">
      <ElSkeleton v-for="index in 6" :key="index" animated :rows="1" />
    </section>
    <section v-else-if="overview" class="summary-strip" aria-label="内容统计">
      <RouterLink
        v-for="item in summaryItems"
        :key="item.label"
        class="summary-item"
        :to="item.to"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </RouterLink>
    </section>

    <div v-if="overview" class="dashboard-grid">
      <section class="workspace-panel" aria-labelledby="recent-posts-title">
        <header class="panel-head">
          <div>
            <p class="panel-kicker">最近工作</p>
            <h2 id="recent-posts-title">最近修改</h2>
          </div>
          <RouterLink class="text-link" :to="{ name: 'posts' }">
            全部文章
            <ArrowRight :size="15" aria-hidden="true" />
          </RouterLink>
        </header>

        <div v-if="overview.recentPosts.length" class="recent-list">
          <RouterLink
            v-for="post in overview.recentPosts"
            :key="post.id"
            class="recent-post"
            :to="{ name: 'post-editor', params: { postId: post.id } }"
          >
            <span class="recent-post__icon"><FileText :size="17" aria-hidden="true" /></span>
            <span class="recent-post__content">
              <strong>{{ post.title }}</strong>
              <span>{{ post.category?.name || '未分类' }} · {{ formatUpdatedAt(post.updated_at) }}</span>
            </span>
            <ElTag :type="statusType(post.status)" effect="plain" size="small">
              {{ statusLabel(post.status) }}
            </ElTag>
          </RouterLink>
        </div>
        <div v-else class="panel-empty">
          <FilePenLine :size="26" aria-hidden="true" />
          <strong>还没有文章</strong>
          <span>创建第一篇草稿，内容会出现在这里。</span>
          <RouterLink class="text-link" :to="{ name: 'post-new' }">开始撰写</RouterLink>
        </div>
      </section>

      <aside class="dashboard-rail" aria-label="工作台快捷操作">
        <section class="workspace-panel action-panel">
          <header class="panel-head">
            <div>
              <p class="panel-kicker">下一步</p>
              <h2>继续工作</h2>
            </div>
          </header>
          <nav aria-label="快捷操作">
            <RouterLink :to="{ name: 'posts', query: { status: 'draft' } }">
              <FilePenLine :size="17" aria-hidden="true" />
              <span><strong>处理草稿</strong><small>{{ overview.posts.draft }} 篇等待完成</small></span>
              <ArrowRight :size="15" aria-hidden="true" />
            </RouterLink>
            <RouterLink :to="{ name: 'media' }">
              <Image :size="17" aria-hidden="true" />
              <span><strong>管理图片</strong><small>{{ overview.media }} 个公开素材</small></span>
              <ArrowRight :size="15" aria-hidden="true" />
            </RouterLink>
            <RouterLink :to="{ name: 'categories' }">
              <FolderTree :size="17" aria-hidden="true" />
              <span><strong>整理分类</strong><small>{{ overview.categories }} 个分类</small></span>
              <ArrowRight :size="15" aria-hidden="true" />
            </RouterLink>
            <RouterLink :to="{ name: 'tags' }">
              <Tags :size="17" aria-hidden="true" />
              <span><strong>整理标签</strong><small>{{ overview.tags }} 个标签</small></span>
              <ArrowRight :size="15" aria-hidden="true" />
            </RouterLink>
          </nav>
        </section>

        <section class="workflow-note">
          <p class="panel-kicker">发布规则</p>
          <strong>已发布内容先转回草稿，再修改并重新发布。</strong>
          <span>公开站点使用 10 分钟 CDN 缓存，状态变更后可能短暂显示旧页面。</span>
        </section>
      </aside>
    </div>
    </AdminPage>
  </AdminShell>
</template>

<style scoped>
.dashboard-intro {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 2rem;
}

.dashboard-intro h1 {
  margin: 0.35rem 0 0;
  font-size: clamp(1.75rem, 3vw, 2.45rem);
  letter-spacing: -0.05em;
  line-height: 1.12;
}

.dashboard-intro p:not(.eyebrow) {
  margin: 0.55rem 0 0;
  color: var(--on-surface-muted);
}

.dashboard-intro__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.65rem;
}

.dashboard-error {
  margin-bottom: 1rem;
}

.dashboard-error p {
  margin: 0 0 0.65rem;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  margin-bottom: 2rem;
  overflow: hidden;
  border-radius: 0.75rem;
  background: var(--surface-container);
}

.summary-strip :deep(.el-skeleton) {
  padding: 1rem;
}

.summary-item {
  display: grid;
  min-height: 6rem;
  align-content: space-between;
  padding: 1rem 1.1rem;
  transition: background-color 160ms ease;
}

.summary-item:hover,
.summary-item:focus-visible {
  background: var(--accent-soft);
}

.summary-item span {
  color: var(--on-surface-muted);
  font-size: 0.76rem;
  font-weight: 700;
}

.summary-item strong {
  font-size: 1.55rem;
  letter-spacing: -0.04em;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(17rem, 0.8fr);
  gap: 1.25rem;
  align-items: start;
}

.workspace-panel {
  overflow: hidden;
  border: 1px solid var(--outline-ghost);
  border-radius: 0.75rem;
  background: var(--surface-elevated);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.25rem;
}

.panel-kicker {
  margin: 0;
  color: var(--on-surface-faint);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.panel-head h2 {
  margin: 0.15rem 0 0;
  font-size: 1rem;
  letter-spacing: -0.02em;
}

.text-link {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.35rem;
  color: var(--accent);
  font-size: 0.82rem;
  font-weight: 700;
}

.recent-list {
  display: grid;
  padding: 0 0.55rem 0.55rem;
}

.recent-post {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8rem;
  min-height: 4.5rem;
  padding: 0.75rem;
  border-radius: 0.55rem;
}

.recent-post:hover,
.recent-post:focus-visible {
  background: var(--surface-low);
}

.recent-post__icon {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  border-radius: 0.45rem;
  background: var(--surface-high);
  color: var(--accent);
}

.recent-post__content {
  display: grid;
  min-width: 0;
  gap: 0.18rem;
}

.recent-post__content strong,
.recent-post__content span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-post__content strong {
  font-size: 0.9rem;
}

.recent-post__content span {
  color: var(--on-surface-muted);
  font-size: 0.76rem;
}

.panel-empty {
  display: grid;
  justify-items: center;
  gap: 0.35rem;
  padding: 3.5rem 1.5rem;
  color: var(--on-surface-muted);
  text-align: center;
}

.panel-empty strong {
  color: var(--on-surface);
}

.panel-empty span {
  font-size: 0.84rem;
}

.dashboard-rail {
  display: grid;
  gap: 1.25rem;
}

.action-panel nav {
  display: grid;
  padding: 0 0.55rem 0.55rem;
}

.action-panel nav a {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  min-height: 4rem;
  padding: 0.65rem 0.7rem;
  border-radius: 0.5rem;
  color: var(--on-surface-muted);
}

.action-panel nav a:hover,
.action-panel nav a:focus-visible {
  background: var(--surface-low);
  color: var(--accent);
}

.action-panel nav a > span {
  display: grid;
  min-width: 0;
}

.action-panel nav strong {
  color: var(--on-surface);
  font-size: 0.85rem;
}

.action-panel nav small {
  color: var(--on-surface-muted);
  font-size: 0.73rem;
}

.workflow-note {
  display: grid;
  gap: 0.55rem;
  padding: 1.2rem;
  border-radius: 0.75rem;
  background: var(--accent-soft);
}

.workflow-note strong {
  color: var(--on-surface);
  font-size: 0.88rem;
  line-height: 1.55;
}

.workflow-note span {
  color: var(--on-surface-muted);
  font-size: 0.76rem;
  line-height: 1.6;
}

@media (max-width: 1080px) {
  .summary-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-rail {
    grid-template-columns: minmax(0, 1.4fr) minmax(15rem, 0.8fr);
  }
}

@media (max-width: 680px) {
  .dashboard-intro {
    align-items: stretch;
    flex-direction: column;
    gap: 1rem;
  }

  .dashboard-intro__actions {
    justify-content: space-between;
  }

  .summary-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-rail {
    grid-template-columns: 1fr;
  }

  .recent-post {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .recent-post :deep(.el-tag) {
    grid-column: 2;
    justify-self: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .summary-item {
    transition: none;
  }
}
</style>
