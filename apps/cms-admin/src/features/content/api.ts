import { assertAllowedContent, getPostImagesPublicUrlPrefix } from '@chen-blog/content-rules'
import type { Tables, TablesInsert } from '@chen-blog/database-types'
import type { PostDraftInput, PostStatus } from '@chen-blog/shared-types'
import type { QueryData } from '@supabase/supabase-js'
import { getSupabase, getSupabaseUrl } from '@/lib/supabase'

function selectAdminPost() {
  return getSupabase()
    .from('posts')
    .select('id,title,slug,summary,content,status,category_id,cover_media_id,published_at,updated_at,deleted_at,post_tags(tag_id)')
}

function selectAdminPostList() {
  return getSupabase()
    .from('posts')
    .select('id,title,slug,summary,status,updated_at,published_at,deleted_at')
}

type AdminPostRow = QueryData<ReturnType<typeof selectAdminPost>>[number]
type AdminPostListRow = QueryData<ReturnType<typeof selectAdminPostList>>[number]

export type AdminPost = Omit<AdminPostRow, 'status'> & { status: PostStatus }
export type AdminPostListItem = Omit<AdminPostListRow, 'status'> & { status: PostStatus }

export type TaxonomyItem = Pick<Tables<'tags'>, 'id' | 'name' | 'slug'>
  & Partial<Pick<Tables<'categories'>, 'description'>>

export type TaxonomyDraft = {
  id?: string
  name: string
  slug: string
  description?: string
}

export type AdminMedia = Pick<
  Tables<'media'>,
  'id' | 'bucket_id' | 'object_path' | 'alt_text' | 'mime_type' | 'size_bytes' | 'created_at'
>

const mediaExtensionByMimeType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

function isPostStatus(status: string): status is PostStatus {
  return status === 'draft' || status === 'published' || status === 'archived'
}

function normalizePostStatus<Row extends { status: string }>(row: Row): Omit<Row, 'status'> & { status: PostStatus } {
  if (!isPostStatus(row.status)) throw new Error(`未知的文章状态：${row.status}`)
  return { ...row, status: row.status }
}

export async function listPosts() {
  const { data, error } = await selectAdminPostList()
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data.map(normalizePostStatus)
}

export async function getPost(id: string) {
  const { data, error } = await selectAdminPost()
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? normalizePostStatus(data) : null
}

export async function savePost(id: string | undefined, input: PostDraftInput) {
  await assertAllowedContent(input.content, {
    allowedImagePrefixes: [getPostImagesPublicUrlPrefix(getSupabaseUrl())],
  })

  const values = {
    title: input.title,
    slug: input.slug,
    summary: input.summary,
    content: input.content,
    category_id: input.categoryId,
    cover_media_id: input.coverMediaId,
    status: input.status,
  } satisfies TablesInsert<'posts'>
  let postId = id

  if (postId) {
    const { error } = await getSupabase().from('posts').update(values).eq('id', postId)
    if (error) throw error
  } else {
    const { data, error } = await getSupabase().from('posts').insert(values).select('id').single()
    if (error) throw error
    postId = data.id
  }
  if (!postId) throw new Error('文章 ID 缺失。')

  const { error: deleteError } = await getSupabase()
    .from('post_tags')
    .delete()
    .eq('post_id', postId)
  if (deleteError) throw deleteError

  if (input.tagIds.length) {
    const { error: tagError } = await getSupabase()
      .from('post_tags')
      .insert(input.tagIds.map(tag_id => ({ post_id: postId, tag_id }) satisfies TablesInsert<'post_tags'>))
    if (tagError) throw tagError
  }

  return postId
}

export async function archivePost(id: string) {
  const { data, error } = await getSupabase()
    .from('posts')
    .update({ status: 'archived', deleted_at: new Date().toISOString() })
    .eq('id', id)
    .neq('status', 'archived')
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('文章不存在或已经归档。')
}

export async function movePostToDraft(id: string) {
  const { data, error } = await getSupabase()
    .from('posts')
    .update({ status: 'draft' })
    .eq('id', id)
    .eq('status', 'published')
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('只有已发布文章可以转回草稿。')
}

export async function publishPost(id: string) {
  const { data: { session } } = await getSupabase().auth.getSession()
  if (!session) throw new Error('登录已失效。')

  const configuredBase = import.meta.env.VITE_BLOG_URL
  if (!configuredBase && import.meta.env.PROD) throw new Error('缺少 VITE_BLOG_URL。')
  const base = (configuredBase || 'http://localhost:3000').replace(/\/$/, '')
  const response = await fetch(`${base}/api/admin/posts/${id}/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { statusMessage?: string } | null
    throw new Error(payload?.statusMessage || '发布失败。')
  }
}

export async function listTaxonomy(kind: 'categories' | 'tags') {
  if (kind === 'categories') {
    const { data, error } = await getSupabase()
      .from('categories')
      .select('id,name,slug,description')
      .order('name')
    if (error) throw error
    return data
  }

  const { data, error } = await getSupabase()
    .from('tags')
    .select('id,name,slug')
    .order('name')
  if (error) throw error
  return data
}

export async function saveTaxonomy(kind: 'categories' | 'tags', item: TaxonomyDraft) {
  if (kind === 'categories') {
    const values = {
      name: item.name,
      slug: item.slug,
      description: item.description ?? '',
    }
    const { error } = item.id
      ? await getSupabase().from('categories').update(values).eq('id', item.id)
      : await getSupabase().from('categories').insert(values)
    if (error) throw error
    return
  }

  const values = { name: item.name, slug: item.slug }
  const { error } = item.id
    ? await getSupabase().from('tags').update(values).eq('id', item.id)
    : await getSupabase().from('tags').insert(values)
  if (error) throw error
}

export async function deleteTaxonomy(kind: 'categories' | 'tags', id: string) {
  const { error } = await getSupabase().from(kind).delete().eq('id', id)
  if (error) throw error
}

export async function listMedia() {
  const { data, error } = await getSupabase()
    .from('media')
    .select('id,bucket_id,object_path,alt_text,mime_type,size_bytes,created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function uploadMedia(file: File, altText: string) {
  const extension = mediaExtensionByMimeType[file.type]
  if (!extension) throw new Error('不支持此图片格式。')

  const path = `${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await getSupabase()
    .storage
    .from('post-images')
    .upload(path, file, { upsert: false, contentType: file.type })
  if (uploadError) throw uploadError

  const { data, error } = await getSupabase()
    .from('media')
    .insert({
      bucket_id: 'post-images',
      object_path: path,
      alt_text: altText,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select('id,bucket_id,object_path,alt_text,mime_type,size_bytes,created_at')
    .single()
  if (error) throw error
  return data
}

export function getPublicImageUrl(media: Pick<AdminMedia, 'bucket_id' | 'object_path'>) {
  return getSupabase()
    .storage
    .from(media.bucket_id)
    .getPublicUrl(media.object_path)
    .data
    .publicUrl
}
