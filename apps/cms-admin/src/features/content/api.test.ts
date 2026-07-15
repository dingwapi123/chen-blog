import type { PostDraftInput } from '@chen-blog/shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSupabase: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: mocks.getSupabase,
  getSupabaseUrl: () => 'https://example.supabase.co',
}))

import {
  deleteTaxonomy,
  getDashboardOverview,
  listPosts,
  listTaxonomy,
  normalizePostListQuery,
  parsePostListRouteQuery,
  savePost,
  serializePostListRouteQuery,
  updateMediaAltText,
} from './api'

const draft: PostDraftInput = {
  title: '安全测试',
  slug: 'security-test',
  summary: '',
  content: '<script>alert(1)</script>',
  categoryId: null,
  coverMediaId: null,
  status: 'draft',
  tagIds: [],
}

const safeDraft: PostDraftInput = {
  ...draft,
  content: '# 合法正文',
}

function createPostListBuilder(result: {
  data: Array<Record<string, unknown>>
  error: Error | null
  count: number | null
}) {
  const builder = {
    ilike: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn().mockResolvedValue(result),
  }
  builder.ilike.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.order.mockReturnValue(builder)
  return builder
}

describe('savePost', () => {
  beforeEach(() => {
    mocks.getSupabase.mockReset()
  })

  it('awaits content validation before starting any database write', async () => {
    await expect(savePost(undefined, draft)).rejects.toThrow('原始 HTML')
    expect(mocks.getSupabase).not.toHaveBeenCalled()
  })

  it('does not rebuild tag relations when an update matched no article', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const select = vi.fn().mockReturnValue({ maybeSingle })
    const eq = vi.fn().mockReturnValue({ select })
    const update = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ update })
    mocks.getSupabase.mockReturnValue({ from })

    await expect(savePost('missing-post', safeDraft)).rejects.toThrow('文章不存在')

    expect(from).toHaveBeenCalledTimes(1)
    expect(from).toHaveBeenCalledWith('posts')
  })

  it('reports a partial save explicitly when tag synchronization fails', async () => {
    const tagError = new Error('tag relation failed')
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'posts') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'post-1' }, error: null }),
                }),
              }),
            }),
          }
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: tagError }),
          }),
        }
      }),
    }
    mocks.getSupabase.mockReturnValue(client)

    await expect(savePost('post-1', safeDraft)).rejects.toThrow('文章主体已保存，但标签同步失败')
  })
})

describe('post list query', () => {
  beforeEach(() => {
    mocks.getSupabase.mockReset()
  })

  it('normalizes and round-trips URL query values without leaking unknown sort fields', () => {
    const parsed = parsePostListRouteQuery({
      page: '3',
      size: '50',
      q: '  Vue 架构  ',
      status: 'draft',
      category: 'category-1',
      sort: 'drop table posts',
    })

    expect(parsed).toEqual({
      page: 3,
      pageSize: 50,
      search: 'Vue 架构',
      status: 'draft',
      categoryId: 'category-1',
      sort: 'updated-desc',
    })
    expect(serializePostListRouteQuery(parsed)).toEqual({
      page: '3',
      size: '50',
      q: 'Vue 架构',
      status: 'draft',
      category: 'category-1',
    })
  })

  it('bounds pagination and falls back to the documented defaults', () => {
    expect(normalizePostListQuery({ page: -10, pageSize: 10_000, status: 'all' })).toMatchObject({
      page: 1,
      pageSize: 100,
      sort: 'updated-desc',
    })
  })

  it('applies exact count, literal title search, filters, stable ordering and range', async () => {
    const row = {
      id: 'post-1',
      title: 'Vue 100% 实践',
      slug: 'vue-practice',
      summary: '',
      status: 'draft',
      category_id: 'category-1',
      updated_at: '2026-07-16T00:00:00.000Z',
      published_at: null,
      deleted_at: null,
      category: { id: 'category-1', name: 'Vue', slug: 'vue' },
    }
    const builder = createPostListBuilder({ data: [row], error: null, count: 41 })
    const select = vi.fn().mockReturnValue(builder)
    const from = vi.fn().mockReturnValue({ select })
    mocks.getSupabase.mockReturnValue({ from })

    const result = await listPosts({
      page: 2,
      pageSize: 20,
      search: '100%',
      status: 'draft',
      categoryId: 'category-1',
      sort: 'title-asc',
    })

    expect(select).toHaveBeenCalledWith(expect.stringContaining('category:categories'), { count: 'exact' })
    expect(builder.ilike).toHaveBeenCalledWith('title', '%100\\%%')
    expect(builder.eq).toHaveBeenCalledWith('status', 'draft')
    expect(builder.eq).toHaveBeenCalledWith('category_id', 'category-1')
    expect(builder.order).toHaveBeenNthCalledWith(1, 'title', { ascending: true })
    expect(builder.order).toHaveBeenNthCalledWith(2, 'id', { ascending: true })
    expect(builder.range).toHaveBeenCalledWith(20, 39)
    expect(result).toEqual({ items: [row], total: 41, page: 2, pageSize: 20 })
  })
})

