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
  const browserCache = response.headers.get('cache-control')?.toLowerCase() ?? ''
  assert.ok(
    browserCache.includes('max-age=0') || browserCache.includes('no-cache') || browserCache.includes('no-store'),
    `${label} browser cache must revalidate or bypass storage`,
  )
  const vary = response.headers.get('netlify-vary') ?? ''
  assertIncludes(vary, 'query', `${label} Netlify query variation`)
  assertIncludes(vary, 'cookie=chen-blog-theme', `${label} theme variation`)

  // Netlify consumes and strips its CDN-only control header before the browser.
  // Validate it when an intermediary preserves it; the runtime proof below is
  // the repeated Edge hit plus a bounded Age value.
  const edgeCache = response.headers.get('netlify-cdn-cache-control')?.toLowerCase()
  if (edgeCache) {
    assertIncludes(edgeCache, 'public', `${label} Netlify public cache policy`)
    assertIncludes(edgeCache, 'max-age=600', `${label} Netlify 600-second cache policy`)
    assertIncludes(edgeCache, 'must-revalidate', `${label} Netlify synchronous revalidation policy`)
  }

  const cacheControlHeaders = [
    response.headers.get('cache-control'),
    response.headers.get('cdn-cache-control'),
    response.headers.get('netlify-cdn-cache-control'),
  ].filter(Boolean).join(',').toLowerCase()
  assert.ok(!cacheControlHeaders.includes('stale-while-revalidate'), `${label}: stale-while-revalidate is forbidden`)
  assert.ok(!cacheControlHeaders.includes('durable'), `${label}: durable cache is forbidden`)

  const age = response.headers.get('age')
  if (age !== null) assertCacheAge(age, label)
}

function assertCacheAge(age, label) {
  const ageSeconds = Number(age)
  assert.ok(Number.isFinite(ageSeconds) && ageSeconds >= 0 && ageSeconds <= 600, `${label}: invalid Age ${age}`)
}

function assertNoBrowserSecret(source, label) {
  assert.ok(!source.includes('sb_secret_'), `${label} contains a Supabase secret key`)
  assert.ok(!source.includes('SUPABASE_SERVICE_ROLE_KEY'), `${label} contains a server secret variable`)
}

function assertEdgeHit(response, label) {
  assertIncludes(response.headers.get('cache-status'), '"Netlify Edge"; hit', `${label} Edge cache hit`)
  const age = response.headers.get('age')
  assert.notEqual(age, null, `${label} must include Age`)
  assertCacheAge(age, label)
}

function assertCmsSecurityHeaders(response, label) {
  assertIncludes(response.headers.get('x-robots-tag'), 'noindex', `${label} X-Robots-Tag`)
  assertIncludes(response.headers.get('content-security-policy'), "frame-ancestors 'none'", `${label} anti-framing CSP`)
  assert.equal(response.headers.get('x-frame-options'), 'DENY', `${label} X-Frame-Options`)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', `${label} X-Content-Type-Options`)
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', `${label} Referrer-Policy`)
}

function assertIndexableSeo(body, url, label) {
  assertIncludes(body, '<title>', `${label} title`)
  assertIncludes(body, '<meta name="description"', `${label} description`)
  assertIncludes(body, '<meta name="robots" content="index, follow">', `${label} robots`)
  assertIncludes(body, `<link rel="canonical" href="${url}"`, `${label} canonical`)
  assertIncludes(body, `<meta property="og:url" content="${url}">`, `${label} Open Graph URL`)
  assertIncludes(body, '<meta property="og:title"', `${label} Open Graph title`)
  assertIncludes(body, '<link rel="alternate" type="application/rss+xml"', `${label} RSS alternate`)
  assert.ok((body.match(/name="theme-color"/g) ?? []).length >= 2, `${label} must expose both theme colors`)
}

