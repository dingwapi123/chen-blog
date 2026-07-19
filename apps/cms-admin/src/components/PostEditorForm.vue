<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { Check, Circle, Clock3, FileText, ImagePlus, RotateCcw, Send } from '@lucide/vue'
import { computed, reactive, shallowRef, useTemplateRef, watch } from 'vue'
import type { PostDraftInput } from '@chen-blog/shared-types'
import { calculateReadingMinutes } from '@chen-blog/shared-utils'
import MarkdownEditor, { type MarkdownEditorExpose } from '@/components/MarkdownEditor.vue'
import MediaPickerDialog from '@/components/MediaPickerDialog.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import {
  getPublicImageUrl,
  type AdminMedia,
  type AdminPost,
  type TaxonomyItem,
} from '@/features/content/api'
import { createPostDraft, getPostDraftFingerprint } from '@/features/posts/editor-state'

interface Props {
  post: AdminPost | null
  categories: readonly TaxonomyItem[]
  tags: readonly TaxonomyItem[]
  media: readonly AdminMedia[]
  saving?: boolean
  publishing?: boolean
  transitioning?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  saving: false,
  publishing: false,
  transitioning: false,
})

const emit = defineEmits<{
  save: [input: PostDraftInput]
  publish: [input: PostDraftInput]
  requestDraft: []
  dirtyChange: [dirty: boolean]
}>()

const editorForm = useTemplateRef<FormInstance>('editorForm')
const markdownEditor = useTemplateRef<MarkdownEditorExpose>('markdownEditor')
const mediaPickerOpen = shallowRef(false)
const contentError = shallowRef('')
const initialFingerprint = shallowRef('')
const model = reactive<PostDraftInput>(createPostDraft(null))

const isPublished = computed(() => props.post?.status === 'published')
const isArchived = computed(() => props.post?.status === 'archived')
const isReadOnly = computed(() => isPublished.value || isArchived.value)
const busy = computed(() => props.saving || props.publishing || props.transitioning)
const fieldsDisabled = computed(() => isReadOnly.value || busy.value)
const isDirty = computed(() => (
  !isReadOnly.value && getPostDraftFingerprint(model) !== initialFingerprint.value
))
const categorySelection = computed({
  get: () => model.categoryId ?? '',
  set: (value: string) => { model.categoryId = value || null },
})
const coverSelection = computed({
  get: () => model.coverMediaId ?? '',
  set: (value: string) => { model.coverMediaId = value || null },
})
const coverMedia = computed(() => (
  props.media.find(item => item.id === model.coverMediaId) ?? null
))
const contentCharacters = computed(() => model.content.trim().length)
const headingCount = computed(() => (
  model.content.match(/^#{1,6}\s+.+$/gmu)?.length ?? 0
))
const readingMinutes = computed(() => calculateReadingMinutes(model.content))
const publishChecks = computed(() => [
  { label: '文章标题', complete: Boolean(model.title.trim()) },
  { label: '正文内容', complete: Boolean(model.content.trim()) },
  { label: '摘要（建议）', complete: Boolean(model.summary.trim()) },
])

const rules: FormRules<PostDraftInput> = {
  title: [
    { required: true, message: '请输入文章标题。', trigger: 'blur' },
  ],
}

watch(
  () => props.post,
  (post) => {
    const nextDraft = createPostDraft(post)
    Object.assign(model, nextDraft, { tagIds: [...nextDraft.tagIds] })
    initialFingerprint.value = getPostDraftFingerprint(nextDraft)
    contentError.value = ''
  },
  { immediate: true },
)

watch(isDirty, (dirty) => emit('dirtyChange', dirty), { immediate: true })

function escapeMarkdownAltText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/]/g, '\\]')
}

function insertMedia(item: AdminMedia) {
  const altText = escapeMarkdownAltText(item.alt_text.trim() || '图片')
  markdownEditor.value?.insertMarkdown(`![${altText}](${getPublicImageUrl(item)})`)
}

function getInput(): PostDraftInput {
  return {
    ...model,
    status: 'draft',
    tagIds: [...model.tagIds],
  }
}

async function submit(action: 'save' | 'publish') {
  if (isReadOnly.value || busy.value) return

  contentError.value = ''
  const isValid = await editorForm.value?.validate().catch(() => false)
  if (!isValid) return

  if (action === 'publish' && !model.content.trim()) {
    contentError.value = '发布前请先填写文章正文。'
    return
  }

  if (action === 'publish') emit('publish', getInput())
  else emit('save', getInput())
}
</script>

