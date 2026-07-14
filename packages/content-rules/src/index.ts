/** Shared source validation rules. Nuxt Comark owns formal parsing and rendering. */
export const contentPolicy = {
  allowRawHtml: false,
  allowedLinkProtocols: ['https:', 'http:', 'mailto:'],
  allowedComarkComponents: [] as string[],
} as const

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

function visibleSourceLines(content: string): Array<{ line: number; value: string }> {
  const lines = content.split(/\r?\n/)
  const result: Array<{ line: number; value: string }> = []
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

/**
 * Checks only source-level constraints that must be shared by the CMS and the
 * server-side publish gate. Comark remains responsible for parsing/rendering.
 */
export function validateContentSource(content: string): string[] {
  const issues: string[] = []

  for (const { line, value } of visibleSourceLines(content)) {
    if (!contentPolicy.allowRawHtml && /<\/?[a-z][^>]*>|<!--/i.test(value)) {
      issues.push(`第 ${line} 行不允许原始 HTML。`)
    }

    const componentMatch = value.match(/^\s*:{2,3}([a-z][\w-]*)/i)
    if (componentMatch && !contentPolicy.allowedComarkComponents.includes(componentMatch[1] as never)) {
      issues.push(`第 ${line} 行使用了未允许的 Comark 组件：${componentMatch[1]}。`)
    }

    const markdownTargets = value.matchAll(/!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))/g)
    for (const targetMatch of markdownTargets) {
      const target = targetMatch[1] ?? targetMatch[2]
      if (target && !isAllowedContentUrl(target)) {
        issues.push(`第 ${line} 行包含不允许的链接协议。`)
      }
    }

    if (/(?:^|[\s(])(?:javascript|vbscript|data):/i.test(value)) {
      issues.push(`第 ${line} 行包含不允许的链接协议。`)
    }
  }

  return [...new Set(issues)]
}

export function assertAllowedContent(content: string): void {
  const issues = validateContentSource(content)
  if (issues.length) throw new Error(issues.join(' '))
}
