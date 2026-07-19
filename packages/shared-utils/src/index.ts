export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return uuidPattern.test(value)
}

export type Theme = 'light' | 'dark'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

export function resolveTheme(value: unknown, prefersDark: boolean): Theme {
  if (isTheme(value)) return value
  return prefersDark ? 'dark' : 'light'
}

export function getNextTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark'
}

export function getThemeToggleLabel(theme: Theme): string {
  return theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'
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
