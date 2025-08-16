import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ElSelect, ElOption } from 'element-plus'
import CategorySelect from '../CategorySelect.vue'
import { categoryService } from '@/services/categories'
import type { Category } from '@/types'

// Mock the category service
vi.mock('@/services/categories', () => ({
  categoryService: {
    getCategories: vi.fn()
  }
}))

// Mock Element Plus message
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessage: {
      error: vi.fn()
    }
  }
})

const mockCategories: Category[] = [
  {
    id: 1,
    name: 'Technology',
    description: 'Tech related articles',
    slug: 'technology',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Science',
    description: 'Science articles',
    slug: 'science',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    name: 'AI News',
    description: null,
    slug: 'ai-news',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

describe('CategorySelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(categoryService.getCategories).mockResolvedValue({
      categories: mockCategories,
      total: mockCategories.length,
      limit: null,
      offset: 0
    })
  })

  it('renders select component correctly', () => {
    const wrapper = mount(CategorySelect, {
      global: {
        components: {
          ElSelect,
          ElOption
        }
      }
    })

    expect(wrapper.find('.el-select').exists()).toBe(true)
    expect(wrapper.find('.el-select input').attributes('placeholder')).toBe('Select a category')
  })

  it('loads categories on mount', async () => {
    mount(CategorySelect, {
      global: {
        components: {
          ElSelect,
          ElOption
        }
      }
    })

    expect(categoryService.getCategories).toHaveBeenCalledWith({
      orderBy: 'name',
      orderDir: 'ASC'
    })
  })

  it('displays categories as options', async () => {
    const wrapper = mount(CategorySelect, {
      global: {
        components: {
          ElSelect,
          ElOption
        }
      }
    })

    // Wait for categories to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const options = wrapper.findAllComponents(ElOption)
    expect(options).toHaveLength(mockCategories.length)

    // Check first option
    expect(options[0].props('label')).toBe('Technology')
    expect(options[0].props('value')).toBe(1)
  })

  it('displays category descriptions in options', async () => {
    const wrapper = mount(CategorySelect, {
      global: {
        components: {
          ElSelect,
          ElOption
        }
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // Check that category with description shows it
    const optionWithDescription = wrapper.find('.category-description')
    expect(optionWithDescription.exists()).toBe(true)
  })

  it('emits update:modelValue when selection changes', async () => {
    const wrapper = mount(CategorySelect, {
      props: {
        modelValue: null
      },
      global: {
        components: {
          ElSelect,
          ElOption
        }
      }
    })

    await wrapper.vm.$nextTick()

    // Simulate selection change
    const select = wrapper.findComponent(ElSelect)
    await select.vm.$emit('update:modelValue', 1)

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1])
  })

  it('handles disabled state', () => {
    const wrapper = mount(CategorySelect, {
      props: {
        disabled: true
      },
      global: {
        components: {
          ElSelect,
          ElOption
        }
      }
    })

    const select = wrapper.findComponent(ElSelect)
    expect(select.props('disabled')).toBe(true)
  })

  it('shows loading state while fetching categories', () => {
    // Mock a pending promise
    vi.mocked(categoryService.getCategories).mockReturnValue(new Promise(() => {}))

    const wrapper = mount(CategorySelect, {
      global: {
        components: {
          ElSelect,
          ElOption
        }
      }
    })

    const select = wrapper.findComponent(ElSelect)
    expect(select.props('loading')).toBe(true)
  })

  it('handles API error gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(categoryService.getCategories).mockRejectedValue(new Error('API Error'))

    mount(CategorySelect, {
      global: {
        components: {
          ElSelect,
          ElOption
        }
      }
    })

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(consoleError).toHaveBeenCalledWith('Error loading categories:', expect.any(Error))
    consoleError.mockRestore()
  })

  it('exposes refresh method', async () => {
    const wrapper = mount(CategorySelect, {
      global: {
        components: {
          ElSelect,
          ElOption
        }
      }
    })

    // Clear the initial call
    vi.clearAllMocks()

    // Call refresh method
    await wrapper.vm.refresh()

    expect(categoryService.getCategories).toHaveBeenCalledWith({
      orderBy: 'name',
      orderDir: 'ASC'
    })
  })

  it('supports clearable functionality', () => {
    const wrapper = mount(CategorySelect, {
      global: {
        components: {
          ElSelect,
          ElOption
        }
      }
    })

    const select = wrapper.findComponent(ElSelect)
    expect(select.props('clearable')).toBe(true)
  })

  it('supports filterable functionality', () => {
    const wrapper = mount(CategorySelect, {
      global: {
        components: {
          ElSelect,
          ElOption
        }
      }
    })

    const select = wrapper.findComponent(ElSelect)
    expect(select.props('filterable')).toBe(true)
  })
})