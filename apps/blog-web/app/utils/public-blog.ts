import type { Database } from '@chen-blog/database-types'
import type {
  CategorySummary,
  MediaRecord,
  PostDetail,
  PostPreview,
  TagSummary,
} from '@chen-blog/shared-types'
import { calculateReadingMinutes } from '@chen-blog/shared-utils'
import {
  createClient,
  type QueryData,
  type SupabaseClient,
} from '@supabase/supabase-js'
import { getDemoCategories, getDemoPost, getDemoPosts, getDemoTags } from '~/data/demo'

const PUBLIC_POST_SELECT = 'id,title,slug,summary,content,published_at,updated_at,categories(name,slug),post_tags(tags(id,name,slug)),media:cover_media_id(id,bucket_id,object_path,alt_text,created_at)' as const

type PublicClient = SupabaseClient<Database>

function selectPublicPosts(client: PublicClient) {
  return client.from('posts').select(PUBLIC_POST_SELECT)
}

type PublicPostRow = QueryData<ReturnType<typeof selectPublicPosts>>[number]

export type ArticleNavigationItem = Pick<PostPreview, 'title' | 'slug'>

export type ArticleNavigation = {
  previous: ArticleNavigationItem | null
  next: ArticleNavigationItem | null
}

function getClient(): PublicClient | null {
  const config = useRuntimeConfig()
  if (!config.public.supabaseUrl || !config.public.supabasePublishableKey) return null

  return createClient<Database>(config.public.supabaseUrl, config.public.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function requirePublishedAt(row: PublicPostRow): string {
  if (row.published_at) return row.published_at

  throw createError({
    statusCode: 502,
    statusMessage: 'Public query returned a post without a publication date.',
  })
}

function mapPost(row: PublicPostRow): PostPreview {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    publishedAt: requirePublishedAt(row),
    updatedAt: row.updated_at,
    category: row.categories,
    tags: row.post_tags.flatMap((relation) => relation.tags ? [relation.tags] : []),
    readingMinutes: calculateReadingMinutes(row.content),
  }
}

function getDemoNavigation(postSlug: string): ArticleNavigation {
  const posts = [...getDemoPosts()].sort((a, b) => {
    const byPublishedAt = b.publishedAt.localeCompare(a.publishedAt)
    return byPublishedAt || b.id.localeCompare(a.id)
  })
  const currentIndex = posts.findIndex((post) => post.slug === postSlug)

  if (currentIndex < 0) return { previous: null, next: null }

  const previous = posts[currentIndex + 1]
  const next = posts[currentIndex - 1]

  return {
    previous: previous ? { title: previous.title, slug: previous.slug } : null,
    next: next ? { title: next.title, slug: next.slug } : null,
  }
}

function missingPublicConfiguration(): never {
  throw createError({
    statusCode: 500,
    statusMessage: 'Supabase public configuration is missing.',
  })
}

export function getPublicMediaUrl(media: MediaRecord): string {
  const client = getClient()
  if (!client) return ''

  return client.storage.from(media.bucketId).getPublicUrl(media.objectPath).data.publicUrl
}

export async function fetchPublishedPosts(): Promise<PostPreview[]> {
  const client = getClient()
  if (!client && import.meta.dev) return getDemoPosts()
  if (!client) return missingPublicConfiguration()

  const { data, error } = await selectPublicPosts(client)
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) throw createError({ statusCode: 502, statusMessage: error.message })

  return data.map(mapPost)
}

export async function fetchPublishedPost(postSlug: string): Promise<PostDetail | null> {
  const client = getClient()
  if (!client && import.meta.dev) return getDemoPost(postSlug)
  if (!client) return missingPublicConfiguration()

  const { data, error } = await selectPublicPosts(client)
    .eq('slug', postSlug)
    .maybeSingle()

  if (error) throw createError({ statusCode: 502, statusMessage: error.message })
  if (!data) return null

  return {
    ...mapPost(data),
    content: data.content,
    cover: data.media
      ? {
          id: data.media.id,
          bucketId: data.media.bucket_id,
          objectPath: data.media.object_path,
          altText: data.media.alt_text,
          createdAt: data.media.created_at,
        }
      : null,
  }
}

export async function fetchArticleNavigation(post: Pick<PostPreview, 'id' | 'slug'>): Promise<ArticleNavigation> {
  const client = getClient()
  if (!client && import.meta.dev) return getDemoNavigation(post.slug)
  if (!client) return missingPublicConfiguration()

  // A single transaction can publish multiple rows with the same timestamp.
  // Keep UUID as a stable tie-breaker so those articles still link together.
  const { data, error } = await client
    .from('posts')
    .select('id,title,slug')
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) throw createError({ statusCode: 502, statusMessage: error.message })

  const currentIndex = data.findIndex(item => item.id === post.id)
  if (currentIndex < 0) return { previous: null, next: null }

  const previous = data[currentIndex + 1]
  const next = data[currentIndex - 1]

  return {
    previous: previous ? { title: previous.title, slug: previous.slug } : null,
    next: next ? { title: next.title, slug: next.slug } : null,
  }
}

export async function fetchCategories(): Promise<CategorySummary[]> {
  const client = getClient()
  if (!client && import.meta.dev) return getDemoCategories()
  if (!client) return missingPublicConfiguration()

  const { data, error } = await client
    .from('categories')
    .select('id,name,slug,description')
    .order('name')

  if (error) throw createError({ statusCode: 502, statusMessage: error.message })

  return data
}

export async function fetchTags(): Promise<TagSummary[]> {
  const client = getClient()
  if (!client && import.meta.dev) return getDemoTags()
  if (!client) return missingPublicConfiguration()

  const { data, error } = await client
    .from('tags')
    .select('id,name,slug')
    .order('name')

  if (error) throw createError({ statusCode: 502, statusMessage: error.message })

  return data
}
