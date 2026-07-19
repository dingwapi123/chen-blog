import type { PublicPostPage } from '@chen-blog/shared-types'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const getRouterParam = vi.fn()
const getPublishedPostPage = vi.fn()

function httpError(statusCode: number, statusMessage: string) {
  return Object.assign(new Error(statusMessage), { statusCode, statusMessage })
}

let handler: (event: never) => Promise<unknown>

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (eventHandler: typeof handler) => eventHandler)
  vi.stubGlobal('getRouterParam', getRouterParam)
  vi.stubGlobal('getPublishedPostPage', getPublishedPostPage)
  vi.stubGlobal('createError', vi.fn(({ statusCode, statusMessage }) => httpError(statusCode, statusMessage)))
  handler = (await import('./[postId].get')).default
})

beforeEach(() => {
  getRouterParam.mockReset().mockReturnValue('dfe9ce73-3ed3-48d5-b9ed-663ce94f5973')
  getPublishedPostPage.mockReset()
})

describe('GET public post route', () => {
  it('rejects a missing UUID before querying public content', async () => {
    getRouterParam.mockReturnValue(undefined)

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 400 })
    expect(getPublishedPostPage).not.toHaveBeenCalled()
  })

  it('rejects a non-UUID route segment before querying public content', async () => {
    getRouterParam.mockReturnValue('published-post')

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 400 })
    expect(getPublishedPostPage).not.toHaveBeenCalled()
  })

  it('returns 404 when RLS-visible content has no matching article', async () => {
    getPublishedPostPage.mockResolvedValue(null)

    await expect(handler({} as never)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns the stable public DTO without exposing database rows', async () => {
    const page = {
      post: { id: 'post-id', title: '已发布文章' },
      navigation: { previous: null, next: null },
    } as PublicPostPage
    getPublishedPostPage.mockResolvedValue(page)

    await expect(handler({} as never)).resolves.toBe(page)
    expect(getPublishedPostPage).toHaveBeenCalledWith(expect.anything(), 'dfe9ce73-3ed3-48d5-b9ed-663ce94f5973')
  })
})
