<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, RefreshCw, RotateCcw, Search } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminShell from '@/components/AdminShell.vue'
import AdminPage from '@/components/common/AdminPage.vue'
import AsyncState, { type AsyncStateMode } from '@/components/common/AsyncState.vue'
import DataToolbar from '@/components/common/DataToolbar.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import PostTable, { type PostRowAction } from '@/features/posts/PostTable.vue'
import {
  archivePost,
  DEFAULT_POST_LIST_QUERY,
  listTaxonomy,
  movePostToDraft,
  normalizePostListQuery,
  parsePostListRouteQuery,
  publishPost,
  serializePostListRouteQuery,
  type PostListQuery,
  type PostListSort,
  type PostListStatus,
  type TaxonomyItem,
} from '@/features/content/api'
import { usePosts } from '@/features/posts/usePosts'

const route = useRoute()
const router = useRouter()
const initialQuery = parsePostListRouteQuery(route.query)
const {
  errorMessage,
  hasLoaded,
  initialLoading,
  posts,
  query,
  refresh,
  refreshing,
  setQuery,
  total,
} = usePosts({ initialQuery, immediate: false })

const searchInput = shallowRef(initialQuery.search)
const statusFilter = shallowRef<PostListStatus>(initialQuery.status)
const categoryFilter = shallowRef(initialQuery.categoryId ?? '')
const sortFilter = shallowRef<PostListSort>(initialQuery.sort)
const categories = shallowRef<TaxonomyItem[]>([])
const categoryError = shallowRef('')
const busyAction = shallowRef<PostRowAction>(null)
const blogUrl = (import.meta.env.VITE_BLOG_URL || 'http://localhost:3000').replace(/\/$/, '')
let searchTimer: ReturnType<typeof setTimeout> | undefined

const hasFilters = computed(() => (
  Boolean(query.value.search)
  || query.value.status !== 'all'
  || Boolean(query.value.categoryId)
))

const asyncState = computed<AsyncStateMode>(() => {
  if (initialLoading.value) return 'loading'
  if (errorMessage.value && !hasLoaded.value) return 'error'
  if (!posts.value.length) return hasFilters.value ? 'filtered-empty' : 'empty'
  return 'ready'
})

const resultLabel = computed(() => {
  if (initialLoading.value) return '正在统计…'
  if (!total.value) return '0 篇文章'
  return `共 ${total.value} 篇文章`
})

const currentPage = computed({
  get: () => query.value.page,
  set: (page: number) => void updateRoute({ page }),
})

const currentPageSize = computed({
  get: () => query.value.pageSize,
  set: (pageSize: number) => void updateRoute({ pageSize, page: 1 }),
})

function updateRoute(patch: Partial<PostListQuery>) {
  const nextQuery = normalizePostListQuery({ ...query.value, ...patch })
  return router.replace({
    name: 'posts',
    query: serializePostListRouteQuery(nextQuery),
  })
}

function clearFilters() {
  searchInput.value = ''
  statusFilter.value = 'all'
  categoryFilter.value = ''
  sortFilter.value = DEFAULT_POST_LIST_QUERY.sort
  void updateRoute({
    ...DEFAULT_POST_LIST_QUERY,
    pageSize: query.value.pageSize,
  })
}

function scheduleSearch(value: string) {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (value.trim() !== query.value.search) void updateRoute({ search: value, page: 1 })
  }, 320)
}

async function loadCategories() {
  categoryError.value = ''
  try {
    categories.value = await listTaxonomy('categories')
  } catch (error) {
    categoryError.value = error instanceof Error ? error.message : '分类载入失败。'
  }
}

function findPostTitle(id: string) {
  return posts.value.find(post => post.id === id)?.title ?? '这篇文章'
}

async function publish(id: string) {
  if (busyAction.value) return
  try {
    await ElMessageBox.confirm(
      `确认发布“${findPostTitle(id)}”？发布后公开站点最多可能在 10 分钟内仍显示旧内容。`,
      '发布文章',
      {
        confirmButtonText: '确认发布',
        cancelButtonText: '取消',
        type: 'success',
      },
    )
  } catch {
    return
  }

  busyAction.value = { id, type: 'publish' }
  try {
    await publishPost(id)
    ElMessage.success('文章已发布。')
    await refresh()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '发布失败。')
  } finally {
    busyAction.value = null
  }
}

