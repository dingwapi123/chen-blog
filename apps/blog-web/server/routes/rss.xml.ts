import { site } from '~~/app/config/site'
import { buildRssFeed } from '../utils/rss'
import { resolveSiteOrigin } from '../utils/site-origin'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const origin = resolveSiteOrigin(config.public.siteUrl, getRequestURL(event).origin)
  const posts = await listPublicRssPosts(event)

  setResponseHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')

  return buildRssFeed({
    title: site.title,
    description: site.description,
    origin,
    posts,
  })
})
