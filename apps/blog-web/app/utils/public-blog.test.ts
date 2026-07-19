import type { PublicPostPage } from '@chen-blog/shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchCategories,
  fetchPublishedPostPage,
  fetchPublishedPosts,
  fetchTags,
} from './public-blog'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
})

describe('public blog API client', () => {
  it('routes public collections through same-origin Nitro endpoints', async () => {
    fetchMock.mockResolvedValue([])

    await fetchPublishedPosts()
    await fetchCategories()
    await fetchTags()

    expect(fetchMock.mock.calls).toEqual([
      ['/api/public/posts'],
      ['/api/public/categories'],
      ['/api/public/tags'],
    ])
  })

  it('requests an article from its UUID-based Nitro endpoint', async () => {
    const page = { post: { title: '文章' }, navigation: {} } as PublicPostPage
    fetchMock.mockResolvedValue(page)

    await expect(fetchPublishedPostPage('dfe9ce73-3ed3-48d5-b9ed-663ce94f5973')).resolves.toBe(page)
    expect(fetchMock).toHaveBeenCalledWith('/api/public/posts/dfe9ce73-3ed3-48d5-b9ed-663ce94f5973')
  })

  it('maps a Nitro 404 to an absent public article', async () => {
    fetchMock.mockRejectedValue({ response: { status: 404 } })

    await expect(fetchPublishedPostPage('missing')).resolves.toBeNull()
  })

  it('preserves non-404 API failures for Nuxt error handling', async () => {
    const error = Object.assign(new Error('upstream unavailable'), { statusCode: 502 })
    fetchMock.mockRejectedValue(error)

    await expect(fetchPublishedPostPage('article')).rejects.toBe(error)
  })
})
