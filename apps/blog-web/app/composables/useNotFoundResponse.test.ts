import { afterEach, describe, expect, it, vi } from 'vitest'
import { useNotFoundResponse } from './useNotFoundResponse'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useNotFoundResponse', () => {
  it('sets an explicit 404 status without throwing an error response', () => {
    const event = { path: '/posts/missing' }
    const setResponseStatus = vi.fn()

    vi.stubGlobal('useRequestEvent', () => event)
    vi.stubGlobal('setResponseStatus', setResponseStatus)

    expect(() => useNotFoundResponse(true, '文章不存在。')).not.toThrow()
    expect(setResponseStatus).toHaveBeenCalledOnce()
    expect(setResponseStatus).toHaveBeenCalledWith(event, 404, '文章不存在。')
  })

  it('leaves successful and client-side responses unchanged', () => {
    const setResponseStatus = vi.fn()

    vi.stubGlobal('useRequestEvent', () => undefined)
    vi.stubGlobal('setResponseStatus', setResponseStatus)

    useNotFoundResponse(true)
    expect(setResponseStatus).not.toHaveBeenCalled()

    vi.stubGlobal('useRequestEvent', () => ({ path: '/posts/published' }))
    useNotFoundResponse(false)
    expect(setResponseStatus).not.toHaveBeenCalled()
  })
})
