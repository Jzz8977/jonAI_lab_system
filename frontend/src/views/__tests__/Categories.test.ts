import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ElTable, ElButton, ElInput, ElMessageBox } from 'element-plus'
import Categories from '../Categories.vue'
import CategoryForm from '@/components/CategoryForm.vue'
import { categoryService } from '@/services/categories'
import type { Category } from '@/types'

// Mock the category service
vi.mock('@/services/categories', () => ({
  categoryService: {
    getCategories: vi.fn(),
    deleteCategory: vi.fn()
  }
}))

// Mock Element Plus components
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn()
    },
    ElMessageBox: {
      confirm: vi.fn()
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
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  },
  {
    id: 3,
    name: 'AI News',
    description: null,
    slug: 'ai-news',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z'
  }
]

describe('Categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(categoryService.getCategories).mockResolvedValue({
      categories: mockCategories,
      total: mockCategories.length,
      limit: null,
      offset: 0
    })
  })

  it('renders page header correctly', () => {
    const wrapper = mount(Categories, {
      global: {
        components: {
          ElTable,
          ElButton,
          ElInput,
          CategoryForm
        }
      }
    })

    expect(wrapper.find('h1').text()).toBe('Category Management')
    expect(wrapper.find('.header-content p').text()).toBe('Manage article categories and types')
    expect(wrapper.find('.el-button--primary').text()).toContain('Create Category')
  })

  it('loads categories on mount', async () => {
    mount(Categories, {
      global: {
        components: {
          ElTable,
          ElButton,
          ElInput,
          CategoryForm
        }
      }
    })

    expect(categoryService.getCategories).toHaveBeenCalledWith({
      orderBy: 'name',
      orderDir: 'ASC'
    })
  })

  it('displays categories in table', async () => {
    const wrapper = mount(Categories, {
      global: {
        components: {
          ElTable,
          ElButton,
          ElInput,
          CategoryForm
        }
      }
    })

    // Wait for categories to load
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const table = wrapper.findComponent(ElTable)
    expect(table.props('data')).toEqual(mockCategories)
  })

  it('filters categories based on search query', async () => {
    const wrapper = mount(Categories, {
      global: {
        components: {
          ElTable,
          ElButton,
          ElInput,
          CategoryForm
        }
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // Enter search query
    const searchInput = wrapper.find('input[placeholder="Search categories..."]')
    await searchInput.setValue('tech')

    await wrapper.vm.$nextTick()

    // Should filter to only Technology category
    const table = wrapper.findComponent(ElTable)
    const filteredData = table.props('data')
    expect(filteredData).toHaveLength(1)
    expect(filteredData[0].name).toBe('Technology')
  })

  it('opens create form when create button is clicked', async () => {
    const wrapper = mount(Categories, {
      global: {
        components: {
          ElTable,
          ElButton,
          ElInput,
          CategoryForm
        }
      }
    })

    const createButton = wrapper.find('.header-actions .el-button--primary')
    await createButton.trigger('click')

    const categoryForm = wrapper.findComponent(CategoryForm)
    expect(categoryForm.props('visible')).toBe(true)
    expect(categoryForm.props('category')).toBeNull()
  })

  it('opens edit form when edit button is clicked', async () => {
    const wrapper = mount(Categories, {
      global: {
        components: {
          ElTable,
          ElButton,
          ElInput,
          CategoryForm
        }
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // Find and click edit button (assuming it's rendered in table)
    const editButtons = wrapper.findAll('.action-buttons .el-button--primary')
    if (editButtons.length > 0) {
      await editButtons[0].trigger('click')

      const categoryForm = wrapper.findComponent(CategoryForm)
      expect(categoryForm.props('visible')).toBe(true)
      expect(categoryForm.props('category')).toEqual(mockCategories[0])
    }
  })

  it('handles delete confirmation and deletion', async () => {
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')
    vi.mocked(categoryService.deleteCategory).mockResolvedValue(undefined)

    const wrapper = mount(Categories, {
      global: {
        components: {
          ElTable,
          ElButton,
          ElInput,
          CategoryForm
        }
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // Simulate delete button click
    const deleteButtons = wrapper.findAll('.action-buttons .el-button--danger')
    if (deleteButtons.length > 0) {
      await deleteButtons[0].trigger('click')

      expect(ElMessageBox.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to delete the category "Technology"?'),
        'Confirm Delete',
        expect.any(Object)
      )

      await wrapper.vm.$nextTick()
      expect(categoryService.deleteCategory).toHaveBeenCalledWith(1)
    }
  })

  it('handles delete cancellation', async () => {
    vi.mocked(ElMessageBox.confirm).mockRejectedValue('cancel')

    const wrapper = mount(Categories, {
      global: {
        components: {
          ElTable,
          ElButton,
          ElInput,
          CategoryForm
        }
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // Simulate delete button click
    const deleteButtons = wrapper.findAll('.action-buttons .el-button--danger')
    if (deleteButtons.length > 0) {
      await deleteButtons[0].trigger('click')

      await wrapper.vm.$nextTick()
      expect(categoryService.deleteCategory).not.toHaveBeenCalled()
    }
  })

  it('shows empty state when no categories exist', async () => {
    vi.mocked(categoryService.getCategories).mockResolvedValue({
      categories: [],
      total: 0,
      limit: null,
      offset: 0
    })

    const wrapper = mount(Categories, {
      global: {
        components: {
          ElTable,
          ElButton,
          ElInput,
          CategoryForm
        }
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.empty-content h3').text()).toBe('No categories found')
  })

  it('shows empty state for search with no results', async () => {
    const wrapper = mount(Categories, {
      global: {
        components: {
          ElTable,
          ElButton,
          ElInput,
          CategoryForm
        }
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // Search for non-existent category
    const searchInput = wrapper.find('input[placeholder="Search categories..."]')
    await searchInput.setValue('nonexistent')

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.empty-content p').text()).toContain('No categories match your search criteria')
  })

  it('refreshes categories when refresh button is clicked', async () => {
    const wrapper = mount(Categories, {
      global: {
        components: {
          ElTable,
          ElButton,
          ElInput,
          CategoryForm
        }
      }
    })

    // Clear initial call
    vi.clearAllMocks()

    const refreshButton = wrapper.find('.toolbar-right .el-button')
    await refreshButton.trigger('click')

    expect(categoryService.getCategories).toHaveBeenCalledWith({
      orderBy: 'name',
      orderDir: 'ASC'
    })
  })

  it('closes form when form emits close event', async () => {
    const wrapper = mount(Categories, {
      global: {
        components: {
          ElTable,
          ElButton,
          ElInput,
          CategoryForm
        }
      }
    })

    // Open form first
    const createButton = wrapper.find('.header-actions .el-button--primary')
    await createButton.trigger('click')

    expect(wrapper.findComponent(CategoryForm).props('visible')).toBe(true)

    // Emit close event
    const categoryForm = wrapper.findComponent(CategoryForm)
    await categoryForm.vm.$emit('close')

    expect(wrapper.findComponent(CategoryForm).props('visible')).toBe(false)
  })

  it('reloads categories when form emits success event', async () => {
    const wrapper = mount(Categories, {
      global: {
        components: {
          ElTable,
          ElButton,
          ElInput,
          CategoryForm
        }
      }
    })

    // Clear initial call
    vi.clearAllMocks()

    // Open form and emit success
    const createButton = wrapper.find('.header-actions .el-button--primary')
    await createButton.trigger('click')

    const categoryForm = wrapper.findComponent(CategoryForm)
    await categoryForm.vm.$emit('success', mockCategories[0])

    expect(categoryService.getCategories).toHaveBeenCalledWith({
      orderBy: 'name',
      orderDir: 'ASC'
    })
  })

  it('formats dates correctly', () => {
    const wrapper = mount(Categories, {
      global: {
        components: {
          ElTable,
          ElButton,
          ElInput,
          CategoryForm
        }
      }
    })

    const formattedDate = wrapper.vm.formatDate('2024-01-01T00:00:00Z')
    expect(formattedDate).toMatch(/Jan 1, 2024/)
  })
})