async function scanBrowserScripts(base, initialSources, label) {
  const queue = initialSources.map(source => resolve(base, source).toString())
  const assetRoots = new Set(queue.map(source => `${new URL(source).pathname.slice(0, new URL(source).pathname.lastIndexOf('/') + 1)}`))
  const seen = new Set()

  while (queue.length) {
    const scriptUrl = queue.shift()
    if (!scriptUrl || seen.has(scriptUrl)) continue
    seen.add(scriptUrl)
    assert.ok(seen.size <= 250, `${label} browser script graph is unexpectedly large`)

    const script = await request(base, scriptUrl)
    assertStatus(script, 200, `${label} script ${scriptUrl}`)
    assertNoBrowserSecret(script.body, `${label} script ${scriptUrl}`)

    for (const match of script.body.matchAll(/["']([^"']+\.js(?:\?[^"']*)?)["']/g)) {
      const dependency = new URL(match[1], scriptUrl)
      const fileName = dependency.pathname.slice(dependency.pathname.lastIndexOf('/') + 1)
      const isHashedBuildChunk = /^[A-Za-z0-9_-]{8,}\.js$/.test(fileName)
      const isInBuildDirectory = [...assetRoots].some(root => dependency.pathname.startsWith(root))
      if (
        dependency.origin === base.origin
        && isHashedBuildChunk
        && isInBuildDirectory
        && !seen.has(dependency.toString())
      ) {
        queue.push(dependency.toString())
      }
    }
  }

  assert.ok(seen.size > 0, `${label} must expose at least one browser script`)
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

const sitemapUrls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])
assert.ok(sitemapUrls.length > 0, 'sitemap must contain public URLs')
const verifiedArticles = []
for (const url of sitemapUrls) {
  const page = await request(blogUrl, url)
  const pathname = new URL(url).pathname
  assertStatus(page, 200, `sitemap page ${pathname}`)
  assertStrictPublicCache(page.response, `sitemap page ${pathname}`)
  assertIndexableSeo(page.body, url, `sitemap page ${pathname}`)
  if (/^\/posts\/[^/]+$/.test(pathname)) {
    assertIncludes(page.body, '<meta property="og:type" content="article">', `${pathname} article Open Graph type`)
    assertIncludes(page.body, '<meta property="article:published_time"', `${pathname} publication time`)
    assertIncludes(page.body, '<meta property="article:modified_time"', `${pathname} modification time`)
    verifiedArticles.push({ pathname, ...page })
  }
}

const richArticle = verifiedArticles.find(({ body }) => (
  body.includes('class="article-cover__image"')
  && body.includes('class="article-toc"')
  && (body.match(/<img\b[^>]*data-nuxt-img[^>]*>/g) ?? []).length >= 2
))
assert.ok(richArticle, 'at least one public article must exercise a cover, a table of contents, and a Markdown image')

