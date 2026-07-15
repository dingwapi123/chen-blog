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

const adminPostListColumns = 'id,title,slug,summary,status,category_id,updated_at,published_at,deleted_at,category:categories(id,name,slug)'

function selectAdminPostList(options: { count?: 'exact'; head?: boolean } = {}) {
  return getSupabase()
    .from('posts')
    .select(adminPostListColumns, options)
}

type AdminPostRow = QueryData<ReturnType<typeof selectAdminPost>>[number]
type AdminPostListRow = QueryData<ReturnType<typeof selectAdminPostList>>[number]

export type AdminPost = Omit<AdminPostRow, 'status'> & { status: PostStatus }
export type AdminPostListItem = Omit<AdminPostListRow, 'status'> & { status: PostStatus }

export const POST_LIST_SORTS = [
  'updated-desc',
  'updated-asc',
  'published-desc',
  'title-asc',
  'title-desc',
] as const

export type PostListSort = typeof POST_LIST_SORTS[number]
export type PostListStatus = PostStatus | 'all'

export type PostListQuery = {
  page: number
  pageSize: number
  search: string
  status: PostListStatus
  categoryId: string | null
  sort: PostListSort
}

export type PostListResult = {
  items: AdminPostListItem[]
  total: number
  page: number
  pageSize: number
}

export type DashboardOverview = {
  posts: Record<PostStatus, number> & { total: number }
  media: number
  categories: number
  tags: number
  recentPosts: AdminPostListItem[]
}

export const DEFAULT_POST_LIST_QUERY: Readonly<PostListQuery> = Object.freeze({
  page: 1,
  pageSize: 20,
  search: '',
  status: 'all',
  categoryId: null,
  sort: 'updated-desc',
})

const MAX_POST_LIST_PAGE_SIZE = 100
const MAX_POST_LIST_SEARCH_LENGTH = 100

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, Math.trunc(parsed)))
}

function isPostListStatus(value: unknown): value is PostListStatus {
  return value === 'all' || value === 'draft' || value === 'published' || value === 'archived'
}

function isPostListSort(value: unknown): value is PostListSort {
  return typeof value === 'string' && POST_LIST_SORTS.some(sort => sort === value)
}

/** Normalize all list input before it reaches a PostgREST filter or ordering clause. */
export function normalizePostListQuery(input: Partial<PostListQuery> = {}): PostListQuery {
  const categoryId = typeof input.categoryId === 'string' && input.categoryId.trim()
    ? input.categoryId.trim()
    : null

  return {
    page: boundedInteger(input.page, DEFAULT_POST_LIST_QUERY.page, 1, Number.MAX_SAFE_INTEGER),
    pageSize: boundedInteger(input.pageSize, DEFAULT_POST_LIST_QUERY.pageSize, 1, MAX_POST_LIST_PAGE_SIZE),
    search: typeof input.search === 'string'
      ? input.search.trim().slice(0, MAX_POST_LIST_SEARCH_LENGTH)
      : DEFAULT_POST_LIST_QUERY.search,
    status: isPostListStatus(input.status) ? input.status : DEFAULT_POST_LIST_QUERY.status,
    categoryId,
    sort: isPostListSort(input.sort) ? input.sort : DEFAULT_POST_LIST_QUERY.sort,
  }
}

function routeQueryString(value: unknown) {
  if (Array.isArray(value)) return routeQueryString(value[0])
  return typeof value === 'string' ? value : undefined
}

/** Parse Vue Router-compatible query values without importing the router into the data layer. */
export function parsePostListRouteQuery(input: Readonly<Record<string, unknown>>): PostListQuery {
  return normalizePostListQuery({
    page: Number(routeQueryString(input.page)),
    pageSize: Number(routeQueryString(input.size)),
    search: routeQueryString(input.q),
    status: routeQueryString(input.status) as PostListStatus | undefined,
    categoryId: routeQueryString(input.category),
    sort: routeQueryString(input.sort) as PostListSort | undefined,
  })
}

/** Keep URLs compact by only serializing values that differ from the defaults. */
export function serializePostListRouteQuery(input: Partial<PostListQuery>): Record<string, string> {
  const query = normalizePostListQuery(input)
  const routeQuery: Record<string, string> = {}

  if (query.search) routeQuery.q = query.search
  if (query.status !== DEFAULT_POST_LIST_QUERY.status) routeQuery.status = query.status
  if (query.categoryId) routeQuery.category = query.categoryId
  if (query.sort !== DEFAULT_POST_LIST_QUERY.sort) routeQuery.sort = query.sort
  if (query.page !== DEFAULT_POST_LIST_QUERY.page) routeQuery.page = String(query.page)
  if (query.pageSize !== DEFAULT_POST_LIST_QUERY.pageSize) routeQuery.size = String(query.pageSize)

  return routeQuery
}

