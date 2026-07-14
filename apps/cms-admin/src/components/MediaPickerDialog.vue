<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { getPublicImageUrl, type AdminMedia } from '@/features/content/api'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{
  media: readonly AdminMedia[]
}>()

const emit = defineEmits<{
  select: [media: AdminMedia]
}>()

const selectedId = shallowRef<string | null>(null)

const mediaOptions = computed(() => props.media.map((item) => ({
  item,
  label: item.alt_text.trim() || '未填写替代文本',
  url: getPublicImageUrl(item),
})))

const selectedMedia = computed(() => (
  props.media.find((item) => item.id === selectedId.value) ?? null
))

function selectMedia(item: AdminMedia) {
  selectedId.value = item.id
}

function confirmSelection() {
  if (!selectedMedia.value) return
  emit('select', selectedMedia.value)
  open.value = false
}

function resetSelection() {
  selectedId.value = null
}
</script>

<template>
  <ElDialog
    v-model="open"
    append-to-body
    destroy-on-close
    title="从媒体库插入图片"
    width="min(46rem, calc(100vw - 2rem))"
    @closed="resetSelection"
  >
    <p class="media-picker__intro">
      选择一张已上传的公开图片。这里只会插入图片引用，不会删除或移动原文件。
    </p>

    <ElEmpty v-if="mediaOptions.length === 0" description="媒体库中还没有图片" />

    <div v-else class="media-picker__grid" role="group" aria-label="可插入的媒体图片">
      <button
        v-for="option in mediaOptions"
        :key="option.item.id"
        class="media-option"
        :class="{ 'media-option--selected': selectedId === option.item.id }"
        type="button"
        :aria-label="`选择图片：${option.label}`"
        :aria-pressed="selectedId === option.item.id"
        @click="selectMedia(option.item)"
      >
        <ElImage
          class="media-option__image"
          fit="cover"
          lazy
          :alt="option.label"
          :src="option.url"
        />
        <span class="media-option__meta">
          <strong>{{ option.label }}</strong>
          <span>{{ option.item.object_path }}</span>
        </span>
      </button>
    </div>

    <template #footer>
      <ElButton @click="open = false">取消</ElButton>
      <ElButton
        type="primary"
        :disabled="!selectedMedia"
        @click="confirmSelection"
      >
        插入图片
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.media-picker__intro {
  margin: 0 0 1rem;
  color: var(--on-surface-muted);
  font-size: 0.86rem;
}

.media-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr));
  gap: 0.8rem;
  max-height: min(56vh, 34rem);
  overflow-y: auto;
  padding: 0.15rem;
}

.media-option {
  display: grid;
  min-width: 0;
  overflow: hidden;
  padding: 0;
  border: 0;
  border-radius: 0.55rem;
  background: var(--surface-low);
  color: var(--on-surface);
  text-align: left;
  transition: background-color 160ms ease, box-shadow 160ms ease;
}

.media-option:hover {
  background: var(--accent-soft);
}

.media-option--selected {
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 2px var(--accent);
}

.media-option__image {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--surface-elevated);
}

.media-option__image :deep(.el-image__inner) {
  display: block;
}

.media-option__meta {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
  padding: 0.65rem;
}

.media-option__meta strong,
.media-option__meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-option__meta strong {
  font-size: 0.82rem;
}

.media-option__meta span {
  color: var(--on-surface-muted);
  font-size: 0.72rem;
}

@media (prefers-reduced-motion: reduce) {
  .media-option {
    transition: none;
  }
}
</style>
