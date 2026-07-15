<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  Check,
  Clipboard,
  Grid2X2,
  Image as ImageIcon,
  List,
  RefreshCw,
  RotateCcw,
  Search,
  Upload,
} from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import AdminShell from '@/components/AdminShell.vue'
import AdminPage from '@/components/common/AdminPage.vue'
import AsyncState, { type AsyncStateMode } from '@/components/common/AsyncState.vue'
import DataToolbar from '@/components/common/DataToolbar.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import {
  getPublicImageUrl,
  listMedia,
  updateMediaAltText,
  uploadMedia,
  type AdminMedia,
} from '@/features/content/api'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const maxFileSize = 5 * 1024 * 1024
const media = shallowRef<AdminMedia[]>([])
const file = shallowRef<File | null>(null)
const previewUrl = shallowRef('')
const altText = shallowRef('')
const loading = shallowRef(true)
const refreshing = shallowRef(false)
const hasLoaded = shallowRef(false)
const uploading = shallowRef(false)
const statusMessage = shallowRef('')
const statusIsError = shallowRef(false)
const dragging = shallowRef(false)
const search = shallowRef('')
const mimeFilter = shallowRef('all')
const viewMode = shallowRef<'grid' | 'list'>('grid')
const page = shallowRef(1)
const pageSize = shallowRef(24)
const detailOpen = shallowRef(false)
const selectedMedia = shallowRef<AdminMedia | null>(null)
const detailAltText = shallowRef('')
const savingDetails = shallowRef(false)
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
let requestSequence = 0

const filteredMedia = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('zh-CN')
  return media.value.filter((item) => {
    const matchesType = mimeFilter.value === 'all' || item.mime_type === mimeFilter.value
    const matchesSearch = !keyword
      || item.alt_text.toLocaleLowerCase('zh-CN').includes(keyword)
      || item.object_path.toLocaleLowerCase('zh-CN').includes(keyword)
    return matchesType && matchesSearch
  })
})
const pagedMedia = computed(() => {
  const from = (page.value - 1) * pageSize.value
  return filteredMedia.value.slice(from, from + pageSize.value)
})
const hasFilters = computed(() => Boolean(search.value.trim()) || mimeFilter.value !== 'all')
const asyncState = computed<AsyncStateMode>(() => {
  if (loading.value) return 'loading'
  if (statusIsError.value && statusMessage.value && !hasLoaded.value) return 'error'
  if (!media.value.length) return 'empty'
  if (!filteredMedia.value.length) return 'filtered-empty'
  return 'ready'
})

function revokePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

function clearSelection() {
  revokePreview()
  file.value = null
  altText.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function selectFile(nextFile: File | null) {
  statusMessage.value = ''
  statusIsError.value = false
  revokePreview()
  file.value = null
  if (!nextFile) return

  if (!allowedTypes.has(nextFile.type)) {
    statusIsError.value = true
    statusMessage.value = '只支持 JPEG、PNG、WebP 和 GIF 图片。'
    return
  }
  if (nextFile.size <= 0 || nextFile.size > maxFileSize) {
    statusIsError.value = true
    statusMessage.value = '图片必须大于 0 B 且不超过 5 MiB。'
    return
  }

  file.value = nextFile
  previewUrl.value = URL.createObjectURL(nextFile)
  if (!altText.value) altText.value = nextFile.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
}

function onFile(event: Event) {
  selectFile((event.target as HTMLInputElement).files?.[0] ?? null)
}

function onDrop(event: DragEvent) {
  dragging.value = false
  if (uploading.value) return
  selectFile(event.dataTransfer?.files?.[0] ?? null)
}

async function refresh() {
  const sequence = ++requestSequence
  if (hasLoaded.value) refreshing.value = true
  else loading.value = true
  statusMessage.value = ''
  statusIsError.value = false

  try {
    const nextMedia = await listMedia()
    if (sequence === requestSequence) {
      media.value = nextMedia
      hasLoaded.value = true
    }
  } catch (error) {
    if (sequence === requestSequence) {
      statusIsError.value = true
      statusMessage.value = error instanceof Error ? error.message : '媒体载入失败。'
    }
  } finally {
    if (sequence === requestSequence) {
      loading.value = false
      refreshing.value = false
    }
  }
}

async function upload() {
  if (!file.value || uploading.value) return
  if (!altText.value.trim()) {
    statusIsError.value = true
    statusMessage.value = '请填写能够描述图片内容的替代文本。'
    return
  }

  uploading.value = true
  statusMessage.value = ''
  try {
    const uploadedMedia = await uploadMedia(file.value, altText.value.trim())
    media.value = [uploadedMedia, ...media.value]
    hasLoaded.value = true
    clearSelection()
    statusIsError.value = false
    statusMessage.value = '图片已上传。公开 bucket 中的文件现在即可访问。'
    ElMessage.success('图片上传成功。')
  } catch (error) {
    statusIsError.value = true
    statusMessage.value = error instanceof Error ? error.message : '上传失败。'
  } finally {
    uploading.value = false
  }
}

function openDetail(item: AdminMedia) {
  selectedMedia.value = item
  detailAltText.value = item.alt_text
  detailOpen.value = true
}

async function copyUrl(item: AdminMedia) {
  try {
    await navigator.clipboard.writeText(getPublicImageUrl(item))
    ElMessage.success('公开 URL 已复制。')
  } catch {
    ElMessage.error('复制失败，请在媒体详情中手动复制 URL。')
  }
}

async function saveDetails() {
  if (!selectedMedia.value || savingDetails.value) return
  if (!detailAltText.value.trim()) {
    ElMessage.error('替代文本不能为空。')
    return
  }

  savingDetails.value = true
  try {
    const updated = await updateMediaAltText(selectedMedia.value.id, detailAltText.value)
    media.value = media.value.map(item => item.id === updated.id ? updated : item)
    selectedMedia.value = updated
    detailAltText.value = updated.alt_text
    ElMessage.success('媒体信息已更新。已插入 Markdown 的替代文本不会被改写。')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '媒体信息更新失败。')
  } finally {
    savingDetails.value = false
  }
}

