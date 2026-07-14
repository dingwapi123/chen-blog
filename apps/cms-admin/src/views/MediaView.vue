<script setup lang="ts">
import { Upload } from 'lucide-vue-next'
import { onMounted, shallowRef, useTemplateRef } from 'vue'
import AdminShell from '@/components/AdminShell.vue'
import {
  getPublicImageUrl,
  listMedia,
  uploadMedia,
  type AdminMedia,
} from '@/features/content/api'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const maxFileSize = 5 * 1024 * 1024
const media = shallowRef<AdminMedia[]>([])
const file = shallowRef<File | null>(null)
const altText = shallowRef('')
const loading = shallowRef(true)
const uploading = shallowRef(false)
const statusMessage = shallowRef('')
const statusIsError = shallowRef(false)
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

async function refresh() {
  loading.value = true
  statusMessage.value = ''
  try {
    media.value = await listMedia()
  } catch (error) {
    statusIsError.value = true
    statusMessage.value = error instanceof Error ? error.message : '媒体载入失败。'
  } finally {
    loading.value = false
  }
}

onMounted(() => void refresh())

function onFile(event: Event) {
  const nextFile = (event.target as HTMLInputElement).files?.[0] ?? null
  statusMessage.value = ''
  file.value = null
  if (!nextFile) return
  if (!allowedTypes.has(nextFile.type)) {
    statusIsError.value = true
    statusMessage.value = '只支持 JPEG、PNG、WebP 和 GIF 图片。'
    if (fileInput.value) fileInput.value.value = ''
    return
  }
  if (nextFile.size <= 0 || nextFile.size > maxFileSize) {
    statusIsError.value = true
    statusMessage.value = '图片必须大于 0 B 且不超过 5 MiB。'
    if (fileInput.value) fileInput.value.value = ''
    return
  }
  file.value = nextFile
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
    file.value = null
    altText.value = ''
    if (fileInput.value) fileInput.value.value = ''
    statusIsError.value = false
    statusMessage.value = '图片已上传。公开 bucket 中的文件会立即可访问。'
  } catch (error) {
    statusIsError.value = true
    statusMessage.value = error instanceof Error ? error.message : '上传失败。'
  } finally {
    uploading.value = false
  }
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MiB`
  return `${(size / 1024).toFixed(1)} KiB`
}
</script>

<template>
  <AdminShell>
    <div class="page-head">
      <div>
        <p class="eyebrow">post-images</p>
        <h1 class="page-title">媒体</h1>
      </div>
    </div>
    <p id="media-upload-help" class="hint">
      仅可上传不超过 5 MiB 的图片；V1 不提供物理删除，避免正文 Markdown 出现失效引用。
    </p>

    <form class="upload-panel" aria-describedby="media-upload-help" @submit.prevent="upload">
      <div class="field">
        <label for="file">图片文件</label>
        <input
          id="file"
          ref="fileInput"
          accept="image/jpeg,image/png,image/webp,image/gif"
          :disabled="uploading"
          required
          type="file"
          @change="onFile"
        >
      </div>
      <div class="field">
        <label for="alt">替代文本</label>
        <input
          id="alt"
          v-model="altText"
          class="input"
          :disabled="uploading"
          maxlength="300"
          placeholder="描述图片内容"
          required
        >
      </div>
      <button class="button button--primary" :disabled="!file || uploading" type="submit">
        <Upload :size="16" aria-hidden="true" />
        {{ uploading ? '正在上传…' : '上传图片' }}
      </button>
    </form>

    <p
      v-if="statusMessage"
      class="status-message"
      :class="{ 'status-message--error': statusIsError }"
      :role="statusIsError ? 'alert' : 'status'"
    >
      {{ statusMessage }}
    </p>

    <div v-if="loading" class="empty-state" aria-live="polite">
      正在载入媒体…
    </div>
    <div v-else-if="!media.length" class="empty-state">
      尚未上传图片。
    </div>
    <div v-else class="media-grid">
      <article v-for="item in media" :key="item.id" class="media-item">
        <img
          :src="getPublicImageUrl(item)"
          :alt="item.alt_text"
          decoding="async"
          loading="lazy"
        >
        <div>
          <strong>{{ item.alt_text }}</strong>
          <span>{{ item.object_path }}</span>
          <span>{{ item.mime_type }} · {{ formatFileSize(item.size_bytes) }}</span>
        </div>
      </article>
    </div>
  </AdminShell>
</template>

<style scoped>
.page-head {
  margin-bottom: 1rem;
}

.upload-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: end;
  gap: 1rem;
  margin: 1.5rem 0;
  padding: 1rem;
  border: 1px solid var(--outline-ghost);
  border-radius: 0.65rem;
  background: var(--surface-low);
}

.status-message {
  color: var(--on-surface-muted);
  font-size: 0.82rem;
}

.status-message--error {
  color: var(--danger);
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.media-item {
  overflow: hidden;
  border-radius: 0.6rem;
  background: var(--surface-elevated);
}

.media-item img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  background: var(--surface-low);
}

.media-item div {
  display: grid;
  gap: 0.2rem;
  padding: 0.7rem;
}

.media-item strong,
.media-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-item strong {
  font-size: 0.85rem;
}

.media-item span {
  color: var(--on-surface-muted);
  font-size: 0.75rem;
}

@media (max-width: 720px) {
  .upload-panel {
    grid-template-columns: 1fr;
  }

  .upload-panel button {
    justify-self: start;
  }
}
</style>
