import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TaxonomyView from '@/views/TaxonomyView.vue'

const apiMocks = vi.hoisted(() => ({
  listTaxonomy: vi.fn(),
  saveTaxonomy: vi.fn(),
  deleteTaxonomy: vi.fn(),
}))

vi.mock('@/features/content/api', () => apiMocks)

describe('TaxonomyView', () => {
  beforeEach(() => {
    apiMocks.listTaxonomy.mockImplementation(async (kind: 'categories' | 'tags') => (
      kind === 'categories'
        ? [{ id: 'category-1', name: '工程实践', slug: 'engineering', description: '分类说明' }]
        : [{ id: 'tag-1', name: 'Vue', slug: 'vue' }]
    ))
  })

  it('reloads and resets visible records when the reused route changes kind', async () => {
    const wrapper = shallowMount(TaxonomyView, {
      props: { kind: 'categories' },
      global: {
        stubs: {
          AdminShell: { template: '<main><slot /></main>' },
        },
      },
    })

    await flushPromises()
    expect(wrapper.text()).toContain('工程实践')
    expect(apiMocks.listTaxonomy).toHaveBeenLastCalledWith('categories')

    await wrapper.setProps({ kind: 'tags' })
    await flushPromises()

    expect(wrapper.text()).toContain('Vue')
    expect(wrapper.text()).not.toContain('工程实践')
    expect(apiMocks.listTaxonomy).toHaveBeenLastCalledWith('tags')
  })
})
