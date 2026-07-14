import { createApp, watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import './style.css'
import App from './App.vue'
import { routes } from './router'
import { useAuth } from './composables/useAuth'

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

const { initialize, isOwner } = useAuth()

router.beforeEach(async (to) => {
  try {
    await initialize()
  } catch {
    if (to.name === 'login') return true
    return { name: 'login', query: { authError: '登录状态校验失败，请重新登录。' } }
  }
  if (to.meta.requiresAuth && !isOwner.value) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'login' && isOwner.value) return { name: 'dashboard' }
  return true
})

router.afterEach((to) => {
  document.title = `${to.meta.title ?? '内容管理'} · Chen Blog CMS`
})

watch(isOwner, (nextOwner, previousOwner) => {
  if (previousOwner && !nextOwner && router.currentRoute.value.meta.requiresAuth) {
    void router.replace({ name: 'login', query: { reason: 'session-expired' } })
  }
})

createApp(App).use(router).mount('#app')
