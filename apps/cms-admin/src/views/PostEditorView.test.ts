import type { PostDraftInput } from '@chen-blog/shared-types'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PostEditorView from '@/views/PostEditorView.vue'

const mocks = vi.hoisted(() => {
  class PostSavePartialError extends Error {
    readonly postId: string
    readonly tagSyncStage: 'clear-existing' | 'insert-selected'

    constructor(options: {
      postId: string
      tagSyncStage: 'clear-existing' | 'insert-selected'
      cause: unknown
    }) {
      super('文章主体已保存，但标签同步失败。请重新保存以重试标签同步。', {
        cause: options.cause,
      })
      this.name = 'PostSavePartialError'
      this.postId = options.postId
      this.tagSyncStage = options.tagSyncStage
    }
  }

  return {
    PostSavePartialError,
    route: {
      params: {} as Record<string, string>,
      query: { returnTo: '/posts?q=草稿' } as Record<string, string>,
    },
    routerReplace: vi.fn(),
    getPost: vi.fn(),
    listMedia: vi.fn(),
    listTaxonomy: vi.fn(),
    movePostToDraft: vi.fn(),
    publishPost: vi.fn(),
    savePost: vi.fn(),
    messageError: vi.fn(),
    messageSuccess: vi.fn(),
  }
})

vi.mock('element-plus', () => ({
  ElMessage: {
    error: mocks.messageError,
    success: mocks.messageSuccess,
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}))

vi.mock('vue-router', async () => {
  const { reactive } = await vi.importActual<typeof import('vue')>('vue')
  mocks.route = reactive(mocks.route)

  return {
    onBeforeRouteLeave: vi.fn(),
    onBeforeRouteUpdate: vi.fn(),
    useRoute: () => mocks.route,
    useRouter: () => ({ replace: mocks.routerReplace }),
  }
})

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ isOwner: { value: true } }),
}))

vi.mock('@/features/content/api', () => ({
  PostSavePartialError: mocks.PostSavePartialError,
  getPost: mocks.getPost,
  listMedia: mocks.listMedia,
  listTaxonomy: mocks.listTaxonomy,
  movePostToDraft: mocks.movePostToDraft,
  publishPost: mocks.publishPost,
  savePost: mocks.savePost,
}))

const draftInput: PostDraftInput = {
  title: '新草稿',
  slug: 'new-draft',
  summary: '',
  content: '# 正文',
  categoryId: null,
  coverMediaId: null,
  status: 'draft',
  tagIds: ['tag-1'],
}

const savedPost = {
  id: 'created-post-1',
  title: draftInput.title,
  slug: draftInput.slug,
  summary: draftInput.summary,
  content: draftInput.content,
  status: 'draft',
  category_id: null,
  cover_media_id: null,
  published_at: null,
  updated_at: '2026-07-16T00:00:00.000Z',
  deleted_at: null,
  post_tags: [],
}

const PostEditorFormStub = defineComponent({
  emits: ['dirty-change', 'publish', 'request-draft', 'save'],
  setup(_props, { emit }) {
    return () => h('div', [
      h('button', {
        class: 'test-save',
        onClick: () => emit('save', draftInput),
      }, '保存'),
      h('button', {
        class: 'test-publish',
        onClick: () => emit('publish', draftInput),
      }, '发布'),
    ])
  },
})

function mountEditor() {
  return shallowMount(PostEditorView, {
    global: {
      stubs: {
        AdminShell: { template: '<main><slot /></main>' },
        AdminPage: { template: '<div><slot /></div>' },
        AsyncState: true,
        PageHeader: { template: '<header><slot /><slot name="actions" /></header>' },
        PostEditorForm: PostEditorFormStub,
        RouterLink: { template: '<a><slot /></a>' },
        StatusBadge: true,
      },
    },
  })
}

describe('PostEditorView partial saves', () => {
  beforeEach(() => {
    mocks.route.params = {}
    mocks.route.query = { returnTo: '/posts?q=草稿' }
    mocks.routerReplace.mockImplementation(async (location: { params?: Record<string, string> }) => {
      mocks.route.params = location.params ?? {}
    })
    mocks.getPost.mockResolvedValue(savedPost)
    mocks.listMedia.mockResolvedValue([])
    mocks.listTaxonomy.mockResolvedValue([])
    mocks.movePostToDraft.mockResolvedValue(undefined)
    mocks.publishPost.mockResolvedValue(undefined)
  })

  it('moves a newly created row onto its edit route when tag synchronization fails', async () => {
    const partialError = new mocks.PostSavePartialError({
      postId: savedPost.id,
      tagSyncStage: 'clear-existing',
      cause: new Error('tag sync failed'),
    })
    mocks.savePost.mockRejectedValue(partialError)
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.get('.test-save').trigger('click')
    await flushPromises()

    expect(mocks.routerReplace).toHaveBeenCalledWith({
      name: 'post-editor',
      params: { postId: savedPost.id },
      query: { returnTo: '/posts?q=草稿' },
    })
    expect(mocks.messageError).toHaveBeenCalledWith(partialError.message)
    expect(mocks.messageSuccess).not.toHaveBeenCalled()
    expect(mocks.getPost).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('does not publish a partial save and explains that publishing was skipped', async () => {
    const partialError = new mocks.PostSavePartialError({
      postId: savedPost.id,
      tagSyncStage: 'insert-selected',
      cause: new Error('tag insert failed'),
    })
    mocks.savePost.mockRejectedValue(partialError)
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.get('.test-publish').trigger('click')
    await flushPromises()

    expect(mocks.publishPost).not.toHaveBeenCalled()
    expect(mocks.routerReplace).toHaveBeenCalledWith(expect.objectContaining({
      params: { postId: savedPost.id },
    }))
    expect(mocks.messageError).toHaveBeenCalledWith(
      `${partialError.message} 本次未执行发布。`,
    )
    expect(mocks.getPost).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('keeps the edit route for an existing post and still reports the partial save', async () => {
    mocks.route.params = { postId: savedPost.id }
    const partialError = new mocks.PostSavePartialError({
      postId: savedPost.id,
      tagSyncStage: 'clear-existing',
      cause: new Error('tag delete failed'),
    })
    mocks.savePost.mockRejectedValue(partialError)
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.get('.test-save').trigger('click')
    await flushPromises()

    expect(mocks.routerReplace).not.toHaveBeenCalled()
    expect(mocks.messageError).toHaveBeenCalledWith(partialError.message)
    expect(mocks.getPost).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('retries a new partial save with its recovered id and original selected tags', async () => {
    const partialError = new mocks.PostSavePartialError({
      postId: savedPost.id,
      tagSyncStage: 'insert-selected',
      cause: new Error('tag insert failed'),
    })
    mocks.savePost
      .mockRejectedValueOnce(partialError)
      .mockResolvedValueOnce(savedPost.id)
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.get('.test-save').trigger('click')
    await flushPromises()
    await wrapper.get('.test-save').trigger('click')
    await flushPromises()

    expect(mocks.savePost).toHaveBeenNthCalledWith(
      2,
      savedPost.id,
      draftInput,
    )
    expect(mocks.getPost).toHaveBeenCalledWith(savedPost.id)
    expect(mocks.messageSuccess).toHaveBeenCalledWith('草稿已保存。')
    wrapper.unmount()
  })
})
