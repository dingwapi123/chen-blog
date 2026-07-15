import type { MediaRecord } from '@chen-blog/shared-types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePublicMediaUrl } from './usePublicMediaUrl'

const media: MediaRecord = {
  id: 'media-1',
  bucketId: 'post-images',
  objectPath: 'covers/editorial cover.png',
  altText: '文章封面',
  createdAt: '2026-07-16T00:00:00.000Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('usePublicMediaUrl', () => {
  it('captures runtime configuration before its resolver is evaluated lazily', () => {
    vi.stubGlobal('useRuntimeConfig', vi.fn(() => ({
      public: {
        supabaseUrl: 'https://example.supabase.co',
        supabasePublishableKey: 'sb_publishable_test',
      },
    })))

    const resolvePublicMediaUrl = usePublicMediaUrl()
    vi.stubGlobal('useRuntimeConfig', vi.fn(() => {
      throw new Error('Nuxt setup context is no longer available')
    }))

    expect(resolvePublicMediaUrl(media)).toBe(
      'https://example.supabase.co/storage/v1/object/public/post-images/covers/editorial%20cover.png',
    )
  })

  it('returns an empty URL when public Supabase configuration is unavailable', () => {
    vi.stubGlobal('useRuntimeConfig', vi.fn(() => ({
      public: {
        supabaseUrl: '',
        supabasePublishableKey: '',
      },
    })))

    expect(usePublicMediaUrl()(media)).toBe('')
  })
})
