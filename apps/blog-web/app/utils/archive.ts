import type { PostPreview } from '@chen-blog/shared-types'
import { getYear } from '@chen-blog/shared-utils'

export type ArchiveYearGroup = {
  year: number
  posts: PostPreview[]
}

export function groupPostsByYear(posts: PostPreview[]): ArchiveYearGroup[] {
  const groups = new Map<number, PostPreview[]>()
  const sortedPosts = [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  for (const post of sortedPosts) {
    const year = getYear(post.publishedAt)
    const group = groups.get(year) ?? []
    group.push(post)
    groups.set(year, group)
  }

  return [...groups.entries()]
    .sort(([yearA], [yearB]) => yearB - yearA)
    .map(([year, yearPosts]) => ({ year, posts: yearPosts }))
}
