import type { RouteRecordRaw } from 'vue-router'
declare module 'vue-router' { interface RouteMeta { requiresAuth?: boolean; title?: string } }

const protectedMeta = { requiresAuth: true }
export const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: '登录' } },
  { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { ...protectedMeta, title: '文章' } },
  { path: '/posts/new', name: 'post-new', component: () => import('@/views/PostEditorView.vue'), meta: { ...protectedMeta, title: '新建文章' } },
  { path: '/posts/:postId', name: 'post-editor', component: () => import('@/views/PostEditorView.vue'), meta: { ...protectedMeta, title: '编辑文章' }, props: true },
  { path: '/categories', name: 'categories', component: () => import('@/views/TaxonomyView.vue'), meta: { ...protectedMeta, title: '分类' }, props: { kind: 'categories' } },
  { path: '/tags', name: 'tags', component: () => import('@/views/TaxonomyView.vue'), meta: { ...protectedMeta, title: '标签' }, props: { kind: 'tags' } },
  { path: '/media', name: 'media', component: () => import('@/views/MediaView.vue'), meta: { ...protectedMeta, title: '媒体' } },
  { path: '/account', name: 'account', component: () => import('@/views/AccountView.vue'), meta: { ...protectedMeta, title: '账户' } },
  { path: '/:pathMatch(.*)*', redirect: { name: 'dashboard' } },
]
