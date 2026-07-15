import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginView from '@/views/LoginView.vue'

const loginMocks = vi.hoisted(() => ({
  push: vi.fn(),
  query: {} as Record<string, string>,
  signIn: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: loginMocks.query }),
  useRouter: () => ({ push: loginMocks.push }),
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ signIn: loginMocks.signIn }),
}))

const SlotStub = {
  template: '<div><slot /></div>',
}

const AlertStub = {
  props: ['title'],
  template: '<div role="alert">{{ title }}</div>',
}

function mountLogin() {
  return shallowMount(LoginView, {
    global: {
      stubs: {
        ElAlert: AlertStub,
        ElButton: SlotStub,
        ElForm: SlotStub,
        ElFormItem: SlotStub,
        ElInput: true,
        ThemeToggle: true,
      },
    },
  })
}

describe('LoginView feedback', () => {
  beforeEach(() => {
    loginMocks.query = {}
    loginMocks.push.mockResolvedValue(undefined)
    loginMocks.signIn.mockResolvedValue(undefined)
  })

  it('reserves a feedback region without exposing an empty live message', () => {
    const wrapper = mountLogin()
    const feedback = wrapper.get('.login-form__feedback')

    expect(feedback.find('[role="alert"]').exists()).toBe(false)
    expect(feedback.attributes('role')).toBeUndefined()
    expect(feedback.attributes('aria-live')).toBeUndefined()
  })

  it('renders an alert in the reserved region when authentication has expired', () => {
    loginMocks.query = { reason: 'session-expired' }
    const wrapper = mountLogin()
    const alert = wrapper.get('.login-form__feedback [role="alert"]')

    expect(alert.text()).toBe('登录状态已失效，请重新登录。')
  })
})