function clearFilters() {
  search.value = ''
  mimeFilter.value = 'all'
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MiB`
  return `${(size / 1024).toFixed(1)} KiB`
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value))
}

function typeLabel(mimeType: string) {
  return mimeType.split('/')[1]?.toUpperCase() || mimeType
}

watch([search, mimeFilter], () => { page.value = 1 })
watch(pageSize, () => { page.value = 1 })
onMounted(() => void refresh())
onBeforeUnmount(() => {
  requestSequence += 1
  revokePreview()
})
</script>

<template>
  <AdminShell>
    <AdminPage size="wide">
      <PageHeader
        description="上传、查找和复用文章图片。素材上传后立即公开，V1 不提供删除、覆盖或重命名。"
        eyebrow="ASSET LIBRARY"
        title="媒体"
      >
        <template #actions>
          <StatusBadge label="公开 Bucket" status="success" />
        </template>
      </PageHeader>

      <section class="media-workspace">
        <form class="upload-composer" aria-labelledby="upload-title" @submit.prevent="upload">
          <header>
            <div>
              <p class="panel-kicker">UPLOAD</p>
              <h2 id="upload-title">上传新素材</h2>
            </div>
            <span>JPEG · PNG · WebP · GIF / 最大 5 MiB</span>
          </header>

          <div class="upload-composer__body">
            <label
              class="drop-zone"
              :class="{ 'drop-zone--active': dragging, 'drop-zone--selected': file }"
              for="media-file"
              @dragenter.prevent="dragging = true"
              @dragleave.prevent="dragging = false"
              @dragover.prevent
              @drop.prevent="onDrop"
            >
              <img v-if="previewUrl" :src="previewUrl" alt="待上传图片预览">
              <span v-else class="drop-zone__icon"><Upload :size="22" aria-hidden="true" /></span>
              <span class="drop-zone__copy">
                <strong>{{ file ? file.name : '拖放图片，或点击选择文件' }}</strong>
                <small>{{ file ? formatFileSize(file.size) : '只上传有权公开使用的图片' }}</small>
              </span>
              <input
                id="media-file"
                ref="fileInput"
                accept="image/jpeg,image/png,image/webp,image/gif"
                :disabled="uploading"
                type="file"
                @change="onFile"
              >
            </label>

            <div class="upload-fields">
              <div class="field">
                <label for="media-alt">替代文本</label>
                <input
                  id="media-alt"
                  v-model="altText"
                  class="input"
                  :disabled="uploading"
                  maxlength="300"
                  placeholder="准确描述图片中的信息"
                >
                <span class="hint">用于无障碍阅读；插入 Markdown 时会作为默认图片描述。</span>
              </div>
              <div class="upload-actions">
                <ElButton v-if="file" :disabled="uploading" @click="clearSelection">清除</ElButton>
                <ElButton :disabled="!file || !altText.trim()" :loading="uploading" native-type="submit" type="primary">
                  <Upload v-if="!uploading" :size="16" aria-hidden="true" />
                  上传图片
                </ElButton>
              </div>
            </div>
          </div>
        </form>

        <p
          v-if="statusMessage"
          class="media-status"
          :class="{ 'media-status--error': statusIsError }"
          :role="statusIsError ? 'alert' : 'status'"
        >
          <Check v-if="!statusIsError" :size="15" aria-hidden="true" />
          {{ statusMessage }}
        </p>

        <DataToolbar :result-label="`共 ${filteredMedia.length} 个素材`">
          <template #search>
            <ElInput v-model="search" clearable placeholder="搜索替代文本或文件名">
              <template #prefix><Search :size="16" aria-hidden="true" /></template>
            </ElInput>
          </template>
          <template #filters>
            <ElSelect v-model="mimeFilter" aria-label="按图片格式筛选" style="width: 9rem">
              <ElOption label="全部格式" value="all" />
              <ElOption label="JPEG" value="image/jpeg" />
              <ElOption label="PNG" value="image/png" />
              <ElOption label="WebP" value="image/webp" />
              <ElOption label="GIF" value="image/gif" />
            </ElSelect>
          </template>
          <template #actions>
            <ElButton v-if="hasFilters" @click="clearFilters">
              <RotateCcw :size="16" aria-hidden="true" />清除
            </ElButton>
            <ElButtonGroup aria-label="媒体显示方式">
              <ElButton :type="viewMode === 'grid' ? 'primary' : 'default'" aria-label="网格显示" @click="viewMode = 'grid'">
                <Grid2X2 :size="16" aria-hidden="true" />
              </ElButton>
              <ElButton :type="viewMode === 'list' ? 'primary' : 'default'" aria-label="列表显示" @click="viewMode = 'list'">
                <List :size="16" aria-hidden="true" />
              </ElButton>
            </ElButtonGroup>
            <ElButton
              :aria-label="refreshing ? '正在刷新媒体' : '刷新媒体'"
              :loading="refreshing"
              circle
              @click="refresh"
            >
              <RefreshCw v-if="!refreshing" :size="16" aria-hidden="true" />
            </ElButton>
          </template>
        </DataToolbar>

        <AsyncState
          :description="asyncState === 'empty' ? '上传第一张文章图片，建立可复用的素材库。' : undefined"
          :refreshing
          :state="asyncState"
          :title="asyncState === 'empty' ? '还没有媒体素材' : undefined"
          @clear-filters="clearFilters"
          @retry="refresh"
        >
          <template v-if="asyncState === 'empty'" #actions>
            <label class="button button--primary" for="media-file">
              <Upload :size="16" aria-hidden="true" />选择图片
            </label>
          </template>

          <div v-if="viewMode === 'grid'" class="media-grid" role="list" aria-label="媒体素材">
            <article v-for="item in pagedMedia" :key="item.id" class="media-card" role="listitem">
              <button type="button" @click="openDetail(item)">
                <img :alt="item.alt_text" :src="getPublicImageUrl(item)" decoding="async" loading="lazy">
                <span class="media-card__overlay">查看详情</span>
              </button>
              <div class="media-card__meta">
                <strong>{{ item.alt_text }}</strong>
                <span>{{ typeLabel(item.mime_type) }} · {{ formatFileSize(item.size_bytes) }}</span>
                <div>
                  <span>{{ formatCreatedAt(item.created_at) }}</span>
                  <ElButton :aria-label="`复制图片 URL：${item.alt_text}`" circle link @click="copyUrl(item)">
                    <Clipboard :size="15" aria-hidden="true" />
                  </ElButton>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="media-list" role="list" aria-label="媒体素材">
            <article v-for="item in pagedMedia" :key="item.id" role="listitem">
              <button class="media-list__preview" type="button" @click="openDetail(item)">
                <img :alt="item.alt_text" :src="getPublicImageUrl(item)" loading="lazy">
              </button>
              <div class="media-list__content">
                <strong>{{ item.alt_text }}</strong>
                <span>{{ item.object_path }}</span>
                <small>{{ typeLabel(item.mime_type) }} · {{ formatFileSize(item.size_bytes) }} · {{ formatCreatedAt(item.created_at) }}</small>
              </div>
              <ElButton @click="copyUrl(item)"><Clipboard :size="15" />复制 URL</ElButton>
              <ElButton @click="openDetail(item)">详情</ElButton>
            </article>
          </div>
        </AsyncState>

        <PaginationBar
          v-if="asyncState === 'ready' && filteredMedia.length > pageSize"
          v-model:page="page"
          v-model:page-size="pageSize"
          :page-sizes="[12, 24, 48]"
          :total="filteredMedia.length"
        />
      </section>
    </AdminPage>

    <ElDrawer
      v-model="detailOpen"
      append-to-body
      size="min(32rem, 100vw)"
      title="媒体详情"
    >
      <div v-if="selectedMedia" class="media-detail">
        <img :alt="selectedMedia.alt_text" :src="getPublicImageUrl(selectedMedia)">
        <div class="media-detail__facts">
          <span><strong>格式</strong>{{ typeLabel(selectedMedia.mime_type) }}</span>
          <span><strong>大小</strong>{{ formatFileSize(selectedMedia.size_bytes) }}</span>
          <span><strong>上传时间</strong>{{ formatCreatedAt(selectedMedia.created_at) }}</span>
        </div>
        <div class="field">
          <label for="detail-alt">替代文本</label>
          <textarea id="detail-alt" v-model="detailAltText" class="textarea" maxlength="300" rows="4" />
          <span class="hint">修改这里只影响媒体元数据，不会改写已经插入正文的 Markdown 描述。</span>
        </div>
        <div class="field">
          <label for="detail-url">公开 URL</label>
          <input id="detail-url" class="input" readonly :value="getPublicImageUrl(selectedMedia)">
        </div>
        <div class="media-detail__actions">
          <ElButton @click="copyUrl(selectedMedia)"><Clipboard :size="15" />复制 URL</ElButton>
          <ElButton :loading="savingDetails" type="primary" @click="saveDetails">保存替代文本</ElButton>
        </div>
        <div class="media-detail__notice">
          <ImageIcon :size="18" aria-hidden="true" />
          <span><strong>此文件已经公开。</strong>V1 不提供删除、重命名或覆盖，避免文章中的图片引用失效。</span>
        </div>
      </div>
    </ElDrawer>
  </AdminShell>
</template>

<style scoped>
.media-workspace {
  display: grid;
  gap: 0.9rem;
  padding-top: 1.25rem;
}

.upload-composer {
  overflow: hidden;
  border: 1px solid var(--outline-ghost);
  border-radius: var(--radius-large);
  background: var(--surface-elevated);
}

.upload-composer > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  background: var(--surface-container);
}

.panel-kicker {
  margin: 0;
  color: var(--on-surface-faint);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.upload-composer h2 {
  margin: 0.1rem 0 0;
  font-size: 0.9rem;
}

.upload-composer > header > span {
  color: var(--on-surface-faint);
  font-size: 0.7rem;
}

.upload-composer__body {
  display: grid;
  grid-template-columns: minmax(18rem, 0.8fr) minmax(20rem, 1.2fr);
  gap: 1rem;
  padding: 1rem;
}

.drop-zone {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  min-height: 8.5rem;
  align-items: center;
  gap: 0.8rem;
  overflow: hidden;
  padding: 1rem;
  border: 1px dashed var(--outline-ghost);
  border-radius: var(--radius-medium);
  background: var(--surface-container);
  cursor: pointer;
}

.drop-zone:hover,
.drop-zone--active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.drop-zone--selected {
  grid-template-columns: 7rem minmax(0, 1fr);
  border-style: solid;
}

.drop-zone > img {
  width: 7rem;
  height: 6rem;
  border-radius: var(--radius-small);
  object-fit: cover;
}

.drop-zone__icon {
  display: grid;
  width: 2.8rem;
  height: 2.8rem;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-high);
  color: var(--accent);
}

.drop-zone__copy {
  display: grid;
  min-width: 0;
  gap: 0.2rem;
}

.drop-zone__copy strong,
.drop-zone__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drop-zone__copy strong {
  font-size: 0.82rem;
}

.drop-zone__copy small {
  color: var(--on-surface-muted);
  font-size: 0.72rem;
}

.drop-zone input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
}

.upload-fields {
  display: grid;
  align-content: space-between;
  gap: 1rem;
}

.upload-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.media-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  padding: 0.65rem 0.8rem;
  border-radius: var(--radius-small);
  background: var(--success-soft);
  color: var(--success);
  font-size: 0.78rem;
}

.media-status--error {
  background: var(--danger-soft);
  color: var(--danger);
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13.5rem, 1fr));
  gap: 0.8rem;
}

.media-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--outline-ghost);
  border-radius: var(--radius-medium);
  background: var(--surface-elevated);
}

.media-card > button {
  position: relative;
  display: block;
  width: 100%;
  overflow: hidden;
  padding: 0;
  border: 0;
  background: var(--surface-low);
}

.media-card img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  transition: transform 180ms ease;
}

.media-card__overlay {
  position: absolute;
  inset: auto 0 0;
  padding: 1.5rem 0.7rem 0.6rem;
  background: linear-gradient(transparent, color-mix(in srgb, var(--code-surface) 82%, transparent));
  color: var(--code-on-surface);
  font-size: 0.72rem;
  opacity: 0;
  text-align: left;
}

.media-card > button:hover img,
.media-card > button:focus-visible img {
  transform: scale(1.025);
}

.media-card > button:hover .media-card__overlay,
.media-card > button:focus-visible .media-card__overlay {
  opacity: 1;
}

.media-card__meta {
  display: grid;
  gap: 0.15rem;
  padding: 0.7rem;
}

.media-card__meta strong,
.media-card__meta > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-card__meta strong {
  font-size: 0.8rem;
}

.media-card__meta span {
  color: var(--on-surface-muted);
  font-size: 0.7rem;
}

.media-card__meta > div {
  display: flex;
  min-height: 2rem;
  align-items: center;
  justify-content: space-between;
}

.media-list {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--outline-ghost);
  border-radius: var(--radius-large);
  background: var(--surface-elevated);
}

.media-list article {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.8rem;
  min-height: 5.5rem;
  padding: 0.6rem;
}

.media-list article:hover,
.media-list article:focus-within {
  background: var(--surface-low);
}

.media-list__preview {
  padding: 0;
  border: 0;
  border-radius: var(--radius-small);
  background: var(--surface-low);
}

.media-list__preview img {
  display: block;
  width: 4.5rem;
  height: 4rem;
  border-radius: inherit;
  object-fit: cover;
}

.media-list__content {
  display: grid;
  min-width: 0;
  gap: 0.1rem;
}

.media-list__content strong,
.media-list__content span,
.media-list__content small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-list__content strong {
  font-size: 0.82rem;
}

.media-list__content span,
.media-list__content small {
  color: var(--on-surface-muted);
  font-size: 0.7rem;
}

.media-detail {
  display: grid;
  gap: 1.1rem;
}

.media-detail > img {
  display: block;
  width: 100%;
  max-height: 22rem;
  border-radius: var(--radius-medium);
  background: var(--surface-low);
  object-fit: contain;
}

.media-detail__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.media-detail__facts span {
  display: grid;
  padding: 0.65rem;
  border-radius: var(--radius-small);
  background: var(--surface-container);
  color: var(--on-surface-muted);
  font-size: 0.72rem;
}

.media-detail__facts strong {
  color: var(--on-surface);
}

.media-detail__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.media-detail__notice {
  display: flex;
  gap: 0.6rem;
  padding: 0.8rem;
  border-radius: var(--radius-small);
  background: var(--warning-soft);
  color: var(--warning);
}

.media-detail__notice span {
  color: var(--on-surface-muted);
  font-size: 0.75rem;
  line-height: 1.55;
}

.media-detail__notice strong {
  color: var(--on-surface);
}

@media (max-width: 760px) {
  .upload-composer__body {
    grid-template-columns: 1fr;
  }

  .media-list article {
    grid-template-columns: 4.5rem minmax(0, 1fr) auto;
  }

  .media-list article > :last-child {
    display: none;
  }
}

@media (max-width: 520px) {
  .upload-composer > header {
    align-items: flex-start;
    flex-direction: column;
  }

  .drop-zone,
  .drop-zone--selected {
    grid-template-columns: 1fr;
  }

  .drop-zone > img {
    width: 100%;
    height: 8rem;
  }

  .media-list article {
    grid-template-columns: 4.5rem minmax(0, 1fr);
  }

  .media-list article > .el-button {
    display: none;
  }

  .media-detail__facts {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .media-card img {
    transition: none;
  }
}
</style>
