/**
 * The sitemap module fetches this internal source at render time. Its server
 * query uses the publishable key so RLS remains the public-content boundary.
 */
export default defineSitemapEventHandler(async (event) => {
  const staticUrls = [
    { loc: '/', changefreq: 'weekly' as const, priority: 1 as const },
    { loc: '/posts', changefreq: 'weekly' as const, priority: 0.9 as const },
    { loc: '/archive', changefreq: 'weekly' as const, priority: 0.7 as const },
    { loc: '/about', changefreq: 'monthly' as const, priority: 0.5 as const },
  ]

  const entries = await listPublicSitemapEntries(event)

  return [
    ...staticUrls,
    ...entries.posts.map(post => ({ loc: `/posts/${encodeURIComponent(post.slug)}`, lastmod: post.updatedAt, changefreq: 'monthly' as const, priority: 0.8 as const })),
    ...entries.categories.map(category => ({ loc: `/categories/${encodeURIComponent(category.slug)}`, lastmod: category.updatedAt, changefreq: 'weekly' as const, priority: 0.6 as const })),
    ...entries.tags.map(tag => ({ loc: `/tags/${encodeURIComponent(tag.slug)}`, lastmod: tag.updatedAt, changefreq: 'weekly' as const, priority: 0.5 as const })),
  ]
})