<template>
  <ElForm
    ref="editorForm"
    class="editor-form"
    label-position="top"
    :model="model"
    :rules="rules"
    @submit.prevent="submit('save')"
  >
    <section class="editor-main" aria-label="文章正文">
      <ElAlert
        v-if="isPublished"
        :closable="false"
        description="已发布文章目前为只读。先转回草稿，再编辑并重新发布。"
        title="文章正在公开展示"
        type="success"
        show-icon
      />
      <ElAlert
        v-else-if="isArchived"
        :closable="false"
        description="V1 不提供恢复入口，归档内容仅保留供查阅。"
        title="文章已归档"
        type="warning"
        show-icon
      />

      <section class="document-fields" aria-labelledby="document-fields-title">
        <div class="section-heading">
          <span id="document-fields-title">文章信息</span>
          <small>标题与内容概览</small>
        </div>

      <ElFormItem label="标题" prop="title">
        <ElInput
          v-model="model.title"
          class="title-input"
          :disabled="fieldsDisabled"
          maxlength="200"
          placeholder="文章标题"
        />
      </ElFormItem>

      <ElFormItem label="摘要">
        <ElInput
          v-model="model.summary"
          class="summary-input"
          :disabled="fieldsDisabled"
          maxlength="320"
          placeholder="用一两句话概括文章内容"
          show-word-limit
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 8 }"
        />
      </ElFormItem>
      </section>

      <section class="content-field" aria-labelledby="content-field-title">
        <div class="content-field__heading">
          <div>
            <span id="content-field-title" class="content-field__label">
              Markdown / Comark 正文
            </span>
            <span class="field-hint">
              正式渲染由 blog-web 的 Nuxt Comark 页面负责。
            </span>
          </div>
          <ElButton
            aria-label="从媒体库插入 Markdown 图片"
            :disabled="fieldsDisabled || props.media.length === 0"
            type="primary"
            plain
            @click="mediaPickerOpen = true"
          >
            <ImagePlus :size="16" aria-hidden="true" />
            从媒体库插入图片
          </ElButton>
        </div>
        <div class="content-metrics" aria-label="正文统计">
          <span><FileText :size="14" aria-hidden="true" />{{ contentCharacters }} 字符</span>
          <span>{{ headingCount }} 个标题</span>
          <span><Clock3 :size="14" aria-hidden="true" />约 {{ readingMinutes }} 分钟阅读</span>
        </div>
        <MarkdownEditor
          ref="markdownEditor"
          v-model="model.content"
          :readonly="fieldsDisabled"
        />
        <span v-if="props.media.length === 0" class="field-hint">
          媒体库中还没有图片，请先前往媒体页上传。
        </span>
        <p v-if="contentError" class="content-error" role="alert">
          {{ contentError }}
        </p>
      </section>
    </section>

    <aside class="editor-side" aria-label="文章设置">
      <header class="inspector-head">
        <div>
          <span>检查器</span>
          <h2>文章设置</h2>
        </div>
        <StatusBadge :status="isPublished ? 'published' : isArchived ? 'archived' : 'draft'" />
      </header>

      <section class="inspector-section" aria-labelledby="taxonomy-heading">
        <div class="inspector-section__heading">
          <h3 id="taxonomy-heading">归类</h3>
          <span>帮助访客找到内容</span>
        </div>
        <ElFormItem label="分类">
          <ElSelect v-model="categorySelection" :disabled="fieldsDisabled" class="side-control">
            <ElOption label="未分类" value="" />
            <ElOption
              v-for="category in props.categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="标签">
          <ElSelect
            v-if="props.tags.length"
            v-model="model.tagIds"
            :disabled="fieldsDisabled"
            class="side-control"
            collapse-tags
            collapse-tags-tooltip
            multiple
            placeholder="选择标签"
          >
            <ElOption
              v-for="tag in props.tags"
              :key="tag.id"
              :label="tag.name"
              :value="tag.id"
            />
          </ElSelect>
          <span v-else class="field-hint">尚未创建标签。</span>
        </ElFormItem>
      </section>

      <section class="inspector-section" aria-labelledby="cover-heading">
        <div class="inspector-section__heading">
          <h3 id="cover-heading">封面</h3>
          <span>用于文章头部与分享场景</span>
        </div>
        <div v-if="coverMedia" class="cover-preview">
          <img :alt="coverMedia.alt_text" :src="getPublicImageUrl(coverMedia)">
          <span>{{ coverMedia.alt_text || coverMedia.object_path }}</span>
        </div>
        <ElFormItem label="封面媒体">
          <ElSelect v-model="coverSelection" :disabled="fieldsDisabled" class="side-control">
            <ElOption label="不使用封面" value="" />
            <ElOption
              v-for="item in props.media"
              :key="item.id"
              :label="item.alt_text || item.object_path"
              :value="item.id"
            />
          </ElSelect>
        </ElFormItem>
      </section>

      <section class="inspector-section publish-check" aria-labelledby="publish-check-heading">
        <div class="inspector-section__heading">
          <h3 id="publish-check-heading">发布检查</h3>
          <span>{{ publishChecks.filter(item => item.complete).length }} / {{ publishChecks.length }} 已完成</span>
        </div>
        <ul>
          <li v-for="item in publishChecks" :key="item.label" :class="{ complete: item.complete }">
            <Check v-if="item.complete" :size="14" aria-hidden="true" />
            <Circle v-else :size="14" aria-hidden="true" />
            {{ item.label }}
          </li>
        </ul>
      </section>

      <div v-if="isPublished" class="editor-actions">
        <ElButton
          :loading="props.transitioning"
          type="primary"
          plain
          @click="emit('requestDraft')"
        >
          <RotateCcw :size="16" aria-hidden="true" />
          转为草稿继续编辑
        </ElButton>
      </div>
      <p v-else-if="isArchived" class="archived-note">
        归档文章只保留查阅，不能发布或恢复。
      </p>
      <div v-else class="editor-actions">
        <ElButton
          :loading="props.saving"
          :disabled="busy"
          native-type="submit"
        >
          保存草稿
        </ElButton>
        <ElButton
          :loading="props.publishing"
          :disabled="busy"
          type="primary"
          @click="submit('publish')"
        >
          <Send :size="16" aria-hidden="true" />
          保存并发布
        </ElButton>
      </div>
    </aside>

    <MediaPickerDialog
      v-model="mediaPickerOpen"
      :media="props.media"
      @select="insertMedia"
    />
  </ElForm>
