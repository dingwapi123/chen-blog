import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminShell from '@/components/AdminShell.vue'

const shellMocks = vi.hoisted(() => ({
  push: vi.fn(),
  route: {
    fullPath: '/',
    meta: { title: '概览', description: '内容状态与常用操作' },
  },
  signOut: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => shellMocks.route,
  useRouter: () => ({ push: shellMocks.push }),
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    signOut: shellMocks.signOut,
    user: { value: { email: 'owner@example.com' } },
  }),
}))

const RouterLinkStub = defineComponent({
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('a', {
      href: '/',
      onClick: attrs.onClick as (() => void) | undefined,
    }, slots.default?.())
  },
})

describe('AdminShell navigation', () => {
  let mobileViewport = true

  beforeEach(() => {
    mobileViewport = true
    shellMocks.push.mockResolvedValue(undefined)
    shellMocks.signOut.mockResolvedValue(undefined)
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: query.includes('max-width') ? mobileViewport : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })))
  })

  it('keeps the closed mobile drawer inert and restores the trigger after Escape', async () => {
    const wrapper = mount(AdminShell, {
      attachTo: document.body,
      slots: { default: '<p>工作区</p>' },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    const menuButton = wrapper.get('.admin-topbar__menu')
    expect(menuButton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('.admin-sidebar').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.admin-sidebar').attributes()).toHaveProperty('inert')

    await menuButton.trigger('click')
    await flushPromises()
    expect(menuButton.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('.admin-sidebar').attributes('aria-hidden')).toBeUndefined()
    expect(wrapper.find('.admin-shell__scrim').exists()).toBe(true)
    expect(wrapper.get('.admin-shell__workspace').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.admin-shell__workspace').attributes()).toHaveProperty('inert')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(menuButton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('.admin-shell__workspace').attributes('aria-hidden')).toBeUndefined()
    expect(wrapper.get('.admin-shell__workspace').attributes()).not.toHaveProperty('inert')
    expect(document.activeElement).toBe(menuButton.element)
    wrapper.unmount()
  })

  it('persists the desktop icon-rail preference', async () => {
    mobileViewport = false
    const wrapper = mount(AdminShell, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    const collapseButton = wrapper.get('.admin-owner-panel__collapse')
    await collapseButton.trigger('click')

    expect(wrapper.get('.admin-sidebar').classes()).toContain('admin-sidebar--collapsed')
    expect(localStorage.getItem('chen-blog-cms-sidebar-collapsed')).toBe('true')
  })
})
