export type RssPost = {
  id: string
  title: string
  summary: string
  publishedAt: string
}

type RssFeedOptions = {
  title: string
  description: string
  origin: string
  posts: RssPost[]
}

const xmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

export function escapeXml(value: string): string {
  return value
    // XML 1.0 explicitly forbids these control-code ranges in text nodes.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/[&<>"']/g, character => xmlEntities[character]!)
}

function formatRssDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid RSS publication date: ${value}`)

  return date.toUTCString()
}

function buildItem(post: RssPost, origin: string): string {
  const postUrl = new URL(`/posts/${encodeURIComponent(post.id)}`, `${origin}/`).toString()
  const escapedUrl = escapeXml(postUrl)

  return [
    '<item>',
    `<title>${escapeXml(post.title)}</title>`,
    `<link>${escapedUrl}</link>`,
    `<guid isPermaLink="true">${escapedUrl}</guid>`,
    `<description>${escapeXml(post.summary)}</description>`,
    `<pubDate>${formatRssDate(post.publishedAt)}</pubDate>`,
    '</item>',
  ].join('')
}

export function buildRssFeed(options: RssFeedOptions): string {
  const origin = new URL(options.origin).origin
  const feedUrl = new URL('/rss.xml', `${origin}/`).toString()
  const items = options.posts.map(post => buildItem(post, origin)).join('')
  const lastBuildDate = options.posts[0]
    ? `<lastBuildDate>${formatRssDate(options.posts[0].publishedAt)}</lastBuildDate>`
    : ''

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `<title>${escapeXml(options.title)}</title>`,
    `<link>${escapeXml(origin)}</link>`,
    `<description>${escapeXml(options.description)}</description>`,
    '<language>zh-CN</language>',
    `<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    lastBuildDate,
    items,
    '</channel>',
    '</rss>',
  ].join('')
}
