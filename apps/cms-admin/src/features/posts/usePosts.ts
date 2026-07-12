import { onMounted, shallowRef } from 'vue'
import { listPosts, type AdminPost } from '@/features/content/api'

export function usePosts() {
  const posts = shallowRef<AdminPost[]>([])
  const loading = shallowRef(true)
  const errorMessage = shallowRef('')

  async function refresh() {
    loading.value = true
    errorMessage.value = ''
    try {
      posts.value = await listPosts()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '文章载入失败。'
    } finally {
      loading.value = false
    }
  }

  onMounted(() => void refresh())

  return { posts, loading, errorMessage, refresh }
}
