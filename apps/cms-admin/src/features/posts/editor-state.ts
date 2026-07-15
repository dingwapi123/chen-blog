import type { PostDraftInput } from '@chen-blog/shared-types'
import { isValidPostSlug, postSlugPattern } from '@chen-blog/content-rules'
import type { AdminPost } from '@/features/content/api'

export { postSlugPattern }

export function isValidSlug(value: string, maxLength = 200): boolean {
  return isValidPostSlug(value, maxLength)
}

export function createPostDraft(post: AdminPost | null): PostDraftInput {
  return {
    title: post?.title ?? '',
    slug: post?.slug ?? '',
    summary: post?.summary ?? '',
    content: post?.content ?? '',
    categoryId: post?.category_id ?? null,
    coverMediaId: post?.cover_media_id ?? null,
    tagIds: post?.post_tags.map((item) => item.tag_id) ?? [],
    status: post?.status === 'archived' ? 'archived' : 'draft',
  }
}

export function getPostDraftFingerprint(input: PostDraftInput): string {
  return JSON.stringify({
    ...input,
    tagIds: [...input.tagIds].sort(),
  })
}
