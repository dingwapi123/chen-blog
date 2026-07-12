import { createClient } from '@supabase/supabase-js'

function escapeXml(value: string) { return value.replace(/[<>&'\"]/g, (character) => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' })[character]!) }

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const origin = getRequestURL(event).origin
  setResponseHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  if (!config.public.supabaseUrl || !config.public.supabasePublishableKey) return '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Chen Blog</title></channel></rss>'
  const client = createClient(config.public.supabaseUrl, config.public.supabasePublishableKey, { auth: { persistSession:false, autoRefreshToken:false } })
  const { data, error } = await client.from('posts').select('title,slug,summary,content,published_at').order('published_at',{ascending:false}).limit(30)
  if (error) throw createError({ statusCode:502, statusMessage:error.message })
  const items = (data as Array<{title:string;slug:string;summary:string;content:string;published_at:string}>).map((post)=>`<item><title>${escapeXml(post.title)}</title><link>${origin}/posts/${post.slug}</link><guid>${origin}/posts/${post.slug}</guid><description>${escapeXml(post.summary)}</description><pubDate>${new Date(post.published_at).toUTCString()}</pubDate><content:encoded><![CDATA[${post.content}]]></content:encoded></item>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Chen Blog</title><link>${origin}</link><description>陈信至的个人技术博客。</description>${items}</channel></rss>`
})
