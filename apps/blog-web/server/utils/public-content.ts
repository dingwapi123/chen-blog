import type { Database } from '@chen-blog/database-types'
import type {
  ArticleNavigation,
  CategorySummary,
  PostDetail,
  PostPreview,
  PublicPostPage,
  TagSummary,
} from '@chen-blog/shared-types'
import { calculateReadingMinutes } from '@chen-blog/shared-utils'
import {
  createClient,
  type QueryData,
  type SupabaseClient,
} from '@supabase/supabase-js'

const PUBLIC_POST_SELECT = 'id,title,slug,summary,content,published_at,updated_at,categories(name,slug),post_tags(tags(id,name,slug)),media:cover_media_id(id,bucket_id,object_path,alt_text,created_at)' as const

type PublicClient = SupabaseClient<Database>
type PublicRequestEvent = Parameters<typeof useRuntimeConfig>[0]

function selectPublicPosts(client: PublicClient) {
  return client.from('posts').select(PUBLIC_POST_SELECT)
}

type PublicPostRow = QueryData<ReturnType<typeof selectPublicPosts>>[number]

function getPublicClient(event: PublicRequestEvent): PublicClient {
  const config = useRuntimeConfig(event)
  if (!config.public.supabaseUrl || !config.supabasePublishableKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase public data configuration is missing.',
    })
  }

  return createClient<Database>(config.public.supabaseUrl, config.supabasePublishableKey, {
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

function mapPostPreview(row: PublicPostRow): PostPreview {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    publishedAt: requirePublishedAt(row),
    updatedAt: row.updated_at,
    category: row.categories,
    tags: row.post_tags.flatMap(relation => relation.tags ? [relation.tags] : []),
    readingMinutes: calculateReadingMinutes(row.content),
  }
}

function mapPostDetail(row: PublicPostRow): PostDetail {
  return {
    ...mapPostPreview(row),
    content: row.content,
    cover: row.media
      ? {
          id: row.media.id,
          bucketId: row.media.bucket_id,
          objectPath: row.media.object_path,
          altText: row.media.alt_text,
          createdAt: row.media.created_at,
        }
      : null,
  }
}

function buildNavigation(
  posts: Array<Pick<PostPreview, 'id' | 'title' | 'slug'>>,
  currentId: string,
): ArticleNavigation {
  const currentIndex = posts.findIndex(post => post.id === currentId)
  if (currentIndex < 0) return { previous: null, next: null }

  const previous = posts[currentIndex + 1]
  const next = posts[currentIndex - 1]

  return {
    previous: previous ? { title: previous.title, slug: previous.slug } : null,
    next: next ? { title: next.title, slug: next.slug } : null,
  }
}

function throwDataApiError(error: { message: string }): never {
  throw createError({ statusCode: 502, statusMessage: error.message })
}

export async function listPublishedPosts(event: PublicRequestEvent): Promise<PostPreview[]> {
  const client = getPublicClient(event)

  const { data, error } = await selectPublicPosts(client)
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) return throwDataApiError(error)
  return data.map(mapPostPreview)
}

export async function getPublishedPostPage(
  event: PublicRequestEvent,
  postSlug: string,
): Promise<PublicPostPage | null> {
  const client = getPublicClient(event)

  const [postResult, navigationResult] = await Promise.all([
    selectPublicPosts(client).eq('slug', postSlug).maybeSingle(),
    client
      .from('posts')
      .select('id,title,slug')
      .order('published_at', { ascending: false })
      .order('id', { ascending: false }),
  ])

  const error = postResult.error ?? navigationResult.error
  if (error) return throwDataApiError(error)
  if (!postResult.data) return null

  return {
    post: mapPostDetail(postResult.data),
    navigation: buildNavigation(navigationResult.data ?? [], postResult.data.id),
  }
}

export async function listPublicCategories(event: PublicRequestEvent): Promise<CategorySummary[]> {
  const client = getPublicClient(event)

  const { data, error } = await client
    .from('categories')
    .select('id,name,slug,description')
    .order('name')

  if (error) return throwDataApiError(error)
  return data
}

export async function listPublicTags(event: PublicRequestEvent): Promise<TagSummary[]> {
  const client = getPublicClient(event)

  const { data, error } = await client
    .from('tags')
    .select('id,name,slug')
    .order('name')

  if (error) return throwDataApiError(error)
  return data
}

export async function listPublicRssPosts(event: PublicRequestEvent) {
  const client = getPublicClient(event)

  const { data, error } = await client
    .from('posts')
    .select('id,title,slug,summary,published_at')
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(30)

  if (error) return throwDataApiError(error)
  return data.flatMap(post => post.published_at
    ? [{
        title: post.title,
        slug: post.slug,
        summary: post.summary,
        publishedAt: post.published_at,
      }]
    : [])
}

export async function listPublicSitemapEntries(event: PublicRequestEvent) {
  const client = getPublicClient(event)

  const [postsResult, categoriesResult, tagsResult] = await Promise.all([
    client.from('posts').select('id,slug,updated_at').order('published_at', { ascending: false }).order('id', { ascending: false }),
    client.from('categories').select('slug,updated_at').order('name'),
    client.from('tags').select('slug,updated_at').order('name'),
  ])

  const error = postsResult.error ?? categoriesResult.error ?? tagsResult.error
  if (error) return throwDataApiError(error)

  return {
    posts: (postsResult.data ?? []).map(post => ({ slug: post.slug, updatedAt: post.updated_at })),
    categories: (categoriesResult.data ?? []).map(category => ({ slug: category.slug, updatedAt: category.updated_at })),
    tags: (tagsResult.data ?? []).map(tag => ({ slug: tag.slug, updatedAt: tag.updated_at })),
  }
}