describe('dashboard overview', () => {
  beforeEach(() => {
    mocks.getSupabase.mockReset()
  })

  it('loads real content inventory counts and a stable recent list', async () => {
    const postCounts = [2, 5, 1]
    let postCountIndex = 0
    const recentRow = {
      id: 'post-1',
      title: '最近更新',
      slug: 'recent',
      summary: '',
      status: 'published',
      category_id: null,
      updated_at: '2026-07-16T00:00:00.000Z',
      published_at: '2026-07-16T00:00:00.000Z',
      deleted_at: null,
      category: null,
    }
    const recentBuilder = {
      order: vi.fn(),
      limit: vi.fn().mockResolvedValue({ data: [recentRow], error: null, count: null }),
    }
    recentBuilder.order.mockReturnValue(recentBuilder)

    const from = vi.fn((table: string) => ({
      select: vi.fn((_columns: string, options?: { head?: boolean }) => {
        if (table === 'posts' && options?.head) {
          const count = postCounts[postCountIndex++]
          return {
            eq: vi.fn().mockResolvedValue({ data: null, error: null, count }),
          }
        }
        if (table === 'posts') return recentBuilder
        const count = { media: 7, categories: 3, tags: 9 }[table as 'media' | 'categories' | 'tags']
        return Promise.resolve({ data: null, error: null, count })
      }),
    }))
    mocks.getSupabase.mockReturnValue({ from })

    await expect(getDashboardOverview(4)).resolves.toEqual({
      posts: { draft: 2, published: 5, archived: 1, total: 8 },
      media: 7,
      categories: 3,
      tags: 9,
      recentPosts: [recentRow],
    })
    expect(recentBuilder.limit).toHaveBeenCalledWith(4)
  })
})

describe('deleteTaxonomy', () => {
  beforeEach(() => {
    mocks.getSupabase.mockReset()
  })

  it('does not report success when no taxonomy row was deleted', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const select = vi.fn().mockReturnValue({ maybeSingle })
    const eq = vi.fn().mockReturnValue({ select })
    const remove = vi.fn().mockReturnValue({ eq })
    mocks.getSupabase.mockReturnValue({ from: vi.fn().mockReturnValue({ delete: remove }) })

    await expect(deleteTaxonomy('tags', 'missing-tag')).rejects.toThrow('可能已被删除')
  })
})

describe('taxonomy and media metadata', () => {
  beforeEach(() => {
    mocks.getSupabase.mockReset()
  })

  it('normalizes relation counts for categories and tags', async () => {
    const from = vi.fn((table: string) => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: table === 'categories'
            ? [{ id: 'category-1', name: '工程', slug: 'engineering', description: '', posts: [{ count: 3 }] }]
            : [{ id: 'tag-1', name: 'Vue', slug: 'vue', post_tags: [{ count: 5 }] }],
          error: null,
        }),
      }),
    }))
    mocks.getSupabase.mockReturnValue({ from })

    await expect(listTaxonomy('categories')).resolves.toEqual([
      { id: 'category-1', name: '工程', slug: 'engineering', description: '', usage_count: 3 },
    ])
    await expect(listTaxonomy('tags')).resolves.toEqual([
      { id: 'tag-1', name: 'Vue', slug: 'vue', usage_count: 5 },
    ])
  })

  it('trims and persists media alternative text with a matched-row check', async () => {
    const updated = {
      id: 'media-1',
      bucket_id: 'post-images',
      object_path: 'media-1.webp',
      alt_text: '新的图片说明',
      mime_type: 'image/webp',
      size_bytes: 1024,
      created_at: '2026-07-16T00:00:00.000Z',
    }
    const maybeSingle = vi.fn().mockResolvedValue({ data: updated, error: null })
    const select = vi.fn().mockReturnValue({ maybeSingle })
    const eq = vi.fn().mockReturnValue({ select })
    const update = vi.fn().mockReturnValue({ eq })
    mocks.getSupabase.mockReturnValue({ from: vi.fn().mockReturnValue({ update }) })

    await expect(updateMediaAltText('media-1', '  新的图片说明  ')).resolves.toEqual(updated)
    expect(update).toHaveBeenCalledWith({ alt_text: '新的图片说明' })
    await expect(updateMediaAltText('media-1', '   ')).rejects.toThrow('替代文本不能为空')
  })
})
