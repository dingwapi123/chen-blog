<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import type { PostDraftInput } from '@chen-blog/shared-types'
import AdminShell from '@/components/AdminShell.vue'
import PostEditorForm from '@/components/PostEditorForm.vue'
import { useAuth } from '@/composables/useAuth'
import {
  getPost,
  listMedia,
  listTaxonomy,
  movePostToDraft,
  publishPost,
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

watch(postId, (id) => void loadEditor(id), { immediate: true })

async function syncSavedPost(id: string) {
  const nextPost = await getPost(id)
  if (!nextPost) throw new Error('文章保存后无法重新载入。')
  post.value = nextPost
  await nextTick()

  if (!postId.value) {
    bypassNavigationPrompt.value = true
    try {
      await router.replace({ name: 'post-editor', params: { postId: id } })
    } finally {
      bypassNavigationPrompt.value = false
    }
  }
}

async function save(input: PostDraftInput) {
  if (isBusy.value) return
  saving.value = true

  try {
    const id = await savePost(postId.value, input)
    await syncSavedPost(id)
    ElMessage.success('草稿已保存。')
  } catch (error) {
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
      '文章会立即从公开页面撤下。完成修改后，需要再次点击“保存并发布”。',
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

onBeforeRouteLeave(confirmEditorNavigation)
onBeforeRouteUpdate(confirmEditorNavigation)
</script>

<template>
  <AdminShell>
    <div class="page-head">
      <div>
        <RouterLink class="back" :to="{ name: 'dashboard' }">
          <ArrowLeft :size="16" aria-hidden="true" />
          文章
        </RouterLink>
        <p class="eyebrow">{{ postId ? 'editing' : 'new post' }}</p>
        <h1 class="page-title">{{ postId ? '编辑文章' : '新建文章' }}</h1>
      </div>
    </div>

    <ElAlert
      v-if="loadError"
      :closable="false"
      :title="loadError"
      type="error"
      show-icon
    />
    <div v-else-if="loading" class="empty-state" aria-live="polite">
      正在载入编辑器…
    </div>
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
  </AdminShell>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.back {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.55rem;
  color: var(--on-surface-muted);
  font-size: 0.85rem;
}

.back:hover {
  color: var(--accent);
}

.page-head .eyebrow {
  margin: 0.2rem 0 0;
}
</style>
