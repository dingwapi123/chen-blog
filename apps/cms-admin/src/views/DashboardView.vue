<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@lucide/vue'
import AdminShell from '@/components/AdminShell.vue'
import PostTable from '@/features/posts/PostTable.vue'
import { usePosts } from '@/features/posts/usePosts'
import { archivePost, publishPost } from '@/features/content/api'
import { shallowRef } from 'vue'

const { posts, loading, errorMessage, refresh } = usePosts()
const publishingId = shallowRef<string | null>(null)
const archivingId = shallowRef<string | null>(null)

async function publish(id: string) {
  publishingId.value = id
  try {
    await publishPost(id)
    ElMessage.success('文章已发布。')
    await refresh()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '发布失败。')
  } finally {
    publishingId.value = null
  }
}

async function archive(id: string) {
  try {
    await ElMessageBox.confirm('文章会被归档并从公开页面隐藏，之后仍可在后台保留记录。', '确认软删除？', {
      confirmButtonText: '归档文章',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  archivingId.value = id
  try {
    await archivePost(id)
    ElMessage.success('文章已归档。')
    await refresh()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '归档失败。')
  } finally {
    archivingId.value = null
  }
}
</script>
<template>
  <AdminShell>
    <div class="page-head">
      <div><p class="eyebrow">writing</p><h1 class="page-title">文章</h1></div>
      <RouterLink class="button button--primary" :to="{ name: 'post-new' }"><Plus :size="17" />新建文章</RouterLink>
    </div>
    <ElAlert v-if="errorMessage" :closable="false" :title="errorMessage" type="error" show-icon class="load-error" />
    <PostTable :archiving-id :loading :posts :publishing-id @archive="archive" @publish="publish" />
  </AdminShell>
</template>

<style scoped>
.page-head { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
.load-error { margin-bottom: 1rem; }
</style>
