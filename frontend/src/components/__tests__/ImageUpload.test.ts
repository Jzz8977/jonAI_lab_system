import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ElIcon, ElButton, ElAlert } from 'element-plus'
import ImageUpload from '../ImageUpload.vue'

// Mock FileReader
const mockFileReader = {
  readAsDataURL: vi.fn(),
  result: 'data:image/jpeg;base64,mockdata',
  onload: null as any
}

global.FileReader = vi.fn(() => mockFileReader) as any

describe('ImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders upload placeholder when no image', () => {
    const wrapper = mount(ImageUpload, {
      props: {
        modelValue: null
      },
      global: {
        components: {
          ElIcon,
          ElButton,
          ElAlert
        }
      }
    })

    expect(wrapper.find('.upload-placeholder').exists()).toBe(true)
    expect(wrapper.find('.preview-container').exists()).toBe(false)
    expect(wrapper.text()).toContain('Click to upload or drag and drop')
  })

  it('shows preview when initial URL is provided', async () => {
    const wrapper = mount(ImageUpload, {
      props: {
        modelValue: null,
        initialUrl: 'https://example.com/image.jpg'
      },
      global: {
        components: {
          ElIcon,
          ElButton,
          ElAlert
        }
      }
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.preview-container').exists()).toBe(true)
    expect(wrapper.find('.preview-image').attributes('src')).toBe('https://example.com/image.jpg')
  })

  it('validates file type', async () => {
    const wrapper = mount(ImageUpload, {
      props: {
        modelValue: null
      },
      global: {
        components: {
          ElIcon,
          ElButton,
          ElAlert
        }
      }
    })

    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    
    // Access the component instance to call processFile directly
    const component = wrapper.vm as any
    component.processFile(invalidFile)

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.error-message').exists()).toBe(true)
    expect(wrapper.text()).toContain('Please select a valid image file')
  })

  it('validates file size', async () => {
    const wrapper = mount(ImageUpload, {
      props: {
        modelValue: null,
        maxSize: 1 // 1MB limit
      },
      global: {
        components: {
          ElIcon,
          ElButton,
          ElAlert
        }
      }
    })

    // Create a file larger than 1MB
    const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
    
    const component = wrapper.vm as any
    component.processFile(largeFile)

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.error-message').exists()).toBe(true)
    expect(wrapper.text()).toContain('File size must be less than 1MB')
  })

  it('accepts valid image file', async () => {
    const wrapper = mount(ImageUpload, {
      props: {
        modelValue: null
      },
      global: {
        components: {
          ElIcon,
          ElButton,
          ElAlert
        }
      }
    })

    const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    
    const component = wrapper.vm as any
    component.processFile(validFile)

    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([validFile])
    expect(wrapper.find('.error-message').exists()).toBe(false)
  })

  it('handles file input change', async () => {
    const wrapper = mount(ImageUpload, {
      props: {
        modelValue: null
      },
      global: {
        components: {
          ElIcon,
          ElButton,
          ElAlert
        }
      }
    })

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    const input = wrapper.find('input[type="file"]')
    
    // Mock the files property
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })

    await input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([file])
  })

  it('handles drag and drop', async () => {
    const wrapper = mount(ImageUpload, {
      props: {
        modelValue: null
      },
      global: {
        components: {
          ElIcon,
          ElButton,
          ElAlert
        }
      }
    })

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    const uploadArea = wrapper.find('.upload-area')
    
    // Mock drag event
    const dragEvent = new Event('drop') as any
    dragEvent.dataTransfer = {
      files: [file]
    }

    await uploadArea.trigger('drop', dragEvent)

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([file])
  })

  it('removes image when remove button is clicked', async () => {
    const wrapper = mount(ImageUpload, {
      props: {
        modelValue: null,
        initialUrl: 'https://example.com/image.jpg'
      },
      global: {
        components: {
          ElIcon,
          ElButton,
          ElAlert
        }
      }
    })

    await wrapper.vm.$nextTick()

    // Hover to show overlay
    const previewContainer = wrapper.find('.preview-container')
    await previewContainer.trigger('mouseenter')

    const removeButton = wrapper.findAll('.el-button').find(btn => 
      btn.text().includes('Remove')
    )
    
    if (removeButton) {
      await removeButton.trigger('click')
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null])
    }
  })

  it('triggers file input when upload area is clicked', async () => {
    const wrapper = mount(ImageUpload, {
      props: {
        modelValue: null
      },
      global: {
        components: {
          ElIcon,
          ElButton,
          ElAlert
        }
      }
    })

    const fileInput = wrapper.find('input[type="file"]')
    const clickSpy = vi.spyOn(fileInput.element, 'click')

    const uploadArea = wrapper.find('.upload-area')
    await uploadArea.trigger('click')

    expect(clickSpy).toHaveBeenCalled()
  })
})