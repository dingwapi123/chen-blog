/**
 * Shared Markdown rendering policy. Parser and sanitizer integrations are added
 * when the public renderer and CMS preview are implemented together.
 */
export const markdownPolicy = {
  allowRawHtml: false,
  allowedLinkProtocols: ['https:', 'http:', 'mailto:'],
} as const
