import type { RouteRecordRaw } from 'vue-router'
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    title?: string
    description?: string
  }
}

const protectedMeta = { requiresAuth: true }
export const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: '登录' } },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { ...protectedMeta, title: '概览', description: '内容状态、最近修改与常用操作' },
  },
  {
    path: '/posts',
    name: 'posts',
    component: () => import('@/views/PostsView.vue'),
    meta: { ...protectedMeta, title: '文章', description: '查找、筛选和管理全部文章' },
  },
  {
    path: '/posts/new',
    name: 'post-new',
    component: () => import('@/views/PostEditorView.vue'),
    meta: { ...protectedMeta, title: '新建文章', description: '撰写并发布一篇新文章' },
  },
  {
    path: '/posts/:postId',
    name: 'post-editor',
    component: () => import('@/views/PostEditorView.vue'),
    meta: { ...protectedMeta, title: '编辑文章', description: '编辑内容、归类与发布状态' },
    props: true,
  },
  {
    path: '/categories',
    name: 'categories',
    component: () => import('@/views/TaxonomyView.vue'),
    meta: { ...protectedMeta, title: '分类', description: '维护文章的主要内容分类' },
    props: { kind: 'categories' },
  },
  {
    path: '/tags',
    name: 'tags',
    component: () => import('@/views/TaxonomyView.vue'),
    meta: { ...protectedMeta, title: '标签', description: '维护可复用的文章主题标签' },
    props: { kind: 'tags' },
  },
  {
    path: '/media',
    name: 'media',
    component: () => import('@/views/MediaView.vue'),
    meta: { ...protectedMeta, title: '媒体', description: '上传并复用公开文章图片' },
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('@/views/AccountView.vue'),
    meta: { ...protectedMeta, title: '账户与安全', description: '查看管理员身份并更新登录密码' },
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'dashboard' } },
]
