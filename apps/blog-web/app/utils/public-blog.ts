import { createClient } from '@supabase/supabase-js'
import type { CategorySummary, MediaRecord, PostDetail, PostPreview, TagSummary } from '@chen-blog/shared-types'
import { calculateReadingMinutes } from '@chen-blog/shared-utils'
import { getDemoCategories, getDemoPost, getDemoPosts, getDemoTags } from '~/data/demo'

type RelationRow = { name: string; slug: string }
type TagRelation = { tags: { id: string; name: string; slug: string } | null }
type PublicPostRow = {
  id: string; title: string; slug: string; summary: string; content?: string; published_at: string; updated_at: string
  categories: RelationRow | null; post_tags: TagRelation[]; media: { id: string; bucket_id: string; object_path: string; alt_text: string; created_at: string } | null
}

function getClient() {
  const config = useRuntimeConfig()
  if (!config.public.supabaseUrl || !config.public.supabasePublishableKey) return null
  return createClient(config.public.supabaseUrl, config.public.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function mapPost(row: PublicPostRow): PostPreview {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    category: row.categories,
    tags: row.post_tags.flatMap((relation) => relation.tags ? [relation.tags] : []),
    readingMinutes: calculateReadingMinutes(row.content ?? row.summary),
  }
}

function shouldUseDemo(): boolean { return import.meta.dev && !getClient() }

export function getPublicMediaUrl(media: MediaRecord): string {
  const client = getClient()
  if (!client) return ''
  return client.storage.from(media.bucketId).getPublicUrl(media.objectPath).data.publicUrl
}

export async function fetchPublishedPosts(): Promise<PostPreview[]> {
  const client = getClient()
  if (!client && shouldUseDemo()) return getDemoPosts()
  if (!client) throw createError({ statusCode: 500, statusMessage: 'Supabase public configuration is missing.' })
  const { data, error } = await client.from('posts').select('id,title,slug,summary,content,published_at,updated_at,categories(name,slug),post_tags(tags(id,name,slug)),media:cover_media_id(id,bucket_id,object_path,alt_text,created_at)').order('published_at', { ascending: false })
  if (error) throw createError({ statusCode: 502, statusMessage: error.message })
  return (data as unknown as PublicPostRow[]).map(mapPost)
}

export async function fetchPublishedPost(postSlug: string): Promise<PostDetail | null> {
  const client = getClient()
  if (!client && shouldUseDemo()) return getDemoPost(postSlug)
  if (!client) throw createError({ statusCode: 500, statusMessage: 'Supabase public configuration is missing.' })
  const { data, error } = await client.from('posts').select('id,title,slug,summary,content,published_at,updated_at,categories(name,slug),post_tags(tags(id,name,slug)),media:cover_media_id(id,bucket_id,object_path,alt_text,created_at)').eq('slug', postSlug).maybeSingle()
  if (error) throw createError({ statusCode: 502, statusMessage: error.message })
  if (!data) return null
  const row = data as unknown as PublicPostRow
  return { ...mapPost(row), content: row.content ?? '', cover: row.media ? { id: row.media.id, bucketId: row.media.bucket_id, objectPath: row.media.object_path, altText: row.media.alt_text, createdAt: row.media.created_at } : null }
}

export async function fetchCategories(): Promise<CategorySummary[]> {
  const client = getClient()
  if (!client && shouldUseDemo()) return getDemoCategories()
  if (!client) throw createError({ statusCode: 500, statusMessage: 'Supabase public configuration is missing.' })
  const { data, error } = await client.from('categories').select('id,name,slug,description').order('name')
  if (error) throw createError({ statusCode: 502, statusMessage: error.message })
  return data as CategorySummary[]
}

export async function fetchTags(): Promise<TagSummary[]> {
  const client = getClient()
  if (!client && shouldUseDemo()) return getDemoTags()
  if (!client) throw createError({ statusCode: 500, statusMessage: 'Supabase public configuration is missing.' })
  const { data, error } = await client.from('tags').select('id,name,slug').order('name')
  if (error) throw createError({ statusCode: 502, statusMessage: error.message })
  return data as TagSummary[]
}
