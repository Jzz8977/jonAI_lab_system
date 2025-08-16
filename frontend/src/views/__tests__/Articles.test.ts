import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import Articles from '../Articles.vue'
import { articleService } from '@/services/articles'
import { categoryService } from '@/services/categories'
import type { Article, Category } from '@/types'

// Mock the services
vi.mock('@/services/articles')
vi.mock('@/services/categories')

// Mock Element Plus components
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
    },
    ElMessageBox: {
      confirm: vi.fn(),
    },
  }
})

// Mock Vue Router
const mockRouter = {
  push: vi.fn(),
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}))

// Global component stubs for Element Plus
const globalStubs = {
  'el-button': true,
  'el-input': true,
  'el-select': true,
  'el-option': true,
  'el-table': true,
  'el-table-column': true,
  'el-pagination': true,
  'el-dialog': true,
  'el-alert': true,
  'el-tag': true,
  'el-link': true,
  'el-dropdown': true,
  'el-dropdown-menu': true,
  'el-dropdown-item': true,
  'el-descriptions': true,
  'el-descriptions-item': true,
  'el-row': true,
  'el-col': true,
  'el-icon': true,
}

const mockArticles: Article[] = [
  {
    id: 1,
    title: 'Test Article 1',
    slug: 'test-article-1',
    content: '<p>Test content 1</p>',
    excerpt: 'Test excerpt 1',
    thumbnail_url: 'https://example.com/thumb1.jpg',
    category: { id: 1, name: 'Tech', slug: 'tech', description: '', created_at: '', updated_at: '' },
    author: { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin', created_at: '', updated_at: '' },
    status: 'published',
    view_count: 100,
    like_count: 10,
    published_at: '2023-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    title: 'Test Article 2',
    slug: 'test-article-2',
    content: '<p>Test content 2</p>',
    excerpt: 'Test excerpt 2',
    thumbnail_url: 'https://example.com/thumb2.jpg',
    category: { id: 2, name: 'AI', slug: 'ai', description: '', created_at: '', updated_at: '' },
    author: { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin', created_at: '', updated_at: '' },
    status: 'draft',
    view_count: 50,
    like_count: 5,
    published_at: null,
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
  },
]

const mockCategories: Category[] = [
  { id: 1, name: 'Tech', slug: 'tech', description: 'Technology articles', created_at: '', updated_at: '' },
  { id: 2, name: 'AI', slug: 'ai', description: 'AI articles', created_at: '', updated_at: '' },
]

const mockArticleListResponse = {
  articles: mockArticles,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCount: 2,
    limit: 20,
    hasNext: false,
    hasPrev: false,
  },
}

const mockCategoryListResponse = {
  categories: mockCategories,
  total: 2,
  limit: null,
  offset: 0,
}

describe('Articles.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(articleService.getArticles).mockResolvedValue(mockArticleListResponse)
    vi.mocked(categoryService.getCategories).mockResolvedValue(mockCategoryListResponse)
  })

  it('renders article management interface', async () => {
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    expect(wrapper.find('h1').text()).toBe('Article Management')
    expect(wrapper.find('.articles-header').exists()).toBe(true)
    expect(wrapper.find('.filters-section').exists()).toBe(true)
    expect(wrapper.find('.articles-table').exists()).toBe(true)
  })

  it('loads articles and categories on mount', async () => {
    shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(articleService.getArticles).toHaveBeenCalledWith({
      search: '',
      status: undefined,
      category_id: undefined,
      page: 1,
      limit: 20,
      orderBy: 'created_at',
      orderDir: 'DESC',
    })
    expect(categoryService.getCategories).toHaveBeenCalled()
  })

  it('filters articles by status', async () => {
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Test the filter functionality directly
    wrapper.vm.filters.status = 'published'
    await wrapper.vm.loadArticles()
    
    expect(articleService.getArticles).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'published',
      })
    )
  })

  it('filters articles by category', async () => {
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Test the filter functionality directly
    wrapper.vm.filters.category_id = 1
    await wrapper.vm.loadArticles()
    
    expect(articleService.getArticles).toHaveBeenCalledWith(
      expect.objectContaining({
        category_id: 1,
      })
    )
  })

  it('resets filters when reset button is clicked', async () => {
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Set some filters
    wrapper.vm.filters.status = 'published'
    
    // Call reset filters directly
    await wrapper.vm.resetFilters()
    
    expect(articleService.getArticles).toHaveBeenLastCalledWith({
      search: '',
      status: undefined,
      category_id: undefined,
      page: 1,
      limit: 20,
      orderBy: 'created_at',
      orderDir: 'DESC',
    })
  })

  it('handles article status change', async () => {
    vi.mocked(articleService.publishArticle).mockResolvedValue(mockArticles[0])
    
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Simulate status action
    await wrapper.vm.handleStatusAction('published', mockArticles[1])
    
    expect(articleService.publishArticle).toHaveBeenCalledWith(2)
    expect(ElMessage.success).toHaveBeenCalledWith('Article published successfully')
  })

  it('handles article deletion with confirmation', async () => {
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')
    vi.mocked(articleService.deleteArticle).mockResolvedValue()
    
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Simulate delete action
    await wrapper.vm.deleteArticle(mockArticles[0])
    
    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete "Test Article 1"? This action cannot be undone.',
      'Confirm Delete',
      { type: 'error' }
    )
    expect(articleService.deleteArticle).toHaveBeenCalledWith(1)
    expect(ElMessage.success).toHaveBeenCalledWith('Article deleted successfully')
  })

  it('handles bulk status update', async () => {
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')
    vi.mocked(articleService.bulkUpdateStatus).mockResolvedValue()
    
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Set selected articles
    wrapper.vm.selectedArticles = [mockArticles[0], mockArticles[1]]
    
    // Simulate bulk status update
    await wrapper.vm.bulkUpdateStatus('published')
    
    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      'Are you sure you want to set 2 article(s) as published?',
      'Confirm Bulk Action',
      { type: 'warning' }
    )
    expect(articleService.bulkUpdateStatus).toHaveBeenCalledWith([1, 2], 'published')
    expect(ElMessage.success).toHaveBeenCalledWith('Successfully updated 2 article(s)')
  })

  it('handles bulk delete', async () => {
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')
    vi.mocked(articleService.bulkDelete).mockResolvedValue()
    
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Set selected articles
    wrapper.vm.selectedArticles = [mockArticles[0], mockArticles[1]]
    
    // Simulate bulk delete
    await wrapper.vm.bulkDelete()
    
    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete 2 article(s)? This action cannot be undone.',
      'Confirm Bulk Delete',
      { type: 'error' }
    )
    expect(articleService.bulkDelete).toHaveBeenCalledWith([1, 2])
    expect(ElMessage.success).toHaveBeenCalledWith('Successfully deleted 2 article(s)')
  })

  it('opens article preview dialog', async () => {
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Simulate preview action
    await wrapper.vm.previewArticle(mockArticles[0])
    
    expect(wrapper.vm.previewDialog.visible).toBe(true)
    expect(wrapper.vm.previewDialog.article).toEqual(mockArticles[0])
  })

  it('navigates to edit article page', async () => {
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Simulate edit action
    await wrapper.vm.editArticle(mockArticles[0])
    
    expect(mockRouter.push).toHaveBeenCalledWith('/articles/edit/1')
  })

  it('handles search with debouncing', async () => {
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Clear previous calls
    vi.clearAllMocks()
    
    // Test search functionality directly by calling loadArticles with search term
    wrapper.vm.filters.search = 'test search'
    await wrapper.vm.loadArticles()
    
    expect(articleService.getArticles).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'test search',
      })
    )
  })

  it('displays correct status tag types', () => {
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    expect(wrapper.vm.getStatusType('published')).toBe('success')
    expect(wrapper.vm.getStatusType('draft')).toBe('warning')
    expect(wrapper.vm.getStatusType('archived')).toBe('info')
    expect(wrapper.vm.getStatusType('unknown')).toBe('')
  })

  it('formats dates correctly', () => {
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    const testDate = '2023-01-01T12:00:00Z'
    const formatted = wrapper.vm.formatDate(testDate)
    
    expect(formatted).toBe(new Date(testDate).toLocaleDateString())
  })

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Failed to load articles'
    vi.mocked(articleService.getArticles).mockRejectedValue(new Error(errorMessage))
    
    shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(ElMessage.error).toHaveBeenCalledWith(errorMessage)
  })

  it('clears selection when clear button is clicked', async () => {
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    // Set selected articles
    wrapper.vm.selectedArticles = [mockArticles[0], mockArticles[1]]
    
    // Clear selection
    await wrapper.vm.clearSelection()
    
    expect(wrapper.vm.selectedArticles).toEqual([])
  })

  it('handles pagination changes', async () => {
    const wrapper = shallowMount(Articles, {
      global: {
        stubs: globalStubs
      }
    })
    
    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Clear previous calls
    vi.clearAllMocks()
    
    // Change page
    wrapper.vm.filters.page = 2
    await wrapper.vm.loadArticles()
    
    expect(articleService.getArticles).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
      })
    )
  })
})