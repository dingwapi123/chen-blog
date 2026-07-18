import type {
  CategorySummary,
  PostPreview,
  PublicPostPage,
  TagSummary,
} from '@chen-blog/shared-types'

export async function fetchPublishedPosts(): Promise<PostPreview[]> {
  return await $fetch<PostPreview[]>('/api/public/posts')
}

export async function fetchPublishedPostPage(postSlug: string): Promise<PublicPostPage | null> {
  try {
    return await $fetch<PublicPostPage>(`/api/public/posts/${encodeURIComponent(postSlug)}`)
  } catch (error) {
    if (getHttpStatus(error) === 404) return null
    throw error
  }
}

export async function fetchCategories(): Promise<CategorySummary[]> {
  return await $fetch<CategorySummary[]>('/api/public/categories')
}

export async function fetchTags(): Promise<TagSummary[]> {
  return await $fetch<TagSummary[]>('/api/public/tags')
}

function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined

  const candidate = error as {
    status?: number
    statusCode?: number
    response?: { status?: number }
  }

  return candidate.statusCode ?? candidate.status ?? candidate.response?.status
}
