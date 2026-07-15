import { parse } from 'comark'
import { describe, expect, it } from 'vitest'
import {
  assertAllowedContent,
  assertPublishablePostFields,
  createContentSecurityPlugins,
  getPostImagesPublicUrlPrefix,
  isValidPostSlug,
  validateContentSource,
  validatePublishablePostFields,
} from './index'

const imagePrefix = getPostImagesPublicUrlPrefix('https://project.supabase.co')
const validationOptions = { allowedImagePrefixes: [imagePrefix] }

function collectElementTags(nodes: Awaited<ReturnType<typeof parse>>['nodes']): string[] {
  const tags: string[] = []
  for (const node of nodes) {
    if (typeof node === 'string' || node[0] === null) continue
    tags.push(node[0])
    tags.push(...collectElementTags(node.slice(2)))
  }
  return tags
}

describe('validateContentSource', () => {
  it('accepts ordinary Markdown, autolinks, inline code and Storage images', async () => {
    const content = `# 安全的文章

普通 [链接](https://example.com)、<https://example.com> 和 \`<div>\`。

![图片](${imagePrefix}posts/example.webp)

| 左 | 右 |
| :-- | --: |
| 一 | 二 |

- [x] 已完成

\`\`\`ts
const protocol = 'javascript:'
\`\`\``

    await expect(validateContentSource(content, validationOptions)).resolves.toEqual([])
  })

  it('accepts reference-style images from the configured Storage bucket', async () => {
    const content = `![图片][cover]

[cover]: ${imagePrefix}posts/reference.webp`

    await expect(validateContentSource(content, validationOptions)).resolves.toEqual([])
  })

  it.each([
    ':svg{onload="alert(1)"}',
    ':p{style="position:fixed"}',
    ':p[伪装段落]',
    ':a[伪装链接]{href=https://example.com}',
    ':input[启用输入框]',
    '::iframe{src="https://evil.example"}\n::',
    ':::script\nalert(1)\n:::',
    '::::input{type=checkbox}\n::::',
  ])('rejects Comark component syntax: %s', async (content) => {
    const issues = await validateContentSource(content, validationOptions)
    expect(issues.some(issue => issue.includes('Comark 组件'))).toBe(true)
  })

  it.each([
    '<img src="https://evil.example/tracker.png">',
    '<!-- hidden -->',
    '正文 <em>HTML</em>',
  ])('rejects raw HTML without rejecting Markdown autolinks or inline code: %s', async (content) => {
    const issues = await validateContentSource(content, validationOptions)
    expect(issues.some(issue => issue.includes('原始 HTML'))).toBe(true)
  })

  it.each([
    '![外部](https://tracker.example/image.png)',
    '![相对路径](/images/local.png)',
    `![路径穿越](${imagePrefix}../private/image.png)`,
    '![外部引用][image]\n\n[image]: https://tracker.example/image.png',
  ])('rejects images outside post-images: %s', async (content) => {
    const issues = await validateContentSource(content, validationOptions)
    expect(issues.some(issue => issue.includes('post-images'))).toBe(true)
  })

  it.each([
    '[危险](javascript:alert(1))',
    '[危险引用][link]\n\n[link]: data:text/html;base64,PHNjcmlwdD4=',
  ])('rejects dangerous Markdown link protocols: %s', async (content) => {
    const issues = await validateContentSource(content, validationOptions)
    expect(issues.some(issue => issue.includes('链接协议'))).toBe(true)
  })

  it('makes the assertion API reject invalid content', async () => {
    await expect(assertAllowedContent(':svg{onload="alert(1)"}', validationOptions))
      .rejects
      .toThrow('Comark 组件')
  })

  it.each([
    '# 标题 {onclick="alert(1)" style="position:fixed"}',
    '[链接](https://example.com){target=_blank rel=opener}',
  ])('rejects attributes that ordinary Markdown does not generate: %s', async (content) => {
    const issues = await validateContentSource(content, validationOptions)
    expect(issues.some(issue => issue.includes('不允许的'))).toBe(true)
  })
})

describe('createContentSecurityPlugins', () => {
  it('removes arbitrary component tags and event attributes at render time', async () => {
    const tree = await parse(':svg{onload="alert(1)"}', {
      html: false,
      plugins: createContentSecurityPlugins(validationOptions),
    })

    expect(collectElementTags(tree.nodes)).not.toContain('svg')
  })

  it('removes non-policy attributes from otherwise valid Markdown tags', async () => {
    const tree = await parse(':p{style="position:fixed" onload="alert(1)"}', {
      html: false,
      plugins: createContentSecurityPlugins(validationOptions),
    })

    expect(tree.nodes).toEqual([['p', {}]])
  })

  it('removes external reference-style images at render time', async () => {
    const tree = await parse(
      '![外部][image]\n\n[image]: https://tracker.example/image.png',
      {
        html: false,
        plugins: createContentSecurityPlugins(validationOptions),
      },
    )

    expect(collectElementTags(tree.nodes)).not.toContain('img')
  })

  it.each([
    '::::input\n::::',
    ':input[启用输入框]',
  ])('removes non-task-list input components at render time: %s', async (content) => {
    const tree = await parse(content, {
      html: false,
      plugins: createContentSecurityPlugins(validationOptions),
    })

    expect(collectElementTags(tree.nodes)).not.toContain('input')
  })
})

describe('publishable post fields', () => {
  const validPost = {
    title: '一篇可以发布的文章',
    slug: 'publishable-post-2026',
    content: '# 正文',
  }

  it.each([
    'article-slug',
    'nuxt-4',
    '中文标题',
    '中文-2026',
  ])('accepts route-safe slug %s', (slug) => {
    expect(isValidPostSlug(slug)).toBe(true)
  })

  it.each([
    'article/slug',
    'article slug',
    ' article-slug ',
    '-article',
    'article-',
    'article--slug',
    'article?draft=true',
  ])('rejects unsafe slug %s', (slug) => {
    expect(isValidPostSlug(slug)).toBe(false)
  })

  it('accepts a complete article', () => {
    expect(validatePublishablePostFields(validPost)).toEqual([])
    expect(() => assertPublishablePostFields(validPost)).not.toThrow()
  })

  it.each([
    [{ title: '   ' }, '文章标题'],
    [{ slug: 'invalid slug' }, 'Slug'],
    [{ content: '\n\t' }, '文章正文'],
  ] as const)('rejects incomplete publication fields: %o', (overrides, expectedMessage) => {
    expect(() => assertPublishablePostFields({ ...validPost, ...overrides }))
      .toThrow(expectedMessage)
  })
})
