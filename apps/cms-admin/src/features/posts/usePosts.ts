import { computed, onMounted, onUnmounted, readonly, shallowRef } from 'vue'
import {
  listPosts,
  normalizePostListQuery,
  type AdminPostListItem,
  type PostListQuery,
} from '@/features/content/api'

export type UsePostsOptions = {
  initialQuery?: Partial<PostListQuery>
  immediate?: boolean
}

export type SetPostQueryOptions = {
  load?: boolean
  resetPage?: boolean
}

/**
 * Owns the remote article collection. Views only provide filter transitions and
 * render the exposed readonly state; stale responses can never replace newer data.
 */
export function usePosts(options: UsePostsOptions = {}) {
  const posts = shallowRef<AdminPostListItem[]>([])
  const total = shallowRef(0)
  const query = shallowRef<PostListQuery>(normalizePostListQuery(options.initialQuery))
  const initialLoading = shallowRef(false)
  const refreshing = shallowRef(false)
  const hasLoaded = shallowRef(false)
  const errorMessage = shallowRef('')
  let requestSequence = 0

  const loading = computed(() => initialLoading.value || refreshing.value)
  const page = computed(() => query.value.page)
  const pageSize = computed(() => query.value.pageSize)
  const readonlyPosts = computed(() => posts.value)
  const readonlyQuery = computed(() => query.value)

  async function refresh(patch: Partial<PostListQuery> = {}): Promise<boolean> {
    const requestedQuery = normalizePostListQuery({ ...query.value, ...patch })
    query.value = requestedQuery

    const sequence = ++requestSequence
    const retainsSnapshot = hasLoaded.value
    initialLoading.value = !retainsSnapshot
    refreshing.value = retainsSnapshot
    errorMessage.value = ''

    try {
      const result = await listPosts(requestedQuery)
      if (sequence !== requestSequence) return false

      posts.value = result.items
      total.value = result.total
      query.value = normalizePostListQuery({
        ...requestedQuery,
        page: result.page,
        pageSize: result.pageSize,
      })
      hasLoaded.value = true
      return true
    } catch (error) {
      if (sequence !== requestSequence) return false
      errorMessage.value = error instanceof Error ? error.message : '文章载入失败。'
      return false
    } finally {
      if (sequence === requestSequence) {
        initialLoading.value = false
        refreshing.value = false
      }
    }
  }

  function setQuery(patch: Partial<PostListQuery>, setOptions: SetPostQueryOptions = {}) {
    const nextQuery = normalizePostListQuery({
      ...query.value,
      ...patch,
      page: setOptions.resetPage ? 1 : (patch.page ?? query.value.page),
    })
    query.value = nextQuery
    if (setOptions.load !== false) void refresh()
  }

  onMounted(() => {
    if (options.immediate !== false) void refresh()
  })

  onUnmounted(() => {
    requestSequence += 1
  })

  return {
    posts: readonlyPosts,
    total: readonly(total),
    query: readonlyQuery,
    page,
    pageSize,
    loading,
    initialLoading: readonly(initialLoading),
    refreshing: readonly(refreshing),
    hasLoaded: readonly(hasLoaded),
    errorMessage: readonly(errorMessage),
    refresh,
    setQuery,
  }
}
