import { afterEach, vi } from 'vitest'
import { config } from '@vue/test-utils'

config.global.stubs = {
  transition: false,
  'transition-group': false,
}

class ResizeObserverStub implements ResizeObserver {
  disconnect = vi.fn()
  observe = vi.fn()
  unobserve = vi.fn()
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub)

afterEach(() => {
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  localStorage.clear()
})
