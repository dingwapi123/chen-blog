import type { Database } from '@chen-blog/database-types'
import { createClient } from '@supabase/supabase-js'
import { site } from '~~/app/config/site'
import { buildRssFeed, type RssPost } from '../utils/rss'
import { resolveSiteOrigin } from '../utils/site-origin'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const origin = resolveSiteOrigin(config.public.siteUrl, getRequestURL(event).origin)
  let posts: RssPost[] = []

  setResponseHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')

  if (config.public.supabaseUrl && config.public.supabasePublishableKey) {
    const client = createClient<Database>(
      config.public.supabaseUrl,
      config.public.supabasePublishableKey,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const { data, error } = await client
      .from('posts')
      .select('id,title,slug,summary,published_at')
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(30)

    if (error) throw createError({ statusCode: 502, statusMessage: error.message })

    posts = data.flatMap((post) => post.published_at
      ? [{
          title: post.title,
          slug: post.slug,
          summary: post.summary,
          publishedAt: post.published_at,
        }]
      : [])
  }

  return buildRssFeed({
    title: site.title,
    description: site.description,
    origin,
    posts,
  })
})
