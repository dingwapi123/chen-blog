import MarkdownIt from 'markdown-it'
import { fromHighlighter } from '@shikijs/markdown-it'
import { createHighlighter } from 'shiki'

/** Shared Markdown rendering policy for the CMS preview and public reader. */
export const markdownPolicy = {
  allowRawHtml: false,
  allowedLinkProtocols: ['https:', 'http:', 'mailto:'],
} as const

const highlighter = await createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: ['bash', 'css', 'html', 'javascript', 'json', 'markdown', 'sql', 'typescript', 'vue'],
})

const markdown = MarkdownIt({
  html: markdownPolicy.allowRawHtml,
  linkify: true,
  typographer: true,
})

markdown.validateLink = (url: string) => {
  try {
    const protocol = new URL(url, 'https://chen-blog.local').protocol
    return markdownPolicy.allowedLinkProtocols.includes(
      protocol as (typeof markdownPolicy.allowedLinkProtocols)[number],
    )
  } catch {
    return false
  }
}

markdown.use(
  fromHighlighter(highlighter, {
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
  }),
)

export function renderMarkdown(content: string): string {
  return markdown.render(content)
}
