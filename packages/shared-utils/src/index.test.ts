import { describe, expect, it } from 'vitest'
import { calculateReadingMinutes, formatDate, getYear } from './index'

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
