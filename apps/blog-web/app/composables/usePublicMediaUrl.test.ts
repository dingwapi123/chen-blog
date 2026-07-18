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
      },
    })))

    expect(usePublicMediaUrl()(media)).toBe('')
  })

  it('does not create a URL for a bucket outside the public article library', () => {
    vi.stubGlobal('useRuntimeConfig', vi.fn(() => ({
      public: { supabaseUrl: 'https://example.supabase.co' },
    })))

    expect(usePublicMediaUrl()({ ...media, bucketId: 'private-images' })).toBe('')
  })
})
