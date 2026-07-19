import { describe, expect, it } from 'vitest'
import type { AdminPost } from '@/features/content/api'
import {
  createPostDraft,
  getPostDraftFingerprint,
} from '@/features/posts/editor-state'

function createPost(overrides: Partial<AdminPost> = {}): AdminPost {
  return {
    id: 'post-1',
    title: '文章标题',
    summary: '摘要',
    content: '# 正文',
    status: 'draft',
    category_id: null,
    cover_media_id: null,
    published_at: null,
    updated_at: '2026-07-15T00:00:00.000Z',
    deleted_at: null,
    post_tags: [{ tag_id: 'tag-b' }, { tag_id: 'tag-a' }],
    ...overrides,
  }
}

describe('editor state', () => {
  it('keeps archived records archived and never models published as directly editable', () => {
    expect(createPostDraft(createPost({ status: 'archived' })).status).toBe('archived')
    expect(createPostDraft(createPost({ status: 'published' })).status).toBe('draft')
  })

  it('does not mark a draft dirty when only tag order changes', () => {
    const draft = createPostDraft(createPost())
    expect(getPostDraftFingerprint(draft)).toBe(getPostDraftFingerprint({
      ...draft,
      tagIds: [...draft.tagIds].reverse(),
    }))
  })
})