</template>

<style scoped>
.editor-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 19.5rem;
  gap: 1.25rem;
  align-items: start;
}

.editor-main {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.document-fields,
.content-field {
  display: grid;
  gap: 0.75rem;
  padding: 1.25rem;
  border: 1px solid var(--outline-ghost);
  border-radius: var(--radius-large);
  background: var(--surface-elevated);
}

.document-fields :deep(.el-form-item) {
  margin-bottom: 0.3rem;
}

.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.25rem;
}

.section-heading span {
  font-size: 0.86rem;
  font-weight: 800;
}

.section-heading small {
  color: var(--on-surface-faint);
  font-size: 0.72rem;
}

.title-input :deep(.el-input__inner) {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.summary-input :deep(.el-textarea__inner) {
  line-height: 1.7;
}

.field-hint,
.archived-note {
  display: block;
  margin-top: 0.35rem;
  color: var(--on-surface-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

.content-field__heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
}

.content-field__heading > div {
  display: grid;
}

.content-field__label {
  color: var(--on-surface);
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.4;
}

.content-field__heading .field-hint {
  margin-top: 0.15rem;
}

.content-metrics {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 1rem;
  min-height: 2.35rem;
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-small);
  background: var(--surface-container);
  color: var(--on-surface-muted);
  font-size: 0.72rem;
}

.content-metrics span {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.content-error {
  margin: 0;
  color: var(--danger);
  font-size: 0.82rem;
}

.editor-side {
  position: sticky;
  top: 4.8rem;
  display: grid;
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--outline-ghost);
  border-radius: var(--radius-large);
  background: var(--surface-elevated);
}

.editor-side :deep(.el-form-item) {
  margin-bottom: 0;
}

.inspector-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--surface-container);
}

.inspector-head > div {
  display: grid;
  gap: 0.05rem;
}

.inspector-head span,
.inspector-section__heading span {
  color: var(--on-surface-faint);
  font-size: 0.68rem;
}

.inspector-head h2,
.inspector-section__heading h3 {
  margin: 0;
  letter-spacing: -0.02em;
}

.inspector-head h2 {
  font-size: 0.95rem;
}

.inspector-section {
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
  border-top: 1px solid var(--outline-ghost);
}

.inspector-section__heading {
  display: grid;
  gap: 0.1rem;
}

.inspector-section__heading h3 {
  font-size: 0.8rem;
}

.cover-preview {
  display: grid;
  gap: 0.35rem;
}

.cover-preview img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-small);
  background: var(--surface-low);
  object-fit: cover;
}

.cover-preview span {
  overflow: hidden;
  color: var(--on-surface-muted);
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publish-check ul {
  display: grid;
  gap: 0.45rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.publish-check li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--on-surface-faint);
  font-size: 0.74rem;
}

.publish-check li.complete {
  color: var(--success);
}

.side-control,
.editor-actions,
.editor-actions :deep(.el-button) {
  width: 100%;
}

.editor-actions {
  display: grid;
  gap: 0.6rem;
  padding: 1rem;
  border-top: 1px solid var(--outline-ghost);
  background: var(--surface-container);
}

.editor-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

@media (max-width: 900px) {
  .editor-form {
    grid-template-columns: 1fr;
  }

  .editor-side {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .inspector-head {
    grid-column: 1 / -1;
  }

  .editor-actions,
  .archived-note {
    grid-column: 1 / -1;
  }
}

@media (max-width: 620px) {
  .content-field__heading {
    align-items: stretch;
    flex-direction: column;
  }

  .content-field__heading :deep(.el-button) {
    align-self: start;
  }

  .editor-side {
    grid-template-columns: 1fr;
  }

  .inspector-head {
    grid-column: auto;
  }

  .editor-actions,
  .archived-note {
    grid-column: auto;
  }
}
</style>
