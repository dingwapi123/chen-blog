import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listPublishedPosts } from './public-content'

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }))

vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }))

function httpError(statusCode: number, statusMessage: string) {
  return Object.assign(new Error(statusMessage), { statusCode, statusMessage })
}

describe('public content data source', () => {
  let runtimeConfig: {
    supabasePublishableKey: string
    public: { supabaseUrl: string }
  }

  beforeEach(() => {
    runtimeConfig = {
      supabasePublishableKey: 'publishable-key',
      public: { supabaseUrl: 'https://project.supabase.co' },
    }
    createClientMock.mockReset()
    vi.stubGlobal('useRuntimeConfig', vi.fn(() => runtimeConfig))
    vi.stubGlobal('createError', vi.fn(({ statusCode, statusMessage }) => httpError(statusCode, statusMessage)))
  })

  it.each([
    ['Supabase URL', () => { runtimeConfig.public.supabaseUrl = '' }],
    ['publishable key', () => { runtimeConfig.supabasePublishableKey = '' }],
  ])('fails closed when the %s is missing', async (_label, removeConfig) => {
    removeConfig()

    await expect(listPublishedPosts({} as never)).rejects.toMatchObject({ statusCode: 500 })
    expect(createClientMock).not.toHaveBeenCalled()
  })
})
