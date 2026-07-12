import type { RouteRecordRaw } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import DashboardView from '@/views/DashboardView.vue'
import PostEditorView from '@/views/PostEditorView.vue'
import TaxonomyView from '@/views/TaxonomyView.vue'
import MediaView from '@/views/MediaView.vue'
import AccountView from '@/views/AccountView.vue'

declare module 'vue-router' { interface RouteMeta { requiresAuth?: boolean; title?: string } }

const protectedMeta = { requiresAuth: true }
export const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: LoginView, meta: { title: '登录' } },
  { path: '/', name: 'dashboard', component: DashboardView, meta: protectedMeta },
  { path: '/posts/new', name: 'post-new', component: PostEditorView, meta: protectedMeta },
  { path: '/posts/:postId', name: 'post-editor', component: PostEditorView, meta: protectedMeta, props: true },
  { path: '/categories', name: 'categories', component: TaxonomyView, meta: protectedMeta, props: { kind: 'categories' } },
  { path: '/tags', name: 'tags', component: TaxonomyView, meta: protectedMeta, props: { kind: 'tags' } },
  { path: '/media', name: 'media', component: MediaView, meta: protectedMeta },
  { path: '/account', name: 'account', component: AccountView, meta: protectedMeta },
]
