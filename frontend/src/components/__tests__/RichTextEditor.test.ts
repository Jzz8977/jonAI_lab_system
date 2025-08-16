import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import RichTextEditor from '../RichTextEditor.vue'

// Mock Quill
const mockQuill = {
  root: {
    innerHTML: ''
  },
  on: vi.fn(),
  enable: vi.fn()
}

vi.mock('quill', () => ({
  default: vi.fn(() => mockQuill)
}))

describe('RichTextEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: ''
      }
    })

    expect(wrapper.find('.rich-text-editor').exists()).toBe(true)
    expect(wrapper.find('.editor-container').exists()).toBe(true)
  })

  it('accepts initial content', () => {
    const initialContent = '<p>Initial content</p>'
    
    mount(RichTextEditor, {
      props: {
        modelValue: initialContent
      }
    })

    // Quill should be initialized with the content
    expect(mockQuill.root.innerHTML).toBe(initialContent)
  })

  it('emits update when content changes', async () => {
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: ''
      }
    })

    // Simulate Quill text change
    const changeCallback = mockQuill.on.mock.calls.find(call => call[0] === 'text-change')?.[1]
    
    if (changeCallback) {
      mockQuill.root.innerHTML = '<p>New content</p>'
      changeCallback()
    }

    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['<p>New content</p>'])
  })

  it('handles readonly mode', async () => {
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: '',
        readonly: true
      }
    })

    await wrapper.setProps({ readonly: false })
    expect(mockQuill.enable).toHaveBeenCalledWith(true)

    await wrapper.setProps({ readonly: true })
    expect(mockQuill.enable).toHaveBeenCalledWith(false)
  })

  it('updates content when modelValue changes externally', async () => {
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: '<p>Initial</p>'
      }
    })

    await wrapper.setProps({ modelValue: '<p>Updated</p>' })

    expect(mockQuill.root.innerHTML).toBe('<p>Updated</p>')
  })

  it('uses custom placeholder', () => {
    const customPlaceholder = 'Custom placeholder text'
    
    mount(RichTextEditor, {
      props: {
        modelValue: '',
        placeholder: customPlaceholder
      }
    })

    // Check that Quill was initialized with custom placeholder
    const QuillConstructor = vi.mocked(require('quill').default)
    const initOptions = QuillConstructor.mock.calls[0][1]
    expect(initOptions.placeholder).toBe(customPlaceholder)
  })
})