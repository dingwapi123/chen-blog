<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ArrowUpRight } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import type { PostDraftInput } from '@chen-blog/shared-types'
import AdminShell from '@/components/AdminShell.vue'
import AdminPage from '@/components/common/AdminPage.vue'
import AsyncState from '@/components/common/AsyncState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PostEditorForm from '@/components/PostEditorForm.vue'
import { useAuth } from '@/composables/useAuth'
import {
  getPost,
  listMedia,
  listTaxonomy,
  movePostToDraft,
  publishPost,
  PostSavePartialError,
  savePost,
  type AdminMedia,
  type AdminPost,
  type TaxonomyItem,
} from '@/features/content/api'

const route = useRoute()
const router = useRouter()
const { isOwner } = useAuth()
const postId = computed(() => (
  typeof route.params.postId === 'string' ? route.params.postId : undefined
))
const returnTo = computed(() => {
  const value = typeof route.query.returnTo === 'string' ? route.query.returnTo : '/posts'
  return value.startsWith('/posts') && !value.startsWith('//') ? value : '/posts'
})
const publicPostUrl = computed(() => {
  if (post.value?.status !== 'published') return ''
  const base = (import.meta.env.VITE_BLOG_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}/posts/${encodeURIComponent(post.value.id)}`
})

const post = shallowRef<AdminPost | null>(null)
const categories = shallowRef<TaxonomyItem[]>([])
const tags = shallowRef<TaxonomyItem[]>([])
const media = shallowRef<AdminMedia[]>([])
const loading = shallowRef(true)
const loadError = shallowRef('')
const saving = shallowRef(false)
const publishing = shallowRef(false)
const transitioning = shallowRef(false)
const dirty = shallowRef(false)
const bypassNavigationPrompt = shallowRef(false)
let loadSequence = 0
let preserveEditorForPostId: string | undefined

const isBusy = computed(() => saving.value || publishing.value || transitioning.value)

async function loadEditor(currentPostId?: string) {
  const sequence = ++loadSequence
  loading.value = true
  loadError.value = ''

  try {
    const [postValue, categoryValues, tagValues, mediaValues] = await Promise.all([
      currentPostId ? getPost(currentPostId) : Promise.resolve(null),
      listTaxonomy('categories'),
      listTaxonomy('tags'),
      listMedia(),
    ])
    if (sequence !== loadSequence) return
    if (currentPostId && !postValue) throw new Error('文章不存在或已无法访问。')

    post.value = postValue
    categories.value = categoryValues
    tags.value = tagValues
    media.value = mediaValues
  } catch (error) {
    if (sequence === loadSequence) {
      loadError.value = error instanceof Error ? error.message : '载入编辑器失败。'
    }
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

watch(postId, (id) => {
  if (id && id === preserveEditorForPostId) {
    preserveEditorForPostId = undefined
    return
  }
  void loadEditor(id)
}, { immediate: true })

async function replaceNewPostRoute(id: string) {
  if (postId.value) return

  // Keep the form's current draft in memory. A successful save reloads it
  // explicitly; a partial tag save must preserve the unsynchronized tag IDs.
  preserveEditorForPostId = id
  bypassNavigationPrompt.value = true
  try {
    await router.replace({
      name: 'post-editor',
      params: { postId: id },
      query: route.query,
    })
    await nextTick()
    if (postId.value !== id) {
      preserveEditorForPostId = undefined
      throw new Error('无法切换到已创建的文章编辑页。')
    }
  } catch (error) {
    if (preserveEditorForPostId === id) preserveEditorForPostId = undefined
    throw error
  } finally {
    bypassNavigationPrompt.value = false
  }
}

async function reloadSavedPost(id: string) {
  const nextPost = await getPost(id)
  if (!nextPost) throw new Error('文章保存后无法重新载入。')
  post.value = nextPost
  await nextTick()
}

async function syncSavedPost(id: string) {
  await replaceNewPostRoute(id)
  await reloadSavedPost(id)
}

async function recoverPartialSave(error: PostSavePartialError, publishRequested = false) {
  const publishNote = publishRequested ? ' 本次未执行发布。' : ''

  try {
    // Route first: even if the following reload fails, another save updates the
    // row that was just created instead of inserting a duplicate draft.
    await replaceNewPostRoute(error.postId)
  } catch {
    ElMessage.error(
      `${error.message}${publishNote} 自动切换到已创建文章失败，请从文章列表重新打开。`,
    )
    return
  }

  // Do not reload here. The database can contain only part of the requested
  // tag set, while the editor still has the exact selection that must be retried.
  ElMessage.error(`${error.message}${publishNote}`)
}

async function save(input: PostDraftInput) {
  if (isBusy.value) return
  saving.value = true

  try {
    const id = await savePost(postId.value, input)
    await syncSavedPost(id)
    ElMessage.success('草稿已保存。')
  } catch (error) {
    if (error instanceof PostSavePartialError) {
      await recoverPartialSave(error)
      return
    }
    ElMessage.error(error instanceof Error ? error.message : '保存失败。')
  } finally {
    saving.value = false
  }
}

async function saveAndPublish(input: PostDraftInput) {
  if (isBusy.value) return
  publishing.value = true
  let savedId: string | undefined

  try {
    savedId = await savePost(postId.value, input)
    await publishPost(savedId)
    await syncSavedPost(savedId)
    ElMessage.success('最新内容已保存并发布。')
  } catch (error) {
    if (error instanceof PostSavePartialError) {
      await recoverPartialSave(error, true)
      return
    }
    if (savedId) {
      try {
        await syncSavedPost(savedId)
      } catch {
        // Keep the primary publish error visible; a subsequent reload can retry synchronization.
      }
    }
    const reason = error instanceof Error ? error.message : '发布失败。'
    ElMessage.error(savedId ? `草稿已保存，但发布失败：${reason}` : reason)
  } finally {
    publishing.value = false
  }
}

async function requestDraft() {
  if (!postId.value || post.value?.status !== 'published' || isBusy.value) return

  try {
    await ElMessageBox.confirm(
      '文章会立即从公开数据中撤下；Netlify 已缓存的页面最多可能继续显示 10 分钟。完成修改后，需要再次点击“保存并发布”。',
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

  transitioning.value = true
  try {
    await movePostToDraft(postId.value)
    const nextPost = await getPost(postId.value)
    if (!nextPost) throw new Error('文章状态更新后无法重新载入。')
    post.value = nextPost
    ElMessage.success('文章已转为草稿，可以开始编辑。')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '转为草稿失败。')
  } finally {
    transitioning.value = false
  }
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))

function confirmEditorNavigation() {
  if (!isOwner.value || !dirty.value || bypassNavigationPrompt.value) return true
  return window.confirm('尚有未保存的修改，确定离开编辑器吗？')
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

onBeforeRouteLeave(confirmEditorNavigation)
onBeforeRouteUpdate(confirmEditorNavigation)
</script>

<template>
  <AdminShell>
    <AdminPage size="wide">
      <RouterLink class="back" :to="returnTo">
        <ArrowLeft :size="16" aria-hidden="true" />
        返回文章列表
      </RouterLink>

      <PageHeader
        :description="post ? post.title : '从标题和正文开始，保存为草稿后再通过安全发布接口公开。'"
        :eyebrow="postId ? 'EDITOR' : 'NEW DRAFT'"
        :title="postId ? '编辑文章' : '新建文章'"
      >
        <div class="editor-context" aria-live="polite">
          <StatusBadge
            :status="post?.status === 'published' ? 'published' : post?.status === 'archived' ? 'archived' : 'draft'"
          />
          <span v-if="dirty" class="dirty-indicator">有未保存修改</span>
          <span v-else-if="post">上次保存于 {{ formatUpdatedAt(post.updated_at) }}</span>
          <span v-else>尚未保存</span>
        </div>
        <template #actions>
          <a
            v-if="publicPostUrl"
            class="button"
            :href="publicPostUrl"
            rel="noreferrer"
            target="_blank"
          >
            公开页面
            <ArrowUpRight :size="16" aria-hidden="true" />
          </a>
        </template>
      </PageHeader>

      <section class="editor-workspace">
        <AsyncState
          v-if="loadError || loading"
          :description="loadError || '正在准备文章、分类、标签和媒体数据。'"
          :state="loadError ? 'error' : 'loading'"
          :title="loadError ? '编辑器无法载入' : undefined"
          @retry="loadEditor(postId)"
        />
        <PostEditorForm
          v-else
          :categories="categories"
          :media="media"
          :post="post"
          :publishing="publishing"
          :saving="saving"
          :tags="tags"
          :transitioning="transitioning"
          @dirty-change="dirty = $event"
          @publish="saveAndPublish"
          @request-draft="requestDraft"
          @save="save"
        />
      </section>
    </AdminPage>
  </AdminShell>
</template>

<style scoped>
.back {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.65rem;
  color: var(--on-surface-muted);
  font-size: 0.85rem;
}

.back:hover {
  color: var(--accent);
}

.editor-context {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.7rem;
  color: var(--on-surface-faint);
  font-size: 0.74rem;
}

.dirty-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--warning);
  font-weight: 700;
}

.dirty-indicator::before {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background: currentColor;
  content: '';
}

.editor-workspace {
  padding-top: 1.25rem;
}
</style>
