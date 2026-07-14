import { describe, expect, it } from 'vitest'
import { buildRssFeed, escapeXml } from './rss'

const publishedAt = '2026-07-15T08:00:00.000Z'

function buildWith(overrides: Partial<Parameters<typeof buildRssFeed>[0]> = {}): string {
  return buildRssFeed({
    title: 'Chen & Blog',
    description: '构建 < 学习 > 记录',
    origin: 'https://blog.example.com/path',
    posts: [],
    ...overrides,
  })
}

describe('RSS XML helpers', () => {
  it('escapes XML text and attribute-sensitive characters', () => {
    expect(escapeXml('\u0000<a title="x">Tom & Jerry\'s</a>\u000B'))
      .toBe('&lt;a title=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;')

    const feed = buildWith()
    expect(feed).toContain('<title>Chen &amp; Blog</title>')
    expect(feed).toContain('<description>构建 &lt; 学习 &gt; 记录</description>')
  })

  it('encodes a slug as one URL path segment', () => {
    const feed = buildWith({
      posts: [{
        title: '安全 URL',
        slug: 'hello/world?x=1&y=2',
        summary: '摘要',
        publishedAt,
      }],
    })

    expect(feed).toContain('https://blog.example.com/posts/hello%2Fworld%3Fx%3D1%26y%3D2')
  })

  it('escapes summaries and never exposes raw article content', () => {
    const feed = buildWith({
      posts: [{
        title: '安全摘要',
        slug: 'safe-summary',
        summary: 'before]]><script>alert(1)</script>&after',
        publishedAt,
      }],
    })

    expect(feed).toContain('before]]&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;after')
    expect(feed).not.toContain('<script>')
    expect(feed).not.toContain('content:encoded')
  })

  it('normalizes the configured site URL to its origin', () => {
    const feed = buildWith()

    expect(feed).toContain('<link>https://blog.example.com</link>')
    expect(feed).toContain('href="https://blog.example.com/rss.xml"')
  })
})
