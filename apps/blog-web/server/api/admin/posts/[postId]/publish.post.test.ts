import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const postId = '11111111-1111-4111-8111-111111111111'
const requireAllowedCmsOrigin = vi.fn()
const requireOwner = vi.fn()
const getServiceRoleClient = vi.fn()
const readMaybeSingle = vi.fn()
const updatePost = vi.fn()
const updateEq = vi.fn()
const getRouterParam = vi.fn()

function httpError(statusCode: number, statusMessage: string) {
  return Object.assign(new Error(statusMessage), { statusCode, statusMessage })
}

function createReadQuery() {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle: readMaybeSingle })),
    })),
  }
}

function createPublishServiceClient(updateResult: unknown) {
  const updateMaybeSingle = vi.fn().mockResolvedValue(updateResult)
  const updateSelect = vi.fn(() => ({ maybeSingle: updateMaybeSingle }))
  const updateIs = vi.fn(() => ({ select: updateSelect }))
  updateEq.mockImplementation(() => ({ eq: updateEq, is: updateIs }))
  updatePost.mockImplementation(() => ({ eq: updateEq }))
  const from = vi.fn()
    .mockReturnValueOnce(createReadQuery())
    .mockReturnValueOnce({ update: updatePost })

  return { from, updateIs }
}

let publishHandler: (event: never) => Promise<unknown>

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: typeof publishHandler) => handler)
  vi.stubGlobal('requireAllowedCmsOrigin', requireAllowedCmsOrigin)
  vi.stubGlobal('requireOwner', requireOwner)
  vi.stubGlobal('getRouterParam', getRouterParam)
  vi.stubGlobal('getServiceRoleClient', getServiceRoleClient)
  vi.stubGlobal('useRuntimeConfig', vi.fn(() => ({
    public: { supabaseUrl: 'https://project.supabase.co' },
  })))
  vi.stubGlobal('createError', vi.fn(({ statusCode, statusMessage }) => httpError(statusCode, statusMessage)))
  publishHandler = (await import('./publish.post')).default
})

describe('POST publish route', () => {
  beforeEach(() => {
    requireAllowedCmsOrigin.mockReset()
    requireOwner.mockReset().mockResolvedValue({ id: 'owner-id' })
    readMaybeSingle.mockReset()
    updatePost.mockReset()
    updateEq.mockReset()
    getRouterParam.mockReset().mockReturnValue(postId)
    getServiceRoleClient.mockReset().mockReturnValue({
      from: vi.fn(() => createReadQuery()),
    })
  })

  it.each([
    [{ title: '   ', content: '# 正文' }, '文章标题'],
    [{ title: '标题', content: '\n\t' }, '文章正文'],
  ])('rejects invalid stored publication fields before updating: %o', async (fields, message) => {
    const from = vi.fn((table: string) => {
      expect(table).toBe('posts')
      return createReadQuery()
    })
    getServiceRoleClient.mockReturnValue({ from })
    readMaybeSingle.mockResolvedValue({
      data: { ...fields, status: 'draft', deleted_at: null },
      error: null,
    })

    await expect(publishHandler({} as never)).rejects.toMatchObject({ statusCode: 422, statusMessage: expect.stringContaining(message) })
    expect(from).toHaveBeenCalledTimes(1)
    expect(updatePost).not.toHaveBeenCalled()
  })

  it('checks the exact CMS origin and owner before opening the service client', async () => {
    requireOwner.mockRejectedValue(httpError(403, 'Owner access is required.'))

    await expect(publishHandler({} as never)).rejects.toMatchObject({ statusCode: 403 })
    expect(requireAllowedCmsOrigin).toHaveBeenCalledOnce()
    expect(requireOwner).toHaveBeenCalledOnce()
    expect(getServiceRoleClient).not.toHaveBeenCalled()
  })

  it('rejects malformed post IDs before querying PostgREST', async () => {
    getRouterParam.mockReturnValue('not-a-uuid')

    await expect(publishHandler({} as never)).rejects.toMatchObject({ statusCode: 400 })
    expect(requireAllowedCmsOrigin).toHaveBeenCalledOnce()
    expect(requireOwner).toHaveBeenCalledOnce()
    expect(getServiceRoleClient).not.toHaveBeenCalled()
  })

  it('publishes only the exact draft version that passed validation', async () => {
    const updatedAt = '2026-07-16T00:00:00.000000+00:00'
    const publishedAt = '2026-07-16T00:01:00.000000+00:00'
    readMaybeSingle.mockResolvedValue({
      data: {
        title: '可发布文章',
        content: '# 正文',
        status: 'draft',
        updated_at: updatedAt,
        deleted_at: null,
      },
      error: null,
    })
    const serviceClient = createPublishServiceClient({
      data: { id: postId, status: 'published', published_at: publishedAt },
      error: null,
    })
    getServiceRoleClient.mockReturnValue(serviceClient)

    await expect(publishHandler({} as never)).resolves.toEqual({
      id: postId,
      status: 'published',
      publishedAt,
    })
    expect(updatePost).toHaveBeenCalledWith({ status: 'published', deleted_at: null })
    expect(updateEq).toHaveBeenNthCalledWith(1, 'id', postId)
    expect(updateEq).toHaveBeenNthCalledWith(2, 'status', 'draft')
    expect(updateEq).toHaveBeenNthCalledWith(3, 'updated_at', updatedAt)
    expect(serviceClient.updateIs).toHaveBeenCalledWith('deleted_at', null)
  })

  it('returns a conflict instead of publishing when the draft changes after validation', async () => {
    readMaybeSingle.mockResolvedValue({
      data: {
        title: '可发布文章',
        content: '# 正文',
        status: 'draft',
        updated_at: '2026-07-16T00:00:00.000000+00:00',
        deleted_at: null,
      },
      error: null,
    })
    getServiceRoleClient.mockReturnValue(createPublishServiceClient({ data: null, error: null }))

    await expect(publishHandler({} as never)).rejects.toMatchObject({ statusCode: 409 })
  })
})
