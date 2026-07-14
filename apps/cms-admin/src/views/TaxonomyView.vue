<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { computed, reactive, shallowRef, watch } from 'vue'
import AdminShell from '@/components/AdminShell.vue'
import {
  deleteTaxonomy,
  listTaxonomy,
  saveTaxonomy,
  type TaxonomyItem,
} from '@/features/content/api'
import { isValidSlug } from '@/features/posts/editor-state'

const props = defineProps<{ kind: 'categories' | 'tags' }>()
const items = shallowRef<TaxonomyItem[]>([])
const editing = shallowRef<TaxonomyItem | null>(null)
const loading = shallowRef(false)
const saving = shallowRef(false)
const deletingId = shallowRef<string | null>(null)
const errorMessage = shallowRef('')
const formMessage = shallowRef('')
const form = reactive({ name: '', slug: '', description: '' })
let requestSequence = 0

const title = computed(() => props.kind === 'categories' ? '分类' : '标签')
const nameInputId = computed(() => `${props.kind}-name`)
const slugInputId = computed(() => `${props.kind}-slug`)
const descriptionInputId = computed(() => `${props.kind}-description`)

function resetForm() {
  editing.value = null
  form.name = ''
  form.slug = ''
  form.description = ''
  formMessage.value = ''
}

function edit(item?: TaxonomyItem) {
  editing.value = item ?? null
  form.name = item?.name ?? ''
  form.slug = item?.slug ?? ''
  form.description = item?.description ?? ''
  formMessage.value = ''
}

async function refresh(kind = props.kind) {
  const sequence = ++requestSequence
  loading.value = true
  errorMessage.value = ''

  try {
    const nextItems = await listTaxonomy(kind)
    if (sequence === requestSequence && kind === props.kind) items.value = nextItems
  } catch (error) {
    if (sequence === requestSequence) {
      errorMessage.value = error instanceof Error ? error.message : `${title.value}载入失败。`
    }
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

watch(
  () => props.kind,
  (kind) => {
    items.value = []
    resetForm()
    void refresh(kind)
  },
  { immediate: true },
)

async function submit() {
  if (saving.value) return
  const kind = props.kind
  const kindTitle = title.value
  formMessage.value = ''
  if (!form.name.trim()) {
    formMessage.value = `请输入${title.value}名称。`
    return
  }
  if (!isValidSlug(form.slug, 100)) {
    formMessage.value = 'Slug 只能使用文字、数字和单个连字符，且不能以连字符开头或结尾。'
    return
  }

  saving.value = true
  try {
    await saveTaxonomy(kind, {
      id: editing.value?.id,
      name: form.name.trim(),
      slug: form.slug,
      description: form.description.trim(),
    })
    ElMessage.success(`${kindTitle}已保存。`)
    if (kind !== props.kind) return
    resetForm()
    await refresh(kind)
  } catch (error) {
    formMessage.value = error instanceof Error ? error.message : '保存失败。'
  } finally {
    saving.value = false
  }
}

async function remove(item: TaxonomyItem) {
  if (deletingId.value) return
  const kind = props.kind
  const kindTitle = title.value
  try {
    await ElMessageBox.confirm(
      `删除“${item.name}”后，相关公开内容的归类可能发生变化。`,
      `删除${kindTitle}？`,
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  deletingId.value = item.id
  try {
    await deleteTaxonomy(kind, item.id)
    if (kind !== props.kind) return
    if (editing.value?.id === item.id) resetForm()
    ElMessage.success(`${kindTitle}已删除。`)
    await refresh(kind)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除失败。')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <AdminShell>
    <div class="page-head">
      <div>
        <p class="eyebrow">taxonomy</p>
        <h1 class="page-title">{{ title }}</h1>
      </div>
      <button class="button" type="button" @click="edit()">
        <Plus :size="16" aria-hidden="true" />
        新建{{ title }}
      </button>
    </div>

    <ElAlert
      v-if="errorMessage"
      :closable="false"
      :title="errorMessage"
      type="error"
      show-icon
      class="load-error"
    />

    <section class="taxonomy-layout">
      <div class="list" :aria-busy="loading">
        <div v-if="loading" class="empty-state" aria-live="polite">
          正在载入{{ title }}…
        </div>
        <template v-else>
          <article v-for="item in items" :key="item.id" class="item">
            <div class="item__content">
              <strong>{{ item.name }}</strong>
              <span>/{{ item.slug }}</span>
              <p v-if="props.kind === 'categories'">{{ item.description }}</p>
            </div>
            <div class="item__actions">
              <button
                class="plain-button"
                type="button"
                :aria-label="`编辑${title}：${item.name}`"
                @click="edit(item)"
              >
                <Pencil :size="16" aria-hidden="true" />
              </button>
              <button
                class="plain-button danger"
                type="button"
                :aria-label="`删除${title}：${item.name}`"
                :disabled="deletingId === item.id"
                @click="remove(item)"
              >
                <Trash2 :size="16" aria-hidden="true" />
              </button>
            </div>
          </article>
        </template>
        <p v-if="!loading && !items.length && !errorMessage" class="empty-state">
          尚无{{ title }}。
        </p>
      </div>

      <form class="form" @submit.prevent="submit">
        <h2>{{ editing ? '编辑' : '新建' }}{{ title }}</h2>
        <div class="field">
          <label :for="nameInputId">名称</label>
          <input
            :id="nameInputId"
            v-model="form.name"
            class="input"
            maxlength="80"
            required
          >
        </div>
        <div class="field">
          <label :for="slugInputId">Slug</label>
          <input
            :id="slugInputId"
            v-model="form.slug"
            class="input"
            maxlength="100"
            required
          >
        </div>
        <div v-if="props.kind === 'categories'" class="field">
          <label :for="descriptionInputId">说明</label>
          <textarea
            :id="descriptionInputId"
            v-model="form.description"
            class="textarea"
            rows="5"
          />
        </div>
        <p v-if="formMessage" class="form-message" role="alert">
          {{ formMessage }}
        </p>
        <button class="button button--primary" :disabled="saving" type="submit">
          {{ saving ? '正在保存…' : '保存' }}
        </button>
      </form>
    </section>
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

.taxonomy-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20rem;
  gap: 2rem;
}

.list {
  display: grid;
  align-content: start;
  gap: 0.45rem;
}

.item {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.55rem;
}

.item:hover,
.item:focus-within {
  background: var(--surface-low);
}

.item__content {
  min-width: 0;
}

.item strong {
  margin-right: 0.5rem;
}

.item span,
.item p {
  color: var(--on-surface-muted);
  font-size: 0.84rem;
}

.item p {
  margin: 0.3rem 0 0;
}

.item__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 0.15rem;
}

.plain-button {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: var(--on-surface-muted);
}

.plain-button:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.plain-button.danger:hover {
  color: var(--danger);
}

.form {
  display: grid;
  align-content: start;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--outline-ghost);
  border-radius: 0.65rem;
  background: var(--surface-low);
}

.form h2,
.form-message {
  margin: 0;
}

.form h2 {
  font-size: 1.1rem;
}

.form-message {
  color: var(--danger);
  font-size: 0.82rem;
}

.load-error {
  margin-bottom: 1rem;
}

@media (max-width: 760px) {
  .taxonomy-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-head {
    align-items: stretch;
    flex-direction: column;
  }

  .page-head .button {
    align-self: start;
  }
}
</style>
