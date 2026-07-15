import { parse } from 'comark'
import type { ComarkNode, ComarkPlugin } from 'comark'

export type ArticleHeadingDepth = 2 | 3 | 4

export type ArticleHeading = {
  id: string
  text: string
  depth: ArticleHeadingDepth
}

const articleHeadingTags = new Set(['h2', 'h3', 'h4'])

function extractNodeText(node: ComarkNode): string {
  if (typeof node === 'string') return node
  if (node[0] === null) return ''

  if (node[0] === 'img' && typeof node[1].alt === 'string') {
    return node[1].alt
  }

  const [, , ...children] = node
  return children.map(extractNodeText).join('')
}

function normalizeHeadingText(node: ComarkNode): string {
  return extractNodeText(node).replace(/\s+/gu, ' ').trim()
}

export function slugifyArticleHeading(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'section'
}

function allocateHeadingId(
  baseId: string,
  usedIds: Set<string>,
  nextSuffixByBase: Map<string, number>,
): string {
  let suffix = nextSuffixByBase.get(baseId) ?? 1
  let candidate = suffix === 1 ? baseId : `${baseId}-${suffix}`

  while (usedIds.has(candidate)) {
    suffix += 1
    candidate = `${baseId}-${suffix}`
  }

  usedIds.add(candidate)
  nextSuffixByBase.set(baseId, suffix + 1)
  return candidate
}

/**
 * Applies the exact heading semantics shared by the article renderer and TOC.
 * Body-level h1 headings are demoted so the page title remains the sole h1.
 */
export function applyArticleHeadingRules(nodes: ComarkNode[]): ArticleHeading[] {
  const headings: ArticleHeading[] = []
  const usedIds = new Set<string>()
  const nextSuffixByBase = new Map<string, number>()

  function visit(currentNodes: ComarkNode[]): void {
    for (const node of currentNodes) {
      if (typeof node === 'string' || node[0] === null) continue

      if (node[0] === 'h1') node[0] = 'h2'

      if (articleHeadingTags.has(node[0])) {
        const text = normalizeHeadingText(node)
        const id = allocateHeadingId(
          slugifyArticleHeading(text),
          usedIds,
          nextSuffixByBase,
        )

        node[1].id = id
        headings.push({
          id,
          text: text || '未命名小节',
          depth: Number(node[0].slice(1)) as ArticleHeadingDepth,
        })
      } else if (node[0] === 'h5' || node[0] === 'h6') {
        delete node[1].id
      }

      const [, , ...children] = node
      visit(children)
    }
  }

  visit(nodes)
  return headings
}

export function createArticleHeadingPlugin(): ComarkPlugin {
  return {
    name: 'chen-blog-article-headings',
    post(state) {
      applyArticleHeadingRules(state.tree.nodes)
    },
  }
}

/** Parse article source into the deterministic, SSR-safe heading list. */
export async function extractArticleHeadings(content: string): Promise<ArticleHeading[]> {
  const tree = await parse(content, { html: false })
  return applyArticleHeadingRules(tree.nodes)
}
