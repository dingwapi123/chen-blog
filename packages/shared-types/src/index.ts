/** Cross-application DTOs belong here; database row types belong in database-types. */
export type PostStatus = 'draft' | 'published' | 'archived'

export type CategorySummary = {
  id: string
  name: string
  slug: string
  description: string
}

export type TagSummary = {
  id: string
  name: string
  slug: string
}

export type MediaRecord = {
  id: string
  bucketId: string
  objectPath: string
  altText: string
  createdAt: string
}

export type PostPreview = {
  id: string
  title: string
  slug: string
  summary: string
  publishedAt: string
  updatedAt: string
  category: Pick<CategorySummary, 'name' | 'slug'> | null
  tags: TagSummary[]
  readingMinutes: number
}

export type PostDetail = PostPreview & {
  content: string
  cover: MediaRecord | null
}

export type ArticleNavigationItem = Pick<PostPreview, 'title' | 'slug'>

export type ArticleNavigation = {
  previous: ArticleNavigationItem | null
  next: ArticleNavigationItem | null
}

export type PublicPostPage = {
  post: PostDetail
  navigation: ArticleNavigation
}

export type PostDraftInput = {
  title: string
  slug: string
  summary: string
  content: string
  categoryId: string | null
  coverMediaId: string | null
  tagIds: string[]
  status: Exclude<PostStatus, 'published'>
}

export type PublishPostInput = {
  id: string
}

export type PublishPostResult = {
  id: string
  status: 'published'
  publishedAt: string
}
