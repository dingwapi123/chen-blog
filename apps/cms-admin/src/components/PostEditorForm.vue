<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ImagePlus, RotateCcw, Send } from '@lucide/vue'
import { computed, reactive, shallowRef, useTemplateRef, watch } from 'vue'
import type { PostDraftInput } from '@chen-blog/shared-types'
import { toSlug } from '@chen-blog/shared-utils'
import MarkdownEditor, { type MarkdownEditorExpose } from '@/components/MarkdownEditor.vue'
import MediaPickerDialog from '@/components/MediaPickerDialog.vue'
import {
  getPublicImageUrl,
  type AdminMedia,
  type AdminPost,
  type TaxonomyItem,
} from '@/features/content/api'
import {
  createPostDraft,
  getPostDraftFingerprint,
  isValidSlug,
} from '@/features/posts/editor-state'

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
const slugEdited = shallowRef(false)
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

const rules: FormRules<PostDraftInput> = {
  title: [
    { required: true, message: '请输入文章标题。', trigger: 'blur' },
  ],
  slug: [
    { required: true, message: '请输入文章 Slug。', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (!value || isValidSlug(value)) callback()
        else callback(new Error('Slug 只能使用文字、数字和单个连字符，且不能以连字符开头或结尾。'))
      },
      trigger: ['blur', 'change'],
    },
  ],
}

watch(
  () => props.post,
  (post) => {
    const nextDraft = createPostDraft(post)
    Object.assign(model, nextDraft, { tagIds: [...nextDraft.tagIds] })
    initialFingerprint.value = getPostDraftFingerprint(nextDraft)
    slugEdited.value = Boolean(post?.slug)
    contentError.value = ''
  },
  { immediate: true },
)

watch(isDirty, (dirty) => emit('dirtyChange', dirty), { immediate: true })

function suggestSlug() {
  if (!slugEdited.value) model.slug = toSlug(model.title)
}

function markSlugEdited() {
  slugEdited.value = true
}

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

      <ElFormItem label="标题" prop="title">
        <ElInput
          v-model="model.title"
          class="title-input"
          :disabled="fieldsDisabled"
          maxlength="200"
          placeholder="文章标题"
          @input="suggestSlug"
        />
      </ElFormItem>

      <ElFormItem label="Slug" prop="slug">
        <ElInput
          v-model="model.slug"
          :disabled="fieldsDisabled"
          maxlength="200"
          placeholder="article-url-slug"
          @input="markSlugEdited"
        />
        <span class="field-hint">
          发布地址会使用它；发布后如需修改，请先转回草稿。
        </span>
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
      <ElFormItem label="内容状态">
        <ElInput
          :model-value="isPublished ? '已发布' : isArchived ? '已归档' : '草稿'"
          disabled
        />
      </ElFormItem>

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
        <ElCheckboxGroup
          v-if="props.tags.length"
          v-model="model.tagIds"
          :disabled="fieldsDisabled"
          class="tag-options"
        >
          <ElCheckbox
            v-for="tag in props.tags"
            :key="tag.id"
            :value="tag.id"
          >
            {{ tag.name }}
          </ElCheckbox>
        </ElCheckboxGroup>
        <span v-else class="field-hint">尚未创建标签。</span>
      </ElFormItem>

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
        归档文章不能发布或恢复。
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
  grid-template-columns: minmax(0, 1fr) 17rem;
  gap: 2rem;
  align-items: start;
}

.editor-main {
  display: grid;
  gap: 0.4rem;
  min-width: 0;
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

.content-field {
  display: grid;
  gap: 0.65rem;
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

.content-error {
  margin: 0;
  color: var(--danger);
  font-size: 0.82rem;
}

.editor-side {
  position: sticky;
  top: 5rem;
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--outline-ghost);
  border-radius: 0.65rem;
  background: var(--surface-low);
}

.editor-side :deep(.el-form-item) {
  margin-bottom: 0;
}

.side-control,
.editor-actions,
.editor-actions :deep(.el-button) {
  width: 100%;
}

.editor-actions {
  display: grid;
  gap: 0.6rem;
}

.editor-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.tag-options {
  display: grid;
  gap: 0.35rem;
  width: 100%;
}

.tag-options :deep(.el-checkbox) {
  height: auto;
  margin-right: 0;
  white-space: normal;
}

@media (max-width: 900px) {
  .editor-form {
    grid-template-columns: 1fr;
  }

  .editor-side {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  .editor-actions,
  .archived-note {
    grid-column: auto;
  }
}
</style>
