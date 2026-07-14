<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ImagePlus } from 'lucide-vue-next'
import { reactive, shallowRef, useTemplateRef } from 'vue'
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

interface Props {
  post: AdminPost | null
  categories: readonly TaxonomyItem[]
  tags: readonly TaxonomyItem[]
  media: readonly AdminMedia[]
  saving?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  saving: false,
})

const emit = defineEmits<{
  save: [input: PostDraftInput]
}>()

const editorForm = useTemplateRef<FormInstance>('editorForm')
const markdownEditor = useTemplateRef<MarkdownEditorExpose>('markdownEditor')
const mediaPickerOpen = shallowRef(false)
const slugEdited = shallowRef(Boolean(props.post?.slug))

const model = reactive<PostDraftInput>({
  title: props.post?.title ?? '',
  slug: props.post?.slug ?? '',
  summary: props.post?.summary ?? '',
  content: props.post?.content ?? '',
  categoryId: props.post?.category_id ?? null,
  coverMediaId: props.post?.cover_media_id ?? null,
  tagIds: props.post?.post_tags.map((item) => item.tag_id) ?? [],
  status: props.post?.status === 'archived' ? 'archived' : 'draft',
})

const rules: FormRules<PostDraftInput> = {
  title: [
    { required: true, message: '请输入文章标题。', trigger: 'blur' },
  ],
  slug: [
    { required: true, message: '请输入文章 Slug。', trigger: 'blur' },
  ],
}

function suggestSlug() {
  if (!slugEdited.value) model.slug = toSlug(model.title)
}

function markSlugEdited() {
  slugEdited.value = true
}

function openMediaPicker() {
  mediaPickerOpen.value = true
}

function escapeMarkdownAltText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/]/g, '\\]')
}

function insertMedia(item: AdminMedia) {
  const altText = escapeMarkdownAltText(item.alt_text.trim() || '图片')
  const markdown = `![${altText}](${getPublicImageUrl(item)})`
  markdownEditor.value?.insertMarkdown(markdown)
}

async function submit() {
  const isValid = await editorForm.value?.validate().catch(() => false)
  if (!isValid) return

  emit('save', {
    ...model,
    tagIds: [...model.tagIds],
  })
}
</script>

<template>
  <ElForm
    ref="editorForm"
    class="editor-form"
    label-position="top"
    :model="model"
    :rules="rules"
    @submit.prevent="submit"
  >
    <section class="editor-main" aria-label="文章正文">
      <ElFormItem label="标题" prop="title">
        <ElInput
          v-model="model.title"
          class="title-input"
          maxlength="200"
          placeholder="文章标题"
          @input="suggestSlug"
        />
      </ElFormItem>

      <ElFormItem label="Slug" prop="slug">
        <ElInput
          v-model="model.slug"
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
            :disabled="props.media.length === 0"
            type="primary"
            plain
            @click="openMediaPicker"
          >
            <ImagePlus :size="16" aria-hidden="true" />
            从媒体库插入图片
          </ElButton>
        </div>
        <MarkdownEditor
          ref="markdownEditor"
          v-model="model.content"
        />
        <span v-if="props.media.length === 0" class="field-hint">
          媒体库中还没有图片，请先前往媒体页上传。
        </span>
      </section>
    </section>

    <aside class="editor-side" aria-label="文章设置">
      <ElFormItem label="保存状态">
        <ElSelect v-model="model.status" class="side-control">
          <ElOption label="草稿" value="draft" />
          <ElOption label="归档" value="archived" />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="分类">
        <ElSelect v-model="model.categoryId" class="side-control">
          <ElOption label="未分类" :value="null" />
          <ElOption
            v-for="category in props.categories"
            :key="category.id"
            :label="category.name"
            :value="category.id"
          />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="标签">
        <ElCheckboxGroup v-if="props.tags.length" v-model="model.tagIds" class="tag-options">
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
        <ElSelect v-model="model.coverMediaId" class="side-control">
          <ElOption label="不使用封面" :value="null" />
          <ElOption
            v-for="item in props.media"
            :key="item.id"
            :label="item.alt_text || item.object_path"
            :value="item.id"
          />
        </ElSelect>
      </ElFormItem>

      <ElButton
        class="save-button"
        :loading="props.saving"
        native-type="submit"
        type="primary"
      >
        保存草稿
      </ElButton>
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
  gap: 0.2rem;
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

.field-hint {
  display: block;
  margin-top: 0.35rem;
  color: var(--text-muted);
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
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.4;
}

.content-field__heading .field-hint {
  margin-top: 0.15rem;
}

.editor-side {
  position: sticky;
  top: 5rem;
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--outline-ghost, var(--border));
  border-radius: 0.65rem;
  background: var(--bg-soft);
}

.editor-side :deep(.el-form-item) {
  margin-bottom: 0;
}

.side-control,
.save-button {
  width: 100%;
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

  .save-button {
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

  .save-button {
    grid-column: auto;
  }
}
</style>
