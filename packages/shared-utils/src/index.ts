export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function calculateReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/u).filter(Boolean).length
  const chineseCharacters = (content.match(/[\u3400-\u9fff]/gu) ?? []).length
  return Math.max(1, Math.ceil(Math.max(words, chineseCharacters / 300)))
}

export function formatDate(value: string, locale = 'zh-CN'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}

export function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
}
