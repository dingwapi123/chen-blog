import { parse } from 'comark'
import security from 'comark/plugins/security'
import type {
  ComarkElement,
  ComarkElementAttributes,
  ComarkNode,
  ComarkPlugin,
} from 'comark'

export {
  applyArticleHeadingRules,
  createArticleHeadingPlugin,
  extractArticleHeadings,
  slugifyArticleHeading,
} from './article-headings'
export type { ArticleHeading, ArticleHeadingDepth } from './article-headings'

const markdownTags = [
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'input',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
] as const

type MarkdownTag = (typeof markdownTags)[number]

const allowedAttributeNames: Record<MarkdownTag, readonly string[]> = {
  a: ['href', 'title'],
  blockquote: [],
  br: [],
  code: ['class'],
  del: [],
  em: [],
  h1: ['id'],
  h2: ['id'],
  h3: ['id'],
  h4: ['id'],
  h5: ['id'],
  h6: ['id'],
  hr: [],
  img: ['src', 'alt', 'title'],
  input: ['class', 'type', ':disabled', ':checked'],
  li: ['class'],
  ol: ['start'],
  p: [],
  pre: ['language'],
  strong: [],
  table: [],
  tbody: [],
  td: ['style'],
  th: ['style'],
  thead: [],
  tr: [],
  ul: ['class'],
}

const markdownTagSet = new Set<string>(markdownTags)

/** Shared parsing and rendering constraints for persisted article content. */
export const contentPolicy = {
  allowRawHtml: false,
  allowedLinkProtocols: ['https:', 'http:', 'mailto:'],
  allowedMarkdownTags: markdownTags,
  allowedComarkComponents: [] as string[],
} as const

export type ContentValidationOptions = {
  allowedImagePrefixes?: readonly string[]
}

export type PublishablePostFields = {
  title: string
  slug: string
  content: string
}

export const postSlugPattern = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u

export function isValidPostSlug(value: string, maxLength = 200): boolean {
  return value.length <= maxLength && postSlugPattern.test(value)
}

export function validatePublishablePostFields(post: PublishablePostFields): string[] {
  const issues: string[] = []
  const title = post.title.trim()
  const slug = post.slug.trim()

  if (!title) issues.push('发布前请先填写文章标题。')
  else if (title.length > 200) issues.push('文章标题不能超过 200 个字符。')

  if (!slug) issues.push('发布前请先填写文章 Slug。')
  else if (!isValidPostSlug(post.slug)) {
    issues.push('Slug 只能使用文字、数字和单个连字符，且不能以连字符开头或结尾。')
  }

  if (!post.content.trim()) issues.push('发布前请先填写文章正文。')

  return issues
}

export function assertPublishablePostFields(post: PublishablePostFields): void {
  const issues = validatePublishablePostFields(post)
  if (issues.length) throw new Error(issues.join(' '))
}

export function isAllowedContentUrl(url: string): boolean {
  try {
    const protocol = new URL(url, 'https://chen-blog.local').protocol
    return contentPolicy.allowedLinkProtocols.includes(
      protocol as (typeof contentPolicy.allowedLinkProtocols)[number],
    )
  } catch {
    return false
  }
}

export function getPostImagesPublicUrlPrefix(supabaseUrl: string): string {
  const baseUrl = new URL(supabaseUrl)
  if (baseUrl.protocol !== 'https:' && baseUrl.protocol !== 'http:') {
    throw new Error('Supabase URL 必须使用 HTTP 或 HTTPS。')
  }
  return new URL('/storage/v1/object/public/post-images/', baseUrl).href
}

export function isAllowedContentImageUrl(url: string, allowedPrefixes: readonly string[]): boolean {
  try {
    const normalizedUrl = new URL(url).href
    return allowedPrefixes.some(prefix => normalizedUrl.startsWith(new URL(prefix).href))
  } catch {
    return false
  }
}

