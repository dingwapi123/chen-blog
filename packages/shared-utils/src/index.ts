export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function calculateReadingMinutes(content: string): number {
  const chineseCharacters = (content.match(/[\u3400-\u9fff]/gu) ?? []).length
  const words = content
    .replace(/[\u3400-\u9fff]/gu, ' ')
    .match(/[\p{L}\p{N}]+/gu)?.length ?? 0

  return Math.max(1, Math.ceil(chineseCharacters / 300 + words / 200))
}

export const DEFAULT_TIME_ZONE = 'Asia/Shanghai'

export function formatDate(
  value: string,
  locale = 'zh-CN',
  timeZone = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  }).format(new Date(value))
}

export function getYear(value: string, timeZone = DEFAULT_TIME_ZONE): number {
  return Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone }).format(new Date(value)))
}

export function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
}
