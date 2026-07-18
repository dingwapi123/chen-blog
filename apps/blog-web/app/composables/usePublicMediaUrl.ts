import { getPostImagesPublicUrlPrefix } from '@chen-blog/content-rules'
import type { MediaRecord } from '@chen-blog/shared-types'

/**
 * Capture the public Supabase client while the Nuxt setup context is active.
 * The returned resolver is safe to call later from lazy computed values during SSR.
 */
export function usePublicMediaUrl(): (media: MediaRecord) => string {
  const config = useRuntimeConfig()
  const publicPrefix = config.public.supabaseUrl
    ? getPostImagesPublicUrlPrefix(config.public.supabaseUrl)
    : ''

  return (media) => {
    if (!publicPrefix || media.bucketId !== 'post-images') return ''

    const objectPath = media.objectPath
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/')
    return new URL(objectPath, publicPrefix).href
  }
}