async function requestDraft(id: string) {
  if (busyAction.value) return
  try {
    await ElMessageBox.confirm(
      `“${findPostTitle(id)}”会从公开数据中撤下，缓存页面最多可能继续显示 10 分钟。`,
      '转回草稿？',
      {
        confirmButtonText: '转为草稿',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  busyAction.value = { id, type: 'draft' }
  try {
    await movePostToDraft(id)
    ElMessage.success('文章已转为草稿。')
    await refresh()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '转为草稿失败。')
  } finally {
    busyAction.value = null
  }
}

async function archive(id: string) {
  if (busyAction.value) return
  try {
    await ElMessageBox.confirm(
      `“${findPostTitle(id)}”会被软删除并归档；记录会保留，但 V1 不提供恢复入口。`,
      '归档文章？',
      {
        confirmButtonText: '归档文章',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  busyAction.value = { id, type: 'archive' }
  try {
    await archivePost(id)
    ElMessage.success('文章已归档。')
    await refresh()
    if (!posts.value.length && query.value.page > 1) {
      await updateRoute({ page: query.value.page - 1 })
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '归档失败。')
  } finally {
    busyAction.value = null
  }
}

watch(
  () => route.query,
  (routeQuery) => {
    const nextQuery = parsePostListRouteQuery(routeQuery)
    searchInput.value = nextQuery.search
    statusFilter.value = nextQuery.status
    categoryFilter.value = nextQuery.categoryId ?? ''
    sortFilter.value = nextQuery.sort
    setQuery(nextQuery)
  },
  { deep: true, immediate: true },
)

watch(searchInput, scheduleSearch)

onMounted(() => void loadCategories())
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <AdminShell>
    <AdminPage size="wide">
      <PageHeader
        description="通过标题、状态和分类快速定位内容；发布、撤回与归档始终遵守同一条安全链路。"
        eyebrow="CONTENT LIBRARY"
        title="文章"
      >
        <template #actions>
          <RouterLink class="button button--primary" :to="{ name: 'post-new', query: { returnTo: route.fullPath } }">
            <Plus :size="17" aria-hidden="true" />
            新建文章
          </RouterLink>
        </template>
      </PageHeader>

      <section class="posts-workspace" aria-labelledby="post-list-heading">
        <h2 id="post-list-heading" class="sr-only">文章列表</h2>
        <DataToolbar :result-label="resultLabel">
          <template #search>
            <ElInput
              v-model="searchInput"
              clearable
              maxlength="100"
              placeholder="搜索文章标题"
              @clear="updateRoute({ search: '', page: 1 })"
              @keyup.enter="updateRoute({ search: searchInput, page: 1 })"
            >
              <template #prefix><Search :size="16" aria-hidden="true" /></template>
            </ElInput>
          </template>
          <template #filters>
            <ElSelect
              v-model="statusFilter"
              aria-label="按文章状态筛选"
              placeholder="全部状态"
              style="width: 8.5rem"
              @change="updateRoute({ status: statusFilter, page: 1 })"
            >
              <ElOption label="全部状态" value="all" />
              <ElOption label="草稿" value="draft" />
              <ElOption label="已发布" value="published" />
              <ElOption label="已归档" value="archived" />
            </ElSelect>
            <ElSelect
              v-model="categoryFilter"
              aria-label="按分类筛选"
              clearable
              placeholder="全部分类"
              style="width: 9.5rem"
              @change="updateRoute({ categoryId: categoryFilter || null, page: 1 })"
            >
              <ElOption
                v-for="category in categories"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              />
            </ElSelect>
            <ElSelect
              v-model="sortFilter"
              aria-label="文章排序"
              style="width: 9.5rem"
              @change="updateRoute({ sort: sortFilter, page: 1 })"
            >
              <ElOption label="最近更新" value="updated-desc" />
              <ElOption label="最早更新" value="updated-asc" />
              <ElOption label="最近发布" value="published-desc" />
              <ElOption label="标题 A–Z" value="title-asc" />
              <ElOption label="标题 Z–A" value="title-desc" />
            </ElSelect>
          </template>
          <template #actions>
            <ElButton v-if="hasFilters" aria-label="清除文章筛选" @click="clearFilters">
              <RotateCcw :size="16" aria-hidden="true" />
              清除
            </ElButton>
            <ElButton
              :aria-label="refreshing ? '正在刷新文章' : '刷新文章'"
              :loading="refreshing"
              circle
              @click="refresh()"
            >
              <RefreshCw v-if="!refreshing" :size="16" aria-hidden="true" />
            </ElButton>
          </template>
        </DataToolbar>

        <ElAlert
          v-if="categoryError"
          :closable="false"
          show-icon
          title="分类筛选暂时不可用"
          type="warning"
        >
          <template #default>{{ categoryError }}</template>
        </ElAlert>
        <ElAlert
          v-if="errorMessage && hasLoaded"
          :closable="false"
          show-icon
          title="刷新失败，当前仍显示上一次载入的内容"
          type="warning"
        >
          <template #default>
            {{ errorMessage }}
            <ElButton link type="primary" @click="refresh()">重试</ElButton>
          </template>
        </ElAlert>

        <AsyncState
          :description="asyncState === 'empty' ? '创建第一篇草稿，开始建立你的内容库。' : undefined"
          :refreshing="refreshing"
          :state="asyncState"
          :title="asyncState === 'empty' ? '还没有文章' : undefined"
          @clear-filters="clearFilters"
          @retry="refresh()"
        >
          <template v-if="asyncState === 'empty'" #actions>
            <RouterLink class="button button--primary" :to="{ name: 'post-new' }">
              <Plus :size="16" aria-hidden="true" />
              新建文章
            </RouterLink>
          </template>
          <PostTable
            :blog-url="blogUrl"
            :busy-action="busyAction"
            :posts="posts"
            :return-to="route.fullPath"
            @archive="archive"
            @publish="publish"
            @request-draft="requestDraft"
          />
        </AsyncState>

        <PaginationBar
          v-if="asyncState === 'ready'"
          v-model:page="currentPage"
          v-model:page-size="currentPageSize"
          :disabled="refreshing || Boolean(busyAction)"
          :total="total"
        />
      </section>
    </AdminPage>
  </AdminShell>
</template>

<style scoped>
.posts-workspace {
  display: grid;
  gap: 0.9rem;
  padding-top: 1.25rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
