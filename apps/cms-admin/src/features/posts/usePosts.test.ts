import type { PostListResult } from '@/features/content/api'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listPosts: vi.fn(),
}))

vi.mock('@/features/content/api', async importOriginal => ({
  ...await importOriginal<typeof import('@/features/content/api')>(),
  listPosts: mocks.listPosts,
}))

import { usePosts } from './usePosts'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function result(id: string, title: string): PostListResult {
  return {
    items: [{
      id,
      title,
      summary: '',
      status: 'draft',
      category_id: null,
      updated_at: '2026-07-16T00:00:00.000Z',
      published_at: null,
      deleted_at: null,
      category: null,
    }],
    total: 1,
    page: 1,
    pageSize: 20,
  }
}

function mountPosts() {
  let state!: ReturnType<typeof usePosts>
  const wrapper = mount(defineComponent({
    setup() {
      state = usePosts()
      return () => h('div')
    },
  }))
  return { state, wrapper }
}

describe('usePosts', () => {
  beforeEach(() => {
    mocks.listPosts.mockReset()
  })

  it('distinguishes the first load from a refresh and retains the current snapshot', async () => {
    const firstRequest = deferred<PostListResult>()
    const refreshRequest = deferred<PostListResult>()
    mocks.listPosts
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(refreshRequest.promise)

    const { state, wrapper } = mountPosts()
    expect(state.initialLoading.value).toBe(true)
    expect(state.refreshing.value).toBe(false)

    firstRequest.resolve(result('post-1', '第一篇'))
    await flushPromises()
    expect(state.posts.value[0]?.title).toBe('第一篇')
    expect(state.hasLoaded.value).toBe(true)

    const refreshing = state.refresh()
    expect(state.initialLoading.value).toBe(false)
    expect(state.refreshing.value).toBe(true)
    expect(state.posts.value[0]?.title).toBe('第一篇')

    refreshRequest.resolve(result('post-2', '更新后的文章'))
    await refreshing
    expect(state.refreshing.value).toBe(false)
    expect(state.posts.value[0]?.title).toBe('更新后的文章')
    wrapper.unmount()
  })

  it('ignores a slower response after a newer filter request has completed', async () => {
    const oldRequest = deferred<PostListResult>()
    const newRequest = deferred<PostListResult>()
    mocks.listPosts
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise)

    const { state, wrapper } = mountPosts()
    const latest = state.refresh({ search: '最新' })
    newRequest.resolve(result('new-post', '最新结果'))
    await latest

    oldRequest.resolve(result('old-post', '过期结果'))
    await flushPromises()

    expect(state.posts.value[0]?.id).toBe('new-post')
    expect(state.query.value.search).toBe('最新')
    wrapper.unmount()
  })

  it('keeps the previous snapshot when a refresh fails', async () => {
    mocks.listPosts
      .mockResolvedValueOnce(result('post-1', '已载入文章'))
      .mockRejectedValueOnce(new Error('网络暂时不可用'))

    const { state, wrapper } = mountPosts()
    await flushPromises()
    await state.refresh({ page: 2 })

    expect(state.posts.value[0]?.title).toBe('已载入文章')
    expect(state.errorMessage.value).toBe('网络暂时不可用')
    expect(state.refreshing.value).toBe(false)
    wrapper.unmount()
  })
})
