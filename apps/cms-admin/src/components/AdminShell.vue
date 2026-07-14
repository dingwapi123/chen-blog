<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { FileText, FolderTree, Image, LogOut, Menu, Tags, UserRound, X } from 'lucide-vue-next'
import { nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const links = [
  { label: '文章', to: '/', icon: FileText },
  { label: '分类', to: '/categories', icon: FolderTree },
  { label: '标签', to: '/tags', icon: Tags },
  { label: '媒体', to: '/media', icon: Image },
  { label: '账户', to: '/account', icon: UserRound },
]

const menuOpen = shallowRef(false)
const isMobile = shallowRef(false)
const loggingOut = shallowRef(false)
const sidebar = useTemplateRef<HTMLElement>('sidebar')
const menuButton = useTemplateRef<HTMLButtonElement>('menuButton')
const router = useRouter()
const { signOut } = useAuth()
let mediaQuery: MediaQueryList | undefined
let previousBodyOverflow = ''

function updateViewport(event?: MediaQueryListEvent) {
  isMobile.value = event?.matches ?? mediaQuery?.matches ?? false
  if (!isMobile.value) menuOpen.value = false
}

function getFocusableItems() {
  return [...(sidebar.value?.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ) ?? [])]
}

function closeMenu(restoreFocus = false) {
  menuOpen.value = false
  if (restoreFocus) void nextTick(() => menuButton.value?.focus())
}

function toggleMenu() {
  if (menuOpen.value) {
    closeMenu()
    return
  }
  menuOpen.value = true
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (!isMobile.value || !menuOpen.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu(true)
    return
  }
  if (event.key !== 'Tab') return

  const focusable = getFocusableItems()
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
  getFocusableItems()[0]?.focus()
})

onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 760px)')
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
  <div class="admin-shell">
    <aside
      id="cms-navigation"
      ref="sidebar"
      class="sidebar"
      :class="{ 'sidebar--open': menuOpen }"
      :aria-hidden="isMobile && !menuOpen ? 'true' : undefined"
      :inert="isMobile && !menuOpen ? true : undefined"
    >
      <RouterLink class="brand" to="/" @click="closeMenu()">
        Chen Blog<span>CMS</span>
      </RouterLink>
      <nav aria-label="CMS 主要导航">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          @click="closeMenu()"
        >
          <component :is="link.icon" :size="18" aria-hidden="true" />
          {{ link.label }}
        </RouterLink>
      </nav>
      <button class="logout" :disabled="loggingOut" type="button" @click="logout">
        <LogOut :size="17" aria-hidden="true" />
        {{ loggingOut ? '正在退出…' : '退出登录' }}
      </button>
    </aside>

    <button
      v-if="isMobile && menuOpen"
      class="nav-scrim"
      aria-label="关闭导航菜单"
      tabindex="-1"
      type="button"
      @click="closeMenu(true)"
    />

    <div
      class="workspace"
      :aria-hidden="isMobile && menuOpen ? 'true' : undefined"
      :inert="isMobile && menuOpen ? true : undefined"
    >
      <header class="topbar">
        <button
          ref="menuButton"
          class="mobile-menu"
          type="button"
          aria-controls="cms-navigation"
          :aria-expanded="menuOpen"
          :aria-label="menuOpen ? '关闭菜单' : '打开菜单'"
          @click="toggleMenu"
        >
          <X v-if="menuOpen" :size="19" aria-hidden="true" />
          <Menu v-else :size="19" aria-hidden="true" />
        </button>
        <span class="topbar__title">内容管理</span>
        <ThemeToggle />
      </header>
      <main class="workspace__main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  display: grid;
  min-height: 100svh;
  grid-template-columns: 14.5rem minmax(0, 1fr);
}

.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  height: 100svh;
  flex-direction: column;
  padding: 1.2rem;
  background: var(--surface-low);
}

.brand {
  margin: 0.2rem 0.35rem 2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.brand span {
  margin-left: 0.4rem;
  color: var(--accent);
  font-size: 0.7rem;
  letter-spacing: 0.09em;
}

.sidebar nav {
  display: grid;
  gap: 0.25rem;
}

.nav-link,
.logout {
  display: flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.7rem;
  border: 0;
  border-radius: 0.45rem;
  background: transparent;
  color: var(--on-surface-muted);
  font-size: 0.9rem;
  text-align: left;
}

.nav-link:hover,
.nav-link.router-link-active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
}

.logout {
  margin-top: auto;
}

.logout:hover {
  color: var(--danger);
}

.workspace {
  min-width: 0;
}

.topbar {
  display: flex;
  min-height: 4rem;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  background: color-mix(in srgb, var(--surface) 90%, transparent);
  backdrop-filter: blur(20px);
}

.topbar__title {
  color: var(--on-surface-muted);
  font-size: 0.86rem;
  font-weight: 700;
}

.workspace__main {
  width: min(100% - 3rem, 78rem);
  margin: 0 auto;
  padding: 2.5rem 0;
}

.mobile-menu {
  display: none;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: var(--on-surface);
}

.nav-scrim {
  position: fixed;
  z-index: 20;
  inset: 0;
  border: 0;
  background: color-mix(in srgb, var(--on-surface) 28%, transparent);
}

@media (max-width: 760px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: fixed;
    z-index: 30;
    width: min(16rem, calc(100vw - 3rem));
    transform: translateX(-101%);
    transition: transform 160ms ease;
  }

  .sidebar--open {
    transform: translateX(0);
    box-shadow: 0 4px 24px color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .topbar {
    position: sticky;
    z-index: 10;
    top: 0;
  }

  .mobile-menu {
    display: grid;
  }

  .workspace__main {
    width: min(100% - 2rem, 78rem);
    padding: 1.75rem 0;
  }
}
</style>
