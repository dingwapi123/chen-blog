import type { RouteRecordRaw } from 'vue-router'
declare module 'vue-router' { interface RouteMeta { requiresAuth?: boolean; title?: string } }

const protectedMeta = { requiresAuth: true }
export const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: '登录' } },
  { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: protectedMeta },
  { path: '/posts/new', name: 'post-new', component: () => import('@/views/PostEditorView.vue'), meta: protectedMeta },
  { path: '/posts/:postId', name: 'post-editor', component: () => import('@/views/PostEditorView.vue'), meta: protectedMeta, props: true },
  { path: '/categories', name: 'categories', component: () => import('@/views/TaxonomyView.vue'), meta: protectedMeta, props: { kind: 'categories' } },
  { path: '/tags', name: 'tags', component: () => import('@/views/TaxonomyView.vue'), meta: protectedMeta, props: { kind: 'tags' } },
  { path: '/media', name: 'media', component: () => import('@/views/MediaView.vue'), meta: protectedMeta },
  { path: '/account', name: 'account', component: () => import('@/views/AccountView.vue'), meta: protectedMeta },
]