function visibleSourceLines(content: string): Array<{ line: number, value: string }> {
  const lines = content.split(/\r?\n/)
  const result: Array<{ line: number, value: string }> = []
  let fence: '`' | '~' | undefined
  let fenceLength = 0

  for (const [index, value] of lines.entries()) {
    const fenceMatch = value.match(/^\s*(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1]!
      if (!fence) {
        fence = marker[0] as '`' | '~'
        fenceLength = marker.length
      } else if (marker[0] === fence && marker.length >= fenceLength) {
        fence = undefined
        fenceLength = 0
      }
      continue
    }
    if (!fence) result.push({ line: index + 1, value })
  }

  return result
}

function withoutInlineCode(value: string): string {
  return value.replace(/(`+)(.*?)\1/g, '')
}

function collectSourceSyntaxIssues(content: string): string[] {
  const issues: string[] = []

  for (const { line, value } of visibleSourceLines(content)) {
    const visibleValue = withoutInlineCode(value)
    const componentMatch = visibleValue.match(
      /(?:^|[\s([{>])(:+)([a-z$][\w$-]*)(?=\s|\[|\{|$)/i,
    )
    if (componentMatch) {
      issues.push(`第 ${line} 行使用了未允许的 Comark 组件：${componentMatch[2]}。`)
    }

    if (/!?\[[^\]]*\]\(\s*<?\s*(?:javascript|vbscript|data):/i.test(visibleValue)) {
      issues.push(`第 ${line} 行包含不允许的链接协议。`)
    }
    if (/^\s*\[[^\]]+\]:\s*<?\s*(?:javascript|vbscript|data):/i.test(visibleValue)) {
      issues.push(`第 ${line} 行包含不允许的链接协议。`)
    }
  }

  return issues
}

function isInternalReferenceArtifact(node: ComarkElement): boolean {
  return node[0] === 'component'
    && Object.keys(node[1]).length === 0
    && node.length === 2
}

function isAllowedAttributeValue(
  tag: MarkdownTag,
  name: string,
  value: unknown,
  allowedImagePrefixes: readonly string[],
): boolean {
  if (name === 'href') return typeof value === 'string' && isAllowedContentUrl(value)
  if (name === 'src') {
    return typeof value === 'string' && isAllowedContentImageUrl(value, allowedImagePrefixes)
  }
  if (name === 'id' || name === 'alt' || name === 'title') return typeof value === 'string'
  if (tag === 'pre' && name === 'language') {
    return typeof value === 'string' && /^[\w#+.-]{1,40}$/.test(value)
  }
  if (tag === 'code' && name === 'class') {
    return typeof value === 'string' && /^language-[\w#+.-]{1,40}$/.test(value)
  }
  if (tag === 'ol' && name === 'start') return typeof value === 'string' && /^\d+$/.test(value)
  if (tag === 'ul' && name === 'class') return value === 'contains-task-list'
  if (tag === 'li' && name === 'class') return value === 'task-list-item'
  if (tag === 'input' && name === 'class') return value === 'task-list-item-checkbox'
  if (tag === 'input' && name === 'type') return value === 'checkbox'
  if (tag === 'input' && (name === ':disabled' || name === ':checked')) return value === 'true'
  if ((tag === 'th' || tag === 'td') && name === 'style') {
    return typeof value === 'string' && /^text-align:(?:left|center|right)$/.test(value)
  }
  return false
}

function isValidTaskListInput(
  attributes: ComarkElementAttributes,
  children: readonly ComarkNode[],
): boolean {
  const names = Object.keys(attributes)
  return children.length === 0
    && names.every(name => allowedAttributeNames.input.includes(name))
    && attributes.class === 'task-list-item-checkbox'
    && attributes.type === 'checkbox'
    && attributes[':disabled'] === 'true'
    && (attributes[':checked'] === undefined || attributes[':checked'] === 'true')
}

function collectTreeIssues(
  nodes: readonly ComarkNode[],
  allowedImagePrefixes: readonly string[],
  issues: string[],
): void {
  for (const node of nodes) {
    if (typeof node === 'string') continue
    if (node[0] === null) {
      issues.push('正文不允许原始 HTML 注释。')
      continue
    }
    if (isInternalReferenceArtifact(node)) continue

    const [tag, attributes, ...children] = node
    if (attributes.$ && typeof attributes.$ === 'object' && attributes.$.html === 1) {
      issues.push('正文不允许原始 HTML。')
    }
    if (!markdownTagSet.has(tag)) {
      issues.push(`正文使用了未允许的 Comark 组件：${tag}。`)
      continue
    }

    const markdownTag = tag as MarkdownTag
    const allowedNames = allowedAttributeNames[markdownTag]
    for (const [name, value] of Object.entries(attributes)) {
      if (name === '$') continue
      if (
        !allowedNames.includes(name)
        || !isAllowedAttributeValue(markdownTag, name, value, allowedImagePrefixes)
      ) {
        issues.push(`正文包含不允许的 ${tag}.${name} 属性。`)
      }
    }

    if (tag === 'img') {
      const source = attributes.src
      if (typeof source !== 'string' || !isAllowedContentImageUrl(source, allowedImagePrefixes)) {
        issues.push('正文图片不属于 post-images 媒体库。')
      }
    }
    if (tag === 'input' && !isValidTaskListInput(attributes, children)) {
      issues.push('正文包含不允许的交互式 input。')
    }

    collectTreeIssues(children, allowedImagePrefixes, issues)
  }
}

/**
 * Parses the exact Comark grammar used by the renderer and rejects content that
 * falls outside the V1 Markdown policy.
 */
export async function validateContentSource(
  content: string,
  options: ContentValidationOptions = {},
): Promise<string[]> {
  const issues = collectSourceSyntaxIssues(content)
  try {
    const tree = await parse(content, { html: true })
    collectTreeIssues(tree.nodes, options.allowedImagePrefixes ?? [], issues)
  } catch {
    issues.push('正文无法按 Markdown / Comark 规则解析。')
  }
  return [...new Set(issues)]
}

export async function assertAllowedContent(
  content: string,
  options: ContentValidationOptions = {},
): Promise<void> {
  const issues = await validateContentSource(content, options)
  if (issues.length) throw new Error(issues.join(' '))
}

function sanitizeAttributes(
  tag: MarkdownTag,
  attributes: ComarkElementAttributes,
  allowedImagePrefixes: readonly string[],
): ComarkElementAttributes {
  return Object.fromEntries(
    Object.entries(attributes).filter(([name, value]) => {
      return allowedAttributeNames[tag].includes(name)
        && isAllowedAttributeValue(tag, name, value, allowedImagePrefixes)
    }),
  )
}

function sanitizeNodes(
  nodes: readonly ComarkNode[],
  allowedImagePrefixes: readonly string[],
): ComarkNode[] {
  return nodes.flatMap((node): ComarkNode[] => {
    if (typeof node === 'string') return [node]
    if (node[0] === null || !markdownTagSet.has(node[0])) return []

    const [tag, attributes, ...children] = node
    const markdownTag = tag as MarkdownTag
    if (tag === 'input' && !isValidTaskListInput(attributes, children)) return []
    const sanitizedAttributes = sanitizeAttributes(markdownTag, attributes, allowedImagePrefixes)
    if (tag === 'img' && typeof sanitizedAttributes.src !== 'string') return []

    return [[
      tag,
      sanitizedAttributes,
      ...sanitizeNodes(children, allowedImagePrefixes),
    ]]
  })
}

function strictContentPolicy(options: ContentValidationOptions): ComarkPlugin {
  const allowedImagePrefixes = options.allowedImagePrefixes ?? []
  return {
    name: 'chen-blog-content-policy',
    post(state) {
      state.tree.nodes = sanitizeNodes(state.tree.nodes, allowedImagePrefixes)
    },
  }
}

/** Runtime defense in depth for content that predates the current publish gate. */
export function createContentSecurityPlugins(
  options: ContentValidationOptions = {},
): ComarkPlugin[] {
  const allowedImagePrefixes = [...(options.allowedImagePrefixes ?? [])]
  return [
    strictContentPolicy({ allowedImagePrefixes }),
    security({
      allowedTags: [...contentPolicy.allowedMarkdownTags],
      allowedProtocols: contentPolicy.allowedLinkProtocols.map(protocol => protocol.slice(0, -1)),
      allowedImagePrefixes,
      allowDataImages: false,
    }),
  ]
}
