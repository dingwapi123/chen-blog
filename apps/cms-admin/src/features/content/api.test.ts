import type { PostDraftInput } from '@chen-blog/shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSupabase: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: mocks.getSupabase,
  getSupabaseUrl: () => 'https://example.supabase.co',
}))

import { savePost } from './api'

const draft: PostDraftInput = {
  title: '安全测试',
  slug: 'security-test',
  summary: '',
  content: '<script>alert(1)</script>',
  categoryId: null,
  coverMediaId: null,
  status: 'draft',
  tagIds: [],
}

describe('savePost', () => {
  beforeEach(() => {
    mocks.getSupabase.mockReset()
  })

  it('awaits content validation before starting any database write', async () => {
    await expect(savePost(undefined, draft)).rejects.toThrow('原始 HTML')
    expect(mocks.getSupabase).not.toHaveBeenCalled()
  })
})
