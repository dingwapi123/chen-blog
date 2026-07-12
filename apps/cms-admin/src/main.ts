import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import { routes } from './router'
import { useAuth } from './composables/useAuth'

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const { initialize, isOwner } = useAuth()
  await initialize()
  if (to.meta.requiresAuth && !isOwner.value) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'login' && isOwner.value) return { name: 'dashboard' }
})

createApp(App).use(router).mount('#app')
