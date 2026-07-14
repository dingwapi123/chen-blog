import type { Database } from '@chen-blog/database-types'
import { createClient } from '@supabase/supabase-js'

/**
 * The sitemap module fetches this internal source at render time. The
 * publishable key is intentional: RLS must keep draft and deleted content out.
 */
export default defineSitemapEventHandler(async () => {
  const config = useRuntimeConfig()
  const staticUrls = [
    { loc: '/', changefreq: 'weekly' as const, priority: 1 as const },
    { loc: '/posts', changefreq: 'weekly' as const, priority: 0.9 as const },
    { loc: '/archive', changefreq: 'weekly' as const, priority: 0.7 as const },
    { loc: '/about', changefreq: 'monthly' as const, priority: 0.5 as const },
  ]

  if (!config.public.supabaseUrl || !config.public.supabasePublishableKey) return staticUrls

  const client = createClient<Database>(config.public.supabaseUrl, config.public.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const [postsResult, categoriesResult, tagsResult] = await Promise.all([
    client.from('posts').select('id,slug,updated_at').order('published_at', { ascending: false }).order('id', { ascending: false }),
    client.from('categories').select('slug,updated_at').order('name'),
    client.from('tags').select('slug,updated_at').order('name'),
  ])

  const error = postsResult.error ?? categoriesResult.error ?? tagsResult.error
  if (error) throw createError({ statusCode: 502, statusMessage: error.message })

  return [
    ...staticUrls,
    ...(postsResult.data ?? []).map((post) => ({ loc: `/posts/${encodeURIComponent(post.slug)}`, lastmod: post.updated_at, changefreq: 'monthly' as const, priority: 0.8 as const })),
    ...(categoriesResult.data ?? []).map((category) => ({ loc: `/categories/${encodeURIComponent(category.slug)}`, lastmod: category.updated_at, changefreq: 'weekly' as const, priority: 0.6 as const })),
    ...(tagsResult.data ?? []).map((tag) => ({ loc: `/tags/${encodeURIComponent(tag.slug)}`, lastmod: tag.updated_at, changefreq: 'weekly' as const, priority: 0.5 as const })),
  ]
})
