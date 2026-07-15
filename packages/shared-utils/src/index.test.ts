import { describe, expect, it } from 'vitest'
import {
  calculateReadingMinutes,
  formatDate,
  getNextTheme,
  getThemeToggleLabel,
  getYear,
  isTheme,
  resolveTheme,
} from './index'

describe('theme rules', () => {
  it.each([
    ['light', true],
    ['dark', true],
    ['system', false],
    ['Dark', false],
    ['', false],
    [null, false],
  ])('recognizes persisted theme value %j', (value, expected) => {
    expect(isTheme(value)).toBe(expected)
  })

  it('keeps a valid manual preference ahead of the system preference', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('falls back to the system preference when no manual theme is valid', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('toggles both theme directions', () => {
    expect(getNextTheme('light')).toBe('dark')
    expect(getNextTheme('dark')).toBe('light')
  })

  it('describes the action that the theme toggle will perform', () => {
    expect(getThemeToggleLabel('light')).toBe('切换到深色模式')
    expect(getThemeToggleLabel('dark')).toBe('切换到浅色模式')
  })
})

describe('calculateReadingMinutes', () => {
  it('counts compact Chinese prose by characters rather than whitespace chunks', () => {
    expect(calculateReadingMinutes('这是一个没有空格的中文段落。'.repeat(30))).toBe(2)
  })

  it('combines Chinese characters and Latin words', () => {
    const mixedContent = `${'中'.repeat(300)} ${'word '.repeat(200)}`

    expect(calculateReadingMinutes(mixedContent)).toBe(2)
  })

  it('returns at least one minute for empty or short content', () => {
    expect(calculateReadingMinutes('')).toBe(1)
    expect(calculateReadingMinutes('short note')).toBe(1)
  })
})

describe('date formatting', () => {
  const utcYearBoundary = '2025-12-31T16:30:00.000Z'

  it('uses the blog time zone consistently on the server and client', () => {
    expect(formatDate(utcYearBoundary)).toBe('2026年1月1日')
    expect(getYear(utcYearBoundary)).toBe(2026)
  })

  it('allows an explicit time zone when reused elsewhere', () => {
    expect(formatDate(utcYearBoundary, 'zh-CN', 'UTC')).toBe('2025年12月31日')
    expect(getYear(utcYearBoundary, 'UTC')).toBe(2025)
  })
})
