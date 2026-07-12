import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event); const origin = getRequestURL(event).origin; setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  const staticUrls = ['/', '/about', '/posts']
  if (!config.public.supabaseUrl || !config.public.supabasePublishableKey) return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls.map((path)=>`<url><loc>${origin}${path}</loc></url>`).join('')}</urlset>`
  const client = createClient(config.public.supabaseUrl, config.public.supabasePublishableKey, { auth: { persistSession:false, autoRefreshToken:false } })
  const [{data:posts},{data:categories},{data:tags}] = await Promise.all([client.from('posts').select('slug,updated_at'),client.from('categories').select('slug,updated_at'),client.from('tags').select('slug,updated_at')])
  const urls = [...staticUrls.map((path)=>({path,updatedAt:null})),...((posts??[]) as Array<{slug:string;updated_at:string}>).map((item)=>({path:`/posts/${item.slug}`,updatedAt:item.updated_at})),...((categories??[]) as Array<{slug:string;updated_at:string}>).map((item)=>({path:`/categories/${item.slug}`,updatedAt:item.updated_at})),...((tags??[]) as Array<{slug:string;updated_at:string}>).map((item)=>({path:`/tags/${item.slug}`,updatedAt:item.updated_at}))]
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(({path,updatedAt})=>`<url><loc>${origin}${path}</loc>${updatedAt?`<lastmod>${new Date(updatedAt).toISOString()}</lastmod>`:''}</url>`).join('')}</urlset>`
})
