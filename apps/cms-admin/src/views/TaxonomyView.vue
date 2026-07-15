<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { Pencil, Plus, RefreshCw, Search, Trash2 } from '@lucide/vue'
import { computed, reactive, shallowRef, watch } from 'vue'
import { toSlug } from '@chen-blog/shared-utils'
import AdminShell from '@/components/AdminShell.vue'
import AdminPage from '@/components/common/AdminPage.vue'
import AsyncState, { type AsyncStateMode } from '@/components/common/AsyncState.vue'
import DataToolbar from '@/components/common/DataToolbar.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
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
const refreshing = shallowRef(false)
const hasLoaded = shallowRef(false)
const saving = shallowRef(false)
const deletingId = shallowRef<string | null>(null)
const errorMessage = shallowRef('')
const formMessage = shallowRef('')
const drawerOpen = shallowRef(false)
const slugEdited = shallowRef(false)
const search = shallowRef('')
const page = shallowRef(1)
const pageSize = shallowRef(15)
const form = reactive({ name: '', slug: '', description: '' })
let requestSequence = 0

const title = computed(() => props.kind === 'categories' ? '分类' : '标签')
const description = computed(() => props.kind === 'categories'
  ? '用少量稳定分类组织文章的主要方向。'
  : '维护可跨文章复用的主题关键词。')
const nameInputId = computed(() => `${props.kind}-name`)
const slugInputId = computed(() => `${props.kind}-slug`)
const descriptionInputId = computed(() => `${props.kind}-description`)
const filteredItems = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('zh-CN')
  if (!keyword) return items.value
  return items.value.filter(item => (
    item.name.toLocaleLowerCase('zh-CN').includes(keyword)
    || item.slug.toLocaleLowerCase('zh-CN').includes(keyword)
  ))
})
const pagedItems = computed(() => {
  const from = (page.value - 1) * pageSize.value
  return filteredItems.value.slice(from, from + pageSize.value)
})
const asyncState = computed<AsyncStateMode>(() => {
  if (loading.value) return 'loading'
  if (errorMessage.value && !hasLoaded.value) return 'error'
  if (!items.value.length) return 'empty'
  if (!filteredItems.value.length) return 'filtered-empty'
  return 'ready'
})

function resetForm() {
  editing.value = null
  form.name = ''
  form.slug = ''
  form.description = ''
  formMessage.value = ''
  slugEdited.value = false
}

function openEditor(item?: TaxonomyItem) {
  editing.value = item ?? null
  form.name = item?.name ?? ''
  form.slug = item?.slug ?? ''
  form.description = item?.description ?? ''
  formMessage.value = ''
  slugEdited.value = Boolean(item)
  drawerOpen.value = true
}

function suggestSlug() {
  if (!slugEdited.value) form.slug = toSlug(form.name)
}

async function refresh(kind = props.kind) {
  const sequence = ++requestSequence
  if (hasLoaded.value) refreshing.value = true
  else loading.value = true
  errorMessage.value = ''

  try {
    const nextItems = await listTaxonomy(kind)
    if (sequence === requestSequence && kind === props.kind) {
      items.value = nextItems
      hasLoaded.value = true
      const maxPage = Math.max(1, Math.ceil(filteredItems.value.length / pageSize.value))
      page.value = Math.min(page.value, maxPage)
    }
  } catch (error) {
    if (sequence === requestSequence) {
      errorMessage.value = error instanceof Error ? error.message : `${title.value}载入失败。`
    }
  } finally {
    if (sequence === requestSequence) {
      loading.value = false
      refreshing.value = false
    }
  }
}

watch(
  () => props.kind,
  (kind) => {
    items.value = []
    hasLoaded.value = false
    search.value = ''
    page.value = 1
    drawerOpen.value = false
    resetForm()
    void refresh(kind)
  },
  { immediate: true },
)

watch(search, () => { page.value = 1 })
watch(pageSize, () => { page.value = 1 })

