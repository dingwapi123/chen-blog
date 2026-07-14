import { flushPromises, shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import PostEditorForm from '@/components/PostEditorForm.vue'
import type { AdminPost } from '@/features/content/api'

const FormStub = defineComponent({
  setup(_props, { expose, slots }) {
    expose({ validate: () => Promise.resolve(true) })
    return () => h('form', {}, slots.default?.())
  },
})

const SlotStub = defineComponent({
  setup(_props, { slots }) {
    return () => h('div', {}, slots.default?.())
  },
})

const ButtonStub = defineComponent({
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('button', {
      disabled: attrs.disabled as boolean | undefined,
      onClick: attrs.onClick as (() => void) | undefined,
    }, slots.default?.())
  },
})

function createPost(status: AdminPost['status']): AdminPost {
  return {
    id: 'post-1',
    title: '当前标题',
    slug: 'current-post',
    summary: '当前摘要',
    content: '# 当前正文',
    status,
    category_id: null,
    cover_media_id: null,
    published_at: status === 'published' ? '2026-07-15T00:00:00.000Z' : null,
    updated_at: '2026-07-15T00:00:00.000Z',
    deleted_at: status === 'archived' ? '2026-07-15T00:00:00.000Z' : null,
    post_tags: [],
  }
}

function mountForm(status: AdminPost['status']) {
  return shallowMount(PostEditorForm, {
    props: {
      post: createPost(status),
      categories: [],
      tags: [],
      media: [],
    },
    global: {
      stubs: {
        ElForm: FormStub,
        ElFormItem: SlotStub,
        ElButton: ButtonStub,
        ElAlert: SlotStub,
        ElInput: true,
        ElSelect: SlotStub,
        ElOption: true,
        ElCheckboxGroup: SlotStub,
        ElCheckbox: SlotStub,
        MarkdownEditor: true,
        MediaPickerDialog: true,
      },
    },
  })
}

describe('PostEditorForm', () => {
  it('requires an explicit action before a published article becomes editable', async () => {
    const wrapper = mountForm('published')
    const draftButton = wrapper.findAll('button').find(button => button.text().includes('转为草稿'))

    expect(draftButton).toBeDefined()
    await draftButton!.trigger('click')
    expect(wrapper.emitted('requestDraft')).toHaveLength(1)
  })

  it('emits the current draft through the save-and-publish contract', async () => {
    const wrapper = mountForm('draft')
    const publishButton = wrapper.findAll('button').find(button => button.text().includes('保存并发布'))

    await publishButton!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('publish')).toEqual([[
      expect.objectContaining({
        title: '当前标题',
        content: '# 当前正文',
        status: 'draft',
      }),
    ]])
  })
})