const richArticleImages = richArticle.body.match(/<img\b[^>]*data-nuxt-img[^>]*>/g) ?? []
assert.ok(richArticleImages.every(tag => /\balt="[^"]+"/.test(tag)), `${richArticle.pathname} optimized images need alt text`)
assert.ok(richArticleImages.every(tag => /\bsrcset="[^"]+"/.test(tag)), `${richArticle.pathname} optimized images need srcset`)

const richArticleHeadingIds = [...richArticle.body.matchAll(/<h[23]\b[^>]*\bid="([^"]+)"/g)].map(match => match[1])
assert.ok(richArticleHeadingIds.length >= 3, `${richArticle.pathname} must expose a meaningful heading hierarchy`)
assert.equal(new Set(richArticleHeadingIds).size, richArticleHeadingIds.length, `${richArticle.pathname} heading IDs must be unique`)

const coverTag = richArticleImages.find(tag => tag.includes('class="article-cover__image"'))
const optimizedCoverPath = coverTag?.match(/\bsrc="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&')
assert.ok(optimizedCoverPath?.startsWith('/_ipx/'), `${richArticle.pathname} cover must use the Nuxt image endpoint`)
const optimizedCover = await request(blogUrl, optimizedCoverPath)
assertStatus(optimizedCover, 200, `${richArticle.pathname} optimized cover`)
assertIncludes(optimizedCover.response.headers.get('content-type'), 'image/', `${richArticle.pathname} optimized cover content type`)

const publicNotFound = await request(blogUrl, '/posts/production-verifier-not-found')
assertStatus(publicNotFound, 404, 'public HTML not found')
assertIncludes(publicNotFound.response.headers.get('content-type'), 'text/html', 'public 404 content type')
assertIncludes(publicNotFound.body, '<meta name="robots" content="noindex, nofollow">', 'public 404 robots')
assert.ok(!publicNotFound.body.includes('rel="canonical"'), 'public 404 must not expose a canonical URL')

for (const path of ['/categories/production-verifier-not-found', '/tags/production-verifier-not-found', '/production-verifier-not-found']) {
  const notFound = await request(blogUrl, path)
  assertStatus(notFound, 404, `public not found ${path}`)
  assertIncludes(notFound.body, '<meta name="robots" content="noindex, nofollow">', `${path} robots`)
  assert.ok(!notFound.body.includes('rel="canonical"'), `${path} must not expose a canonical URL`)
}

const themeProbe = `/?theme_verify=${Date.now()}`
const light = await request(blogUrl, themeProbe, { headers: { Cookie: 'chen-blog-theme=light' } })
const dark = await request(blogUrl, themeProbe, { headers: { Cookie: 'chen-blog-theme=dark' } })
const lightHit = await request(blogUrl, themeProbe, { headers: { Cookie: 'chen-blog-theme=light' } })
const darkHit = await request(blogUrl, themeProbe, { headers: { Cookie: 'chen-blog-theme=dark' } })
assertStatus(light, 200, 'light theme response')
assertStatus(dark, 200, 'dark theme response')
assertStrictPublicCache(light.response, 'light theme response')
assertStrictPublicCache(dark.response, 'dark theme response')
assertIncludes(light.body, '},"light","system"', 'light SSR color-mode state')
assertIncludes(dark.body, '},"dark","system"', 'dark SSR color-mode state')
assert.notEqual(light.body, dark.body, 'light and dark SSR responses must not share one cache object')
assertEdgeHit(lightHit.response, 'light theme response')
assertEdgeHit(darkHit.response, 'dark theme response')
assertIncludes(lightHit.body, '},"light","system"', 'cached light SSR color-mode state')
assertIncludes(darkHit.body, '},"dark","system"', 'cached dark SSR color-mode state')

const cacheProbe = `/?cache_verify=${Date.now()}-${crypto.randomUUID()}`
const cacheWarmup = await request(blogUrl, cacheProbe)
const cacheHit = await request(blogUrl, cacheProbe)
assertStatus(cacheWarmup, 200, 'CDN cache warmup')
assertStatus(cacheHit, 200, 'CDN cache hit')
assertStrictPublicCache(cacheWarmup.response, 'CDN cache warmup')
assertStrictPublicCache(cacheHit.response, 'CDN cache hit')
const warmupCacheStatus = cacheWarmup.response.headers.get('cache-status') ?? ''
if (warmupCacheStatus.includes('Netlify Durable')) {
  assertIncludes(warmupCacheStatus, '"Netlify Durable"; fwd=bypass', 'Netlify Durable bypass')
}
assertEdgeHit(cacheHit.response, 'CDN cache hit')

assertNoBrowserSecret(home.body, 'blog HTML')
const blogScriptSources = [...home.body.matchAll(/(?:src|href)="([^"]+\.js(?:\?[^"]*)?)"/g)]
  .map(match => match[1])
  .filter((source, index, sources) => sources.indexOf(source) === index)
await scanBrowserScripts(blogUrl, blogScriptSources, 'blog')

const cmsHome = await request(cmsUrl, '/')
assertStatus(cmsHome, 200, 'CMS home')
assertCmsSecurityHeaders(cmsHome.response, 'CMS home')
assertIncludes(cmsHome.body, 'noindex,nofollow,noarchive', 'CMS robots meta')

for (const path of ['/login', '/posts', '/posts/new', '/categories', '/tags', '/media', '/account']) {
  const page = await request(cmsUrl, path)
  assertStatus(page, 200, `CMS SPA ${path}`)
  assertCmsSecurityHeaders(page.response, `CMS SPA ${path}`)
}

const cmsRobots = await request(cmsUrl, '/robots.txt')
assertStatus(cmsRobots, 200, 'CMS robots')
assertIncludes(cmsRobots.body, 'Disallow: /', 'CMS robots policy')

const cmsSpaRoute = await request(cmsUrl, '/posts')
assertStatus(cmsSpaRoute, 200, 'CMS SPA fallback')
assertIncludes(cmsSpaRoute.response.headers.get('x-robots-tag'), 'noindex', 'CMS SPA noindex')

assertNoBrowserSecret(cmsHome.body, 'CMS HTML')
const scriptSources = [...cmsHome.body.matchAll(/(?:src|href)="([^"]+\.js(?:\?[^"]*)?)"/g)]
  .map(match => match[1])
  .filter((source, index, sources) => sources.indexOf(source) === index)
await scanBrowserScripts(cmsUrl, scriptSources, 'CMS')

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
assert.equal(allowedPreflight.response.headers.get('access-control-allow-methods'), 'POST, OPTIONS', 'publish methods')
assert.equal(allowedPreflight.response.headers.get('access-control-allow-headers'), 'Authorization, Content-Type', 'publish headers')
assert.equal(allowedPreflight.response.headers.get('access-control-max-age'), '600', 'publish preflight max age')
assertIncludes(allowedPreflight.response.headers.get('vary'), 'Origin', 'publish Vary')

const rejectedPreflight = await request(blogUrl, publishPath, {
  method: 'OPTIONS',
  headers: {
    Origin: 'https://evil.example',
    'Access-Control-Request-Method': 'POST',
  },
})
assertStatus(rejectedPreflight, 403, 'rejected publish preflight')
assert.equal(rejectedPreflight.response.headers.get('access-control-allow-origin'), null, 'rejected preflight ACAO')

const rejectedPublish = await request(blogUrl, publishPath, {
  method: 'POST',
  headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
  body: '{}',
})
assertStatus(rejectedPublish, 403, 'rejected publish origin')
assert.equal(rejectedPublish.response.headers.get('access-control-allow-origin'), null, 'rejected publish ACAO')

const missingOriginPublish = await request(blogUrl, publishPath, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
})
assertStatus(missingOriginPublish, 403, 'missing publish origin')

const unauthenticatedPublish = await request(blogUrl, publishPath, {
  method: 'POST',
  headers: {
    Origin: cmsUrl.origin,
    'Content-Type': 'application/json',
  },
  body: '{}',
})
assertStatus(unauthenticatedPublish, 401, 'unauthenticated publish')
assertIncludes(unauthenticatedPublish.response.headers.get('cache-control'), 'no-cache', 'publish API cache policy')
assert.equal(home.response.headers.get('access-control-allow-origin'), null, 'public pages must not enable global CORS')

console.log(`Production verification passed for ${blogUrl.origin} and ${cmsUrl.origin}.`)
