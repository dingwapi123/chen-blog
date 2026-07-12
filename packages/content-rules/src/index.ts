/** Shared content rules. Nuxt MDC owns formal parsing and rendering. */
export const contentPolicy = {
  allowRawHtml: false,
  allowedLinkProtocols: ['https:', 'http:', 'mailto:'],
  allowedMdcComponents: [] as string[],
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
