import type { PostDraftInput } from '@chen-blog/shared-types'
import type { AdminPost } from '@/features/content/api'

export const postSlugPattern = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u

export function isValidSlug(value: string, maxLength = 200): boolean {
  return value.length <= maxLength && postSlugPattern.test(value)
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