async function submit() {
  if (saving.value) return
  const kind = props.kind
  const kindTitle = title.value
  formMessage.value = ''

  if (!form.name.trim()) {
    formMessage.value = `请输入${kindTitle}名称。`
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
    drawerOpen.value = false
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
  const impact = item.usage_count
    ? `当前有 ${item.usage_count} 篇文章使用它。`
    : '当前没有文章使用它。'
  const behavior = kind === 'categories'
    ? '删除后相关文章会变为未分类。'
    : '删除后相关文章会移除此标签。'

  try {
    await ElMessageBox.confirm(
      `${impact}${behavior}`,
      `删除${kindTitle}“${item.name}”？`,
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
    if (editing.value?.id === item.id) drawerOpen.value = false
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
    <AdminPage size="wide">
      <PageHeader :description :title="title" eyebrow="TAXONOMY">
        <template #actions>
          <button class="button button--primary" type="button" @click="openEditor()">
            <Plus :size="16" aria-hidden="true" />
            新建{{ title }}
          </button>
        </template>
      </PageHeader>

      <section class="taxonomy-workspace">
        <DataToolbar :result-label="`共 ${filteredItems.length} 个${title}`">
          <template #search>
            <ElInput v-model="search" clearable :placeholder="`搜索${title}名称或 Slug`">
              <template #prefix><Search :size="16" aria-hidden="true" /></template>
            </ElInput>
          </template>
          <template #actions>
            <ElButton
              :aria-label="refreshing ? `正在刷新${title}` : `刷新${title}`"
              :loading="refreshing"
              circle
              @click="refresh()"
            >
              <RefreshCw v-if="!refreshing" :size="16" aria-hidden="true" />
            </ElButton>
          </template>
        </DataToolbar>

        <ElAlert
          v-if="errorMessage && hasLoaded"
          :closable="false"
          show-icon
          :title="`刷新${title}失败，当前仍显示上一次的数据`"
          type="warning"
        >
          <template #default>{{ errorMessage }}</template>
        </ElAlert>

        <AsyncState
          :description="asyncState === 'empty' ? `创建第一个${title}，开始整理文章。` : undefined"
          :refreshing
          :state="asyncState"
          :title="asyncState === 'empty' ? `还没有${title}` : undefined"
          @clear-filters="search = ''"
          @retry="refresh()"
        >
          <template v-if="asyncState === 'empty'" #actions>
            <button class="button button--primary" type="button" @click="openEditor()">
              <Plus :size="16" aria-hidden="true" />
              新建{{ title }}
            </button>
          </template>

          <div class="taxonomy-collection">
            <ElTable :data="pagedItems" class="taxonomy-table" row-key="id">
              <ElTableColumn :label="title" min-width="220">
                <template #default="{ row }: { row: TaxonomyItem }">
                  <div class="taxonomy-name">
                    <strong>{{ row.name }}</strong>
                    <span>/{{ row.slug }}</span>
                  </div>
                </template>
              </ElTableColumn>
              <ElTableColumn v-if="props.kind === 'categories'" label="说明" min-width="260">
                <template #default="{ row }: { row: TaxonomyItem }">
                  <span class="taxonomy-description">{{ row.description || '暂无说明' }}</span>
                </template>
              </ElTableColumn>
              <ElTableColumn label="使用文章" width="100">
                <template #default="{ row }: { row: TaxonomyItem }">
                  <span class="usage-count">{{ row.usage_count }} 篇</span>
                </template>
              </ElTableColumn>
              <ElTableColumn align="right" label="操作" width="112">
                <template #default="{ row }: { row: TaxonomyItem }">
                  <ElButton :aria-label="`编辑${title}：${row.name}`" circle link @click="openEditor(row)">
                    <Pencil :size="16" aria-hidden="true" />
                  </ElButton>
                  <ElButton
                    :aria-label="`删除${title}：${row.name}`"
                    circle
                    link
                    :loading="deletingId === row.id"
                    type="danger"
                    @click="remove(row)"
                  >
                    <Trash2 v-if="deletingId !== row.id" :size="16" aria-hidden="true" />
                  </ElButton>
                </template>
              </ElTableColumn>
            </ElTable>

            <div class="taxonomy-mobile-list" role="list" :aria-label="`${title}列表`">
              <article v-for="item in pagedItems" :key="item.id" role="listitem">
                <div>
                  <strong>{{ item.name }}</strong>
                  <span>/{{ item.slug }}</span>
                  <p v-if="props.kind === 'categories'">{{ item.description || '暂无说明' }}</p>
                </div>
                <small>{{ item.usage_count }} 篇文章</small>
                <div class="taxonomy-mobile-actions">
                  <ElButton size="small" @click="openEditor(item)"><Pencil :size="14" />编辑</ElButton>
                  <ElButton :loading="deletingId === item.id" size="small" type="danger" plain @click="remove(item)">
                    <Trash2 v-if="deletingId !== item.id" :size="14" />删除
                  </ElButton>
                </div>
              </article>
            </div>
          </div>
        </AsyncState>

        <PaginationBar
          v-if="asyncState === 'ready' && filteredItems.length > pageSize"
          v-model:page="page"
          v-model:page-size="pageSize"
          :page-sizes="[15, 30, 50]"
          :total="filteredItems.length"
        />
      </section>
    </AdminPage>

    <ElDrawer
      v-model="drawerOpen"
      append-to-body
      destroy-on-close
      :title="`${editing ? '编辑' : '新建'}${title}`"
      size="min(28rem, 100vw)"
      @closed="resetForm"
    >
      <form class="taxonomy-form" @submit.prevent="submit">
        <p>名称用于后台和公开页面展示，Slug 用于稳定链接。</p>
        <div class="field">
          <label :for="nameInputId">名称</label>
          <input
            :id="nameInputId"
            v-model="form.name"
            class="input"
            maxlength="80"
            required
            @input="suggestSlug"
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
            @input="slugEdited = true"
          >
          <span class="hint">仅使用文字、数字和单个连字符。</span>
        </div>
        <div v-if="props.kind === 'categories'" class="field">
          <label :for="descriptionInputId">说明</label>
          <textarea
            :id="descriptionInputId"
            v-model="form.description"
            class="textarea"
            maxlength="500"
            rows="5"
          />
        </div>
        <p v-if="formMessage" class="form-message" role="alert">{{ formMessage }}</p>
        <div class="taxonomy-form__actions">
          <ElButton :disabled="saving" @click="drawerOpen = false">取消</ElButton>
          <ElButton :loading="saving" native-type="submit" type="primary">保存{{ title }}</ElButton>
        </div>
      </form>
    </ElDrawer>
  </AdminShell>
</template>

<style scoped>
.taxonomy-workspace {
  display: grid;
  gap: 0.9rem;
  padding-top: 1.25rem;
}

.taxonomy-collection {
  overflow: hidden;
  border: 1px solid var(--outline-ghost);
  border-radius: var(--radius-large);
  background: var(--surface-elevated);
}

.taxonomy-table {
  width: 100%;
  --el-table-bg-color: var(--surface-elevated);
  --el-table-header-bg-color: var(--surface-container);
  --el-table-tr-bg-color: var(--surface-elevated);
  --el-table-row-hover-bg-color: var(--surface-low);
}

.taxonomy-name {
  display: grid;
  gap: 0.1rem;
}

.taxonomy-name strong {
  font-size: 0.88rem;
}

.taxonomy-name span,
.taxonomy-description,
.usage-count {
  color: var(--on-surface-muted);
  font-size: 0.76rem;
}

.taxonomy-description {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.taxonomy-mobile-list {
  display: none;
}

.taxonomy-form {
  display: grid;
  gap: 1rem;
}

.taxonomy-form > p:first-child {
  margin: 0 0 0.25rem;
  color: var(--on-surface-muted);
  font-size: 0.82rem;
}

.form-message {
  margin: 0;
  color: var(--danger);
  font-size: 0.8rem;
}

.taxonomy-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.55rem;
  padding-top: 0.5rem;
}

@media (max-width: 680px) {
  .taxonomy-table {
    display: none;
  }

  .taxonomy-mobile-list {
    display: grid;
    padding: 0.45rem;
  }

  .taxonomy-mobile-list article {
    display: grid;
    gap: 0.55rem;
    padding: 0.9rem;
    border-radius: var(--radius-medium);
  }

  .taxonomy-mobile-list article:hover,
  .taxonomy-mobile-list article:focus-within {
    background: var(--surface-low);
  }

  .taxonomy-mobile-list article > div:first-child {
    display: grid;
    gap: 0.1rem;
  }

  .taxonomy-mobile-list span,
  .taxonomy-mobile-list p,
  .taxonomy-mobile-list small {
    color: var(--on-surface-muted);
    font-size: 0.75rem;
  }

  .taxonomy-mobile-list p {
    margin: 0.25rem 0 0;
  }

  .taxonomy-mobile-actions {
    display: flex;
    gap: 0.45rem;
  }
}
</style>
