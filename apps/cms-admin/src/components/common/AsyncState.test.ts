import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AsyncState from './AsyncState.vue'
import StatusBadge from './StatusBadge.vue'

describe('AsyncState', () => {
  it('renders a retry action for request errors', async () => {
    const wrapper = mount(AsyncState, {
      props: { state: 'error', description: '远程请求失败。' },
    })

    expect(wrapper.text()).toContain('远程请求失败。')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('distinguishes filtered empty results from an empty database', async () => {
    const wrapper = mount(AsyncState, {
      props: { state: 'filtered-empty' },
    })

    expect(wrapper.text()).toContain('没有符合条件的结果')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('clearFilters')).toHaveLength(1)
  })

  it('keeps ready data visible while refreshing', () => {
    const wrapper = mount(AsyncState, {
      props: { state: 'ready', refreshing: true },
      slots: { default: '<p>文章数据</p>' },
    })

    expect(wrapper.text()).toContain('文章数据')
    expect(wrapper.text()).toContain('正在刷新数据')
  })
})

describe('StatusBadge', () => {
  it('provides a Chinese label for post status', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'published' } })

    expect(wrapper.text()).toContain('已发布')
    expect(wrapper.classes()).toContain('status-badge--published')
  })
})
