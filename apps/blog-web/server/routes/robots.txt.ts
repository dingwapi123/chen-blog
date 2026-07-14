import { resolveSiteOrigin } from '../utils/site-origin'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const origin = resolveSiteOrigin(config.public.siteUrl, getRequestURL(event).origin)

  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')

  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${new URL('/sitemap.xml', `${origin}/`).toString()}`,
    '',
  ].join('\n')
})
