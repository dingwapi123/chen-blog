import assert from 'node:assert/strict'

const blogUrl = new URL(process.env.BLOG_URL ?? 'https://chen-blog-web.netlify.app')
const cmsUrl = new URL(process.env.CMS_URL ?? 'https://chen-blog-admin.netlify.app')

function resolve(base, path) {
  return new URL(path, base)
}

async function request(base, path, init = {}) {
  const response = await fetch(resolve(base, path), {
    redirect: 'manual',
    ...init,
  })
  const body = init.method === 'HEAD' ? '' : await response.text()
  return { response, body }
}

function assertStatus(result, expected, label) {
  assert.equal(result.response.status, expected, `${label}: expected ${expected}, got ${result.response.status}`)
}

function assertIncludes(value, expected, label) {
  assert.ok(value?.includes(expected), `${label}: missing ${JSON.stringify(expected)}`)
}

function assertStrictPublicCache(response, label) {
  assertIncludes(response.headers.get('cache-control'), 'max-age=0', `${label} browser cache`)
  const vary = response.headers.get('netlify-vary') ?? ''
  assertIncludes(vary, 'query', `${label} Netlify query variation`)
  assertIncludes(vary, 'cookie=chen-blog-theme', `${label} theme variation`)

  const cacheControlHeaders = [
    response.headers.get('cache-control'),
    response.headers.get('cdn-cache-control'),
    response.headers.get('netlify-cdn-cache-control'),
  ].filter(Boolean).join(',').toLowerCase()
  assert.ok(!cacheControlHeaders.includes('stale-while-revalidate'), `${label}: stale-while-revalidate is forbidden`)
  assert.ok(!cacheControlHeaders.includes('durable'), `${label}: durable cache is forbidden`)

  const age = response.headers.get('age')
  if (age !== null) {
    const ageSeconds = Number(age)
    assert.ok(Number.isFinite(ageSeconds) && ageSeconds >= 0 && ageSeconds <= 600, `${label}: invalid Age ${age}`)
  }
}

const publicPages = ['/', '/posts', '/archive', '/about', '/rss.xml', '/sitemap.xml', '/robots.txt']
for (const path of publicPages) {
  const result = await request(blogUrl, path)
  assertStatus(result, 200, `blog ${path}`)
  assertStrictPublicCache(result.response, `blog ${path}`)
}

const home = await request(blogUrl, '/')
assertIncludes(home.body, '陈信至', 'blog home')
assertIncludes(home.body, 'rel="canonical"', 'blog home canonical')

const rss = await request(blogUrl, '/rss.xml')
assertIncludes(rss.response.headers.get('content-type'), 'application/rss+xml', 'RSS content type')
assertIncludes(rss.body, '<rss', 'RSS body')
assert.ok(!rss.body.includes('content:encoded'), 'RSS must not contain full article bodies')

const sitemap = await request(blogUrl, '/sitemap.xml')
assertIncludes(sitemap.body, '<urlset', 'sitemap body')
assertIncludes(sitemap.body, '/posts/', 'sitemap article URLs')

const publicNotFound = await request(blogUrl, '/posts/production-verifier-not-found')
assertStatus(publicNotFound, 404, 'public HTML not found')
assertIncludes(publicNotFound.response.headers.get('content-type'), 'text/html', 'public 404 content type')

const themeProbe = `/?theme_verify=${Date.now()}`
const light = await request(blogUrl, themeProbe, { headers: { Cookie: 'chen-blog-theme=light' } })
const dark = await request(blogUrl, themeProbe, { headers: { Cookie: 'chen-blog-theme=dark' } })
assertStatus(light, 200, 'light theme response')
assertStatus(dark, 200, 'dark theme response')
assertStrictPublicCache(light.response, 'light theme response')
assertStrictPublicCache(dark.response, 'dark theme response')
assertIncludes(light.body, '>"light","system"', 'light SSR color-mode state')
assertIncludes(dark.body, '>"dark","system"', 'dark SSR color-mode state')
assert.notEqual(light.body, dark.body, 'light and dark SSR responses must not share one cache object')

const cmsHome = await request(cmsUrl, '/')
assertStatus(cmsHome, 200, 'CMS home')
assertIncludes(cmsHome.response.headers.get('x-robots-tag'), 'noindex', 'CMS X-Robots-Tag')
assertIncludes(cmsHome.response.headers.get('content-security-policy'), "frame-ancestors 'none'", 'CMS anti-framing CSP')
assert.equal(cmsHome.response.headers.get('x-frame-options'), 'DENY', 'CMS X-Frame-Options')
assertIncludes(cmsHome.body, 'noindex,nofollow,noarchive', 'CMS robots meta')

const cmsRobots = await request(cmsUrl, '/robots.txt')
assertStatus(cmsRobots, 200, 'CMS robots')
assertIncludes(cmsRobots.body, 'Disallow: /', 'CMS robots policy')

const cmsSpaRoute = await request(cmsUrl, '/posts')
assertStatus(cmsSpaRoute, 200, 'CMS SPA fallback')
assertIncludes(cmsSpaRoute.response.headers.get('x-robots-tag'), 'noindex', 'CMS SPA noindex')

const scriptSources = [...cmsHome.body.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1])
for (const source of scriptSources) {
  const script = await request(cmsUrl, source)
  assertStatus(script, 200, `CMS script ${source}`)
  assert.ok(!script.body.includes('sb_secret_'), `CMS script ${source} contains a Supabase secret key`)
  assert.ok(!script.body.includes('SUPABASE_SERVICE_ROLE_KEY'), `CMS script ${source} contains a server secret variable`)
}

const publishPath = '/api/admin/posts/00000000-0000-4000-8000-000000000000/publish'
const allowedPreflight = await request(blogUrl, publishPath, {
  method: 'OPTIONS',
  headers: {
    Origin: cmsUrl.origin,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,content-type',
  },
})
assertStatus(allowedPreflight, 204, 'allowed publish preflight')
assert.equal(allowedPreflight.response.headers.get('access-control-allow-origin'), cmsUrl.origin)
assertIncludes(allowedPreflight.response.headers.get('access-control-allow-methods'), 'POST', 'publish methods')
assertIncludes(allowedPreflight.response.headers.get('access-control-allow-headers')?.toLowerCase(), 'authorization', 'publish headers')
assertIncludes(allowedPreflight.response.headers.get('vary'), 'Origin', 'publish Vary')

const rejectedPreflight = await request(blogUrl, publishPath, {
  method: 'OPTIONS',
  headers: {
    Origin: 'https://evil.example',
    'Access-Control-Request-Method': 'POST',
  },
})
assertStatus(rejectedPreflight, 403, 'rejected publish preflight')

const unauthenticatedPublish = await request(blogUrl, publishPath, {
  method: 'POST',
  headers: {
    Origin: cmsUrl.origin,
    'Content-Type': 'application/json',
  },
  body: '{}',
})
assertStatus(unauthenticatedPublish, 401, 'unauthenticated publish')

console.log(`Production verification passed for ${blogUrl.origin} and ${cmsUrl.origin}.`)
