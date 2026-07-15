import type { Database } from '@chen-blog/database-types'
import type { MediaRecord } from '@chen-blog/shared-types'
import { createClient } from '@supabase/supabase-js'

/**
 * Capture the public Supabase client while the Nuxt setup context is active.
 * The returned resolver is safe to call later from lazy computed values during SSR.
 */
export function usePublicMediaUrl(): (media: MediaRecord) => string {
  const config = useRuntimeConfig()
  const client = config.public.supabaseUrl && config.public.supabasePublishableKey
    ? createClient<Database>(config.public.supabaseUrl, config.public.supabasePublishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null

  return (media) => {
    if (!client) return ''

    return client.storage.from(media.bucketId).getPublicUrl(media.objectPath).data.publicUrl
  }
}
