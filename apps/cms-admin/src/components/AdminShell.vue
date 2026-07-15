<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import AdminTopbar from '@/components/layout/AdminTopbar.vue'
import { useAuth } from '@/composables/useAuth'

interface SidebarExposed {
  focusFirst: () => void
  getFocusableItems: () => HTMLElement[]
}

interface TopbarExposed {
  focusMenuButton: () => void
}

const route = useRoute()
const router = useRouter()
const { signOut, user } = useAuth()
const sidebar = useTemplateRef<SidebarExposed>('sidebar')
const topbar = useTemplateRef<TopbarExposed>('topbar')
const mainContent = useTemplateRef<HTMLElement>('mainContent')

const menuOpen = shallowRef(false)
const isMobile = shallowRef(false)
const loggingOut = shallowRef(false)
const sidebarCollapsed = shallowRef(false)

const pageTitle = computed(() => typeof route.meta.title === 'string' ? route.meta.title : '内容管理')
const pageDescription = computed(() => typeof route.meta.description === 'string' ? route.meta.description : '')
const blogUrl = import.meta.env.VITE_BLOG_URL || 'http://localhost:3000'

let mediaQuery: MediaQueryList | undefined
let previousBodyOverflow = ''

function updateViewport(event?: MediaQueryListEvent) {
  isMobile.value = event?.matches ?? mediaQuery?.matches ?? false
  if (!isMobile.value) menuOpen.value = false
}

function closeMenu(focusTarget?: 'trigger' | 'main') {
  menuOpen.value = false
  if (focusTarget) {
    void nextTick(() => {
      if (focusTarget === 'trigger') topbar.value?.focusMenuButton()
      else mainContent.value?.focus()
    })
  }
}

function toggleMenu() {
  if (menuOpen.value) {
    closeMenu('trigger')
    return
  }
  menuOpen.value = true
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem('chen-blog-cms-sidebar-collapsed', String(sidebarCollapsed.value))
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (!isMobile.value || !menuOpen.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu('trigger')
    return
  }
  if (event.key !== 'Tab') return

  const focusable = sidebar.value?.getFocusableItems() ?? []
  if (!focusable.length) return
  const first = focusable[0]!
  const last = focusable.at(-1)!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(menuOpen, async (open) => {
  if (!open) {
    document.body.style.overflow = previousBodyOverflow
    return
  }
  if (!isMobile.value) return

  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  await nextTick()
  sidebar.value?.focusFirst()
})

watch(() => route.fullPath, () => {
  if (menuOpen.value) closeMenu('main')
})

onMounted(() => {
  sidebarCollapsed.value = localStorage.getItem('chen-blog-cms-sidebar-collapsed') === 'true'
  mediaQuery = window.matchMedia('(max-width: 820px)')
  updateViewport()
  mediaQuery.addEventListener('change', updateViewport)
  window.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', updateViewport)
  window.removeEventListener('keydown', handleGlobalKeydown)
  document.body.style.overflow = previousBodyOverflow
})

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await signOut()
    await router.push({ name: 'login' })
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '退出登录失败。')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <a class="skip-link" href="#cms-main-content">跳到主要内容</a>
  <div class="admin-shell" :class="{ 'admin-shell--mobile': isMobile }">
    <AdminSidebar
      ref="sidebar"
      :collapsed="sidebarCollapsed"
      :email="user?.email"
      :logging-out="loggingOut"
      :mobile="isMobile"
      :mobile-open="menuOpen"
      @close="closeMenu"
      @logout="logout"
      @toggle-collapse="toggleSidebar"
    />

    <button
      v-if="isMobile && menuOpen"
      class="admin-shell__scrim"
      aria-label="关闭导航菜单"
      tabindex="-1"
      type="button"
      @click="closeMenu('trigger')"
    />

    <div
      class="admin-shell__workspace"
      :aria-hidden="isMobile && menuOpen ? 'true' : undefined"
      :inert="isMobile && menuOpen ? true : undefined"
    >
      <AdminTopbar
        ref="topbar"
        :blog-url="blogUrl"
        :description="pageDescription"
        :mobile="isMobile"
        :mobile-menu-open="menuOpen"
        :title="pageTitle"
        @toggle-menu="toggleMenu"
      />
      <main id="cms-main-content" ref="mainContent" class="admin-shell__main" tabindex="-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  display: grid;
  min-height: 100svh;
  grid-template-columns: auto minmax(0, 1fr);
}

.admin-shell--mobile {
  grid-template-columns: minmax(0, 1fr);
}

.admin-shell__workspace {
  min-width: 0;
}

.admin-shell__main {
  width: 100%;
  min-height: calc(100svh - var(--topbar-height));
  padding: clamp(1.35rem, 3vw, 2.5rem) clamp(1rem, 3vw, 2.5rem) 4rem;
}

.admin-shell__main:focus {
  outline: none;
}

.admin-shell__scrim {
  position: fixed;
  z-index: 25;
  inset: 0;
  border: 0;
  background: var(--scrim);
  backdrop-filter: blur(2px);
}

@media (max-width: 420px) {
  .admin-shell__main {
    padding: 1.1rem 0.75rem 3rem;
  }
}
</style>
