import { parse } from 'comark'
import { describe, expect, it } from 'vitest'
import {
  createArticleHeadingPlugin,
  extractArticleHeadings,
  slugifyArticleHeading,
} from './article-headings'

describe('article headings', () => {
  it('creates readable anchors for Chinese and English headings from h2 through h4', async () => {
    const headings = await extractArticleHeadings(`## 中文 标题

### Rendering on the Edge

#### API / URL

##### 不进入目录`)

    expect(headings).toEqual([
      { id: '中文-标题', text: '中文 标题', depth: 2 },
      { id: 'rendering-on-the-edge', text: 'Rendering on the Edge', depth: 3 },
      { id: 'api-url', text: 'API / URL', depth: 4 },
    ])
  })

  it('extracts visible text from inline formatting and links', async () => {
    const headings = await extractArticleHeadings(
      '## Build with **Nuxt UI** and [Comark](https://comark.dev)',
    )

    expect(headings).toEqual([{
      id: 'build-with-nuxt-ui-and-comark',
      text: 'Build with Nuxt UI and Comark',
      depth: 2,
    }])
  })

  it('deduplicates repeated headings and pre-existing suffix collisions in source order', async () => {
    const headings = await extractArticleHeadings(`## Repeat

## Repeat

### Repeat-2

#### Repeat`)

    expect(headings.map(heading => heading.id)).toEqual([
      'repeat',
      'repeat-2',
      'repeat-2-2',
      'repeat-3',
    ])
    expect(new Set(headings.map(heading => heading.id)).size).toBe(headings.length)
  })

  it('demotes body h1 headings and applies the same ids in the renderer plugin', async () => {
    const tree = await parse(`# 正文大标题

## 后续小节

##### 不应有锚点`, {
      html: false,
      plugins: [createArticleHeadingPlugin()],
    })

    expect(tree.nodes[0]).toEqual(['h2', { id: '正文大标题' }, '正文大标题'])
    expect(tree.nodes[1]).toEqual(['h2', { id: '后续小节' }, '后续小节'])
    expect(tree.nodes[2]).toEqual(['h5', {}, '不应有锚点'])
  })

  it('uses a stable fallback for headings without letters or numbers', () => {
    expect(slugifyArticleHeading('✨')).toBe('section')
  })
})
