import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ElDialog, ElForm, ElFormItem, ElInput, ElButton } from 'element-plus'
import CategoryForm from '../CategoryForm.vue'
import { categoryService } from '@/services/categories'
import type { Category } from '@/types'

// Mock the category service
vi.mock('@/services/categories', () => ({
  categoryService: {
    createCategory: vi.fn(),
    updateCategory: vi.fn()
  }
}))

// Mock Element Plus message
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn()
    }
  }
})

const mockCategory: Category = {
  id: 1,
  name: 'Test Category',
  description: 'Test description',
  slug: 'test-category',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

describe('CategoryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders create form correctly', () => {
    const wrapper = mount(CategoryForm, {
      props: {
        visible: true
      },
      global: {
        components: {
          ElDialog,
          ElForm,
          ElFormItem,
          ElInput,
          ElButton
        }
      }
    })

    expect(wrapper.find('.el-dialog__title').text()).toBe('Create Category')
    expect(wrapper.find('input[placeholder="Enter category name"]').exists()).toBe(true)
    expect(wrapper.find('textarea[placeholder="Enter category description (optional)"]').exists()).toBe(true)
    expect(wrapper.find('input[placeholder="URL slug (auto-generated if empty)"]').exists()).toBe(true)
  })

  it('renders edit form correctly with category data', async () => {
    const wrapper = mount(CategoryForm, {
      props: {
        visible: true,
        category: mockCategory
      },
      global: {
        components: {
          ElDialog,
          ElForm,
          ElFormItem,
          ElInput,
          ElButton
        }
      }
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.el-dialog__title').text()).toBe('Edit Category')
    
    const nameInput = wrapper.find('input[placeholder="Enter category name"]')
    const descriptionInput = wrapper.find('textarea[placeholder="Enter category description (optional)"]')
    const slugInput = wrapper.find('input[placeholder="URL slug (auto-generated if empty)"]')
    
    expect(nameInput.element.value).toBe(mockCategory.name)
    expect(descriptionInput.element.value).toBe(mockCategory.description)
    expect(slugInput.element.value).toBe(mockCategory.slug)
  })

  it('validates required fields', async () => {
    const wrapper = mount(CategoryForm, {
      props: {
        visible: true
      },
      global: {
        components: {
          ElDialog,
          ElForm,
          ElFormItem,
          ElInput,
          ElButton
        }
      }
    })

    // Try to submit empty form
    const submitButton = wrapper.find('.el-button--primary')
    await submitButton.trigger('click')

    // Should show validation error for required name field
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.el-form-item__error').exists()).toBe(true)
  })

  it('creates new category successfully', async () => {
    const mockCreatedCategory = { ...mockCategory, id: 2 }
    vi.mocked(categoryService.createCategory).mockResolvedValue(mockCreatedCategory)

    const wrapper = mount(CategoryForm, {
      props: {
        visible: true
      },
      global: {
        components: {
          ElDialog,
          ElForm,
          ElFormItem,
          ElInput,
          ElButton
        }
      }
    })

    // Fill form
    const nameInput = wrapper.find('input[placeholder="Enter category name"]')
    const descriptionInput = wrapper.find('textarea[placeholder="Enter category description (optional)"]')
    
    await nameInput.setValue('New Category')
    await descriptionInput.setValue('New description')

    // Submit form
    const submitButton = wrapper.find('.el-button--primary')
    await submitButton.trigger('click')

    await wrapper.vm.$nextTick()

    expect(categoryService.createCategory).toHaveBeenCalledWith({
      name: 'New Category',
      description: 'New description',
      slug: ''
    })
  })

  it('updates existing category successfully', async () => {
    const mockUpdatedCategory = { ...mockCategory, name: 'Updated Category' }
    vi.mocked(categoryService.updateCategory).mockResolvedValue(mockUpdatedCategory)

    const wrapper = mount(CategoryForm, {
      props: {
        visible: true,
        category: mockCategory
      },
      global: {
        components: {
          ElDialog,
          ElForm,
          ElFormItem,
          ElInput,
          ElButton
        }
      }
    })

    await wrapper.vm.$nextTick()

    // Update name
    const nameInput = wrapper.find('input[placeholder="Enter category name"]')
    await nameInput.setValue('Updated Category')

    // Submit form
    const submitButton = wrapper.find('.el-button--primary')
    await submitButton.trigger('click')

    await wrapper.vm.$nextTick()

    expect(categoryService.updateCategory).toHaveBeenCalledWith(mockCategory.id, {
      name: 'Updated Category',
      description: mockCategory.description,
      slug: mockCategory.slug
    })
  })

  it('emits close event when cancel button is clicked', async () => {
    const wrapper = mount(CategoryForm, {
      props: {
        visible: true
      },
      global: {
        components: {
          ElDialog,
          ElForm,
          ElFormItem,
          ElInput,
          ElButton
        }
      }
    })

    const cancelButton = wrapper.find('.el-button:not(.el-button--primary)')
    await cancelButton.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits success event after successful creation', async () => {
    const mockCreatedCategory = { ...mockCategory, id: 2 }
    vi.mocked(categoryService.createCategory).mockResolvedValue(mockCreatedCategory)

    const wrapper = mount(CategoryForm, {
      props: {
        visible: true
      },
      global: {
        components: {
          ElDialog,
          ElForm,
          ElFormItem,
          ElInput,
          ElButton
        }
      }
    })

    // Fill and submit form
    const nameInput = wrapper.find('input[placeholder="Enter category name"]')
    await nameInput.setValue('New Category')

    const submitButton = wrapper.find('.el-button--primary')
    await submitButton.trigger('click')

    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('success')).toBeTruthy()
    expect(wrapper.emitted('success')?.[0]).toEqual([mockCreatedCategory])
  })

  it('validates slug format', async () => {
    const wrapper = mount(CategoryForm, {
      props: {
        visible: true
      },
      global: {
        components: {
          ElDialog,
          ElForm,
          ElFormItem,
          ElInput,
          ElButton
        }
      }
    })

    // Enter invalid slug with uppercase and spaces
    const slugInput = wrapper.find('input[placeholder="URL slug (auto-generated if empty)"]')
    await slugInput.setValue('Invalid Slug!')

    // Trigger validation
    await slugInput.trigger('blur')
    await wrapper.vm.$nextTick()

    // Should show validation error
    expect(wrapper.find('.el-form-item__error').exists()).toBe(true)
  })
})