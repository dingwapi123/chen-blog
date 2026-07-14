import { flushPromises, shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminShell from '@/components/AdminShell.vue'

const shellMocks = vi.hoisted(() => ({
  push: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: shellMocks.push }),
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ signOut: shellMocks.signOut }),
}))

const RouterLinkStub = defineComponent({
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('a', {
      href: typeof attrs.to === 'string' ? attrs.to : '/',
      onClick: attrs.onClick as (() => void) | undefined,
    }, slots.default?.())
  },
})

describe('AdminShell mobile navigation', () => {
  beforeEach(() => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      media: '(max-width: 760px)',
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })))
  })

  it('keeps the closed drawer inert and restores the trigger after Escape', async () => {
    const wrapper = shallowMount(AdminShell, {
      attachTo: document.body,
      slots: { default: '<p>工作区</p>' },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
          ThemeToggle: true,
        },
      },
    })
    await flushPromises()

    const menuButton = wrapper.get('.mobile-menu')
    expect(menuButton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('.sidebar').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.sidebar').attributes()).toHaveProperty('inert')

    await menuButton.trigger('click')
    await flushPromises()
    expect(menuButton.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('.sidebar').attributes('aria-hidden')).toBeUndefined()
    expect(wrapper.find('.nav-scrim').exists()).toBe(true)
    expect(wrapper.get('.workspace').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.workspace').attributes()).toHaveProperty('inert')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(menuButton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('.workspace').attributes('aria-hidden')).toBeUndefined()
    expect(wrapper.get('.workspace').attributes()).not.toHaveProperty('inert')
    expect(document.activeElement).toBe(menuButton.element)
    wrapper.unmount()
  })
})