export type TaxonomyItem = Pick<Tables<'tags'>, 'id' | 'name' | 'slug'>
  & Partial<Pick<Tables<'categories'>, 'description'>>
  & { usage_count: number }

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

export async function listPosts(input: Partial<PostListQuery> = {}): Promise<PostListResult> {
  const options = normalizePostListQuery(input)
  const from = (options.page - 1) * options.pageSize
  const to = from + options.pageSize - 1
  const query = selectAdminPostList({ count: 'exact' })

  if (options.search) {
    const literalSearch = options.search.replace(/[\\%_]/g, character => `\\${character}`)
    query.ilike('title', `%${literalSearch}%`)
  }
  if (options.status !== 'all') query.eq('status', options.status)
  if (options.categoryId) query.eq('category_id', options.categoryId)

  switch (options.sort) {
    case 'updated-asc':
      query.order('updated_at', { ascending: true }).order('id', { ascending: true })
      break
    case 'published-desc':
      query
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .order('id', { ascending: false })
      break
    case 'title-asc':
      query.order('title', { ascending: true }).order('id', { ascending: true })
      break
    case 'title-desc':
      query.order('title', { ascending: false }).order('id', { ascending: false })
      break
    case 'updated-desc':
      query.order('updated_at', { ascending: false }).order('id', { ascending: false })
      break
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return {
    items: data.map(normalizePostStatus),
    total: count ?? 0,
    page: options.page,
    pageSize: options.pageSize,
  }
}

export async function getDashboardOverview(recentLimit = 6): Promise<DashboardOverview> {
  const safeRecentLimit = boundedInteger(recentLimit, 6, 1, 12)
  const [draftResult, publishedResult, archivedResult, mediaResult, categoryResult, tagResult, recentResult] = await Promise.all([
    getSupabase().from('posts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    getSupabase().from('posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    getSupabase().from('posts').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
    getSupabase().from('media').select('id', { count: 'exact', head: true }),
    getSupabase().from('categories').select('id', { count: 'exact', head: true }),
    getSupabase().from('tags').select('id', { count: 'exact', head: true }),
    selectAdminPostList()
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(safeRecentLimit),
  ])

  const results = [draftResult, publishedResult, archivedResult, mediaResult, categoryResult, tagResult, recentResult]
  const failedResult = results.find(result => result.error)
  if (failedResult?.error) throw failedResult.error

  const draft = draftResult.count ?? 0
  const published = publishedResult.count ?? 0
  const archived = archivedResult.count ?? 0

  return {
    posts: { draft, published, archived, total: draft + published + archived },
    media: mediaResult.count ?? 0,
    categories: categoryResult.count ?? 0,
    tags: tagResult.count ?? 0,
    recentPosts: (recentResult.data ?? []).map(normalizePostStatus),
  }
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
    const { data, error } = await getSupabase()
      .from('posts')
      .update(values)
      .eq('id', postId)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('文章不存在，未保存任何标签变更。')
    postId = data.id
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
  if (deleteError) {
    throw new Error('文章主体已保存，但标签同步失败。', { cause: deleteError })
  }

  if (input.tagIds.length) {
    const { error: tagError } = await getSupabase()
      .from('post_tags')
      .insert(input.tagIds.map(tag_id => ({ post_id: postId, tag_id }) satisfies TablesInsert<'post_tags'>))
    if (tagError) {
      throw new Error('文章主体已保存，但标签同步失败。', { cause: tagError })
    }
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
      .select('id,name,slug,description,posts(count)')
      .order('name')
    if (error) throw error
    return data.map(({ posts, ...item }) => ({
      ...item,
      usage_count: posts[0]?.count ?? 0,
    }))
  }

  const { data, error } = await getSupabase()
    .from('tags')
    .select('id,name,slug,post_tags(count)')
    .order('name')
  if (error) throw error
  return data.map(({ post_tags, ...item }) => ({
    ...item,
    usage_count: post_tags[0]?.count ?? 0,
  }))
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
  const { data, error } = await getSupabase()
    .from(kind)
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('分类或标签不存在，可能已被删除。')
}

export async function listMedia() {
  const { data, error } = await getSupabase()
    .from('media')
    .select('id,bucket_id,object_path,alt_text,mime_type,size_bytes,created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateMediaAltText(id: string, altText: string) {
  const normalizedAltText = altText.trim()
  if (!normalizedAltText) throw new Error('替代文本不能为空。')

  const { data, error } = await getSupabase()
    .from('media')
    .update({ alt_text: normalizedAltText })
    .eq('id', id)
    .select('id,bucket_id,object_path,alt_text,mime_type,size_bytes,created_at')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('媒体不存在或已无法访问。')
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
