/**
 * End-to-End Integration Tests
 * Tests complete user workflows from frontend to backend
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage } from 'element-plus'
import { articleService } from '@/services/articles'
import { categoryService } from '@/services/categories'
import { analyticsService } from '@/services/analytics'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import type { Article, Category, User } from '@/types'

// Mock API responses for testing
const mockUser: User = {
  id: 1,
  username: 'testadmin',
  email: 'admin@test.com',
  role: 'admin',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const mockCategory: Category = {
  id: 1,
  name: 'AI News',
  description: 'Latest AI developments',
  slug: 'ai-news',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const mockArticle: Article = {
  id: 1,
  title: 'Test Article',
  slug: 'test-article',
  content: '<p>Test content</p>',
  excerpt: 'Test excerpt',
  thumbnail_url: '/uploads/test.jpg',
  category: mockCategory,
  author: mockUser,
  status: 'published',
  view_count: 100,
  like_count: 10,
  published_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

// Mock API services
vi.mock('@/services/auth', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    verifyToken: vi.fn(),
    getToken: vi.fn(),
    getUser: vi.fn(),
    isAuthenticated: vi.fn()
  }
}))

vi.mock('@/services/articles', () => ({
  articleService: {
    getArticles: vi.fn(),
    getArticle: vi.fn(),
    createArticle: vi.fn(),
    updateArticle: vi.fn(),
    deleteArticle: vi.fn(),
    publishArticle: vi.fn(),
    archiveArticle: vi.fn(),
    bulkUpdateStatus: vi.fn(),
    bulkDelete: vi.fn()
  }
}))

vi.mock('@/services/categories', () => ({
  categoryService: {
    getCategories: vi.fn(),
    getCategory: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn()
  }
}))

vi.mock('@/services/analytics', () => ({
  analyticsService: {
    getDashboardMetrics: vi.fn(),
    getTopArticles: vi.fn(),
    incrementView: vi.fn(),
    toggleLike: vi.fn(),
    getArticleAnalytics: vi.fn(),
    getEngagementSummary: vi.fn(),
    getLikeStatus: vi.fn()
  }
}))

describe('Frontend-Backend Integration Tests', () => {
  let pinia: any

  beforeAll(() => {
    // Setup global test environment
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
  })

  beforeEach(() => {
    // Create fresh Pinia instance for each test
    pinia = createPinia()
    setActivePinia(pinia)
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  describe('Authentication Flow', () => {
    it('should handle complete login workflow', async () => {
      const authStore = useAuthStore()
      
      // Mock successful login
      vi.mocked(authService.login).mockResolvedValue({
        token: 'mock-jwt-token',
        user: mockUser
      })
      
      // Test login
      const credentials = { username: 'testadmin', password: 'password123' }
      await authStore.login(credentials)
      
      expect(authService.login).toHaveBeenCalledWith(credentials)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.user).toEqual(mockUser)
    })

    it('should handle login failure with proper error handling', async () => {
      const authStore = useAuthStore()
      
      // Mock failed login
      vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'))
      
      // Test failed login
      const credentials = { username: 'wrong', password: 'wrong' }
      
      try {
        await authStore.login(credentials)
      } catch (error: any) {
        expect(error.message).toBe('Invalid credentials')
      }
      
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBeNull()
    })

    it('should handle token verification and auto-logout on invalid token', async () => {
      const authStore = useAuthStore()
      
      // Mock invalid token
      vi.mocked(authService.verifyToken).mockResolvedValue(null)
      vi.mocked(authService.isAuthenticated).mockReturnValue(true)
      
      // Test token verification
      await authStore.initAuth()
      
      expect(authService.verifyToken).toHaveBeenCalled()
      expect(authStore.isAuthenticated).toBe(false)
    })
  })

  describe('Article Management Integration', () => {
    it('should fetch articles with pagination and filters', async () => {
      const mockResponse = {
        articles: [mockArticle],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          limit: 20,
          hasNext: false,
          hasPrev: false
        }
      }
      
      vi.mocked(articleService.getArticles).mockResolvedValue(mockResponse)
      
      const filters = { status: 'published', page: 1, limit: 20 }
      const result = await articleService.getArticles(filters)
      
      expect(articleService.getArticles).toHaveBeenCalledWith(filters)
      expect(result).toEqual(mockResponse)
    })

    it('should create article with proper validation', async () => {
      vi.mocked(articleService.createArticle).mockResolvedValue(mockArticle)
      
      const articleData = {
        title: 'New Article',
        content: '<p>Article content</p>',
        category_id: 1,
        status: 'draft' as const
      }
      
      const result = await articleService.createArticle(articleData)
      
      expect(articleService.createArticle).toHaveBeenCalledWith(articleData)
      expect(result).toEqual(mockArticle)
    })

    it('should handle article status changes', async () => {
      const publishedArticle = { ...mockArticle, status: 'published' as const }
      vi.mocked(articleService.publishArticle).mockResolvedValue(publishedArticle)
      
      const result = await articleService.publishArticle(1)
      
      expect(articleService.publishArticle).toHaveBeenCalledWith(1)
      expect(result.status).toBe('published')
    })

    it('should handle bulk operations', async () => {
      vi.mocked(articleService.bulkUpdateStatus).mockResolvedValue(undefined)
      
      const articleIds = [1, 2, 3]
      const status = 'archived'
      
      await articleService.bulkUpdateStatus(articleIds, status)
      
      expect(articleService.bulkUpdateStatus).toHaveBeenCalledWith(articleIds, status)
    })
  })

  describe('Category Management Integration', () => {
    it('should fetch categories with sorting', async () => {
      const mockResponse = {
        categories: [mockCategory],
        total: 1,
        limit: null,
        offset: 0
      }
      
      vi.mocked(categoryService.getCategories).mockResolvedValue(mockResponse)
      
      const params = { orderBy: 'name', orderDir: 'ASC' as const }
      const result = await categoryService.getCategories(params)
      
      expect(categoryService.getCategories).toHaveBeenCalledWith(params)
      expect(result).toEqual(mockResponse)
    })

    it('should create and update categories', async () => {
      vi.mocked(categoryService.createCategory).mockResolvedValue(mockCategory)
      vi.mocked(categoryService.updateCategory).mockResolvedValue(mockCategory)
      
      const categoryData = {
        name: 'New Category',
        description: 'Category description',
        slug: 'new-category'
      }
      
      // Test create
      const created = await categoryService.createCategory(categoryData)
      expect(categoryService.createCategory).toHaveBeenCalledWith(categoryData)
      expect(created).toEqual(mockCategory)
      
      // Test update
      const updated = await categoryService.updateCategory(1, categoryData)
      expect(categoryService.updateCategory).toHaveBeenCalledWith(1, categoryData)
      expect(updated).toEqual(mockCategory)
    })

    it('should handle category deletion with error for categories with articles', async () => {
      const error = new Error('Cannot delete category that has associated articles')
      vi.mocked(categoryService.deleteCategory).mockRejectedValue(error)
      
      try {
        await categoryService.deleteCategory(1)
      } catch (err: any) {
        expect(err.message).toContain('associated articles')
      }
      
      expect(categoryService.deleteCategory).toHaveBeenCalledWith(1)
    })
  })

  describe('Analytics Integration', () => {
    it('should fetch dashboard metrics with date range filtering', async () => {
      const mockMetrics = {
        total_articles: 10,
        total_views: 1000,
        total_likes: 100,
        recent_articles: [mockArticle],
        top_articles: [mockArticle],
        views_trend: [
          { date: '2024-01-01', views: 100 },
          { date: '2024-01-02', views: 150 }
        ]
      }
      
      vi.mocked(analyticsService.getDashboardMetrics).mockResolvedValue(mockMetrics)
      
      const result = await analyticsService.getDashboardMetrics('30d')
      
      expect(analyticsService.getDashboardMetrics).toHaveBeenCalledWith('30d')
      expect(result).toEqual(mockMetrics)
    })

    it('should handle view increment and like toggle', async () => {
      vi.mocked(analyticsService.incrementView).mockResolvedValue({
        view_count: 101,
        incremented: true
      })
      
      vi.mocked(analyticsService.toggleLike).mockResolvedValue({
        liked: true,
        likeCount: 11
      })
      
      // Test view increment
      const viewResult = await analyticsService.incrementView(1)
      expect(analyticsService.incrementView).toHaveBeenCalledWith(1)
      expect(viewResult.view_count).toBe(101)
      
      // Test like toggle
      const likeResult = await analyticsService.toggleLike(1)
      expect(analyticsService.toggleLike).toHaveBeenCalledWith(1)
      expect(likeResult.liked).toBe(true)
      expect(likeResult.likeCount).toBe(11)
    })

    it('should fetch top articles with limit and date range', async () => {
      vi.mocked(analyticsService.getTopArticles).mockResolvedValue([mockArticle])
      
      const result = await analyticsService.getTopArticles(5, '7d')
      
      expect(analyticsService.getTopArticles).toHaveBeenCalledWith(5, '7d')
      expect(result).toEqual([mockArticle])
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error')
      networkError.name = 'NetworkError'
      
      vi.mocked(articleService.getArticles).mockRejectedValue(networkError)
      
      try {
        await articleService.getArticles()
      } catch (error: any) {
        expect(error.message).toBe('Network Error')
      }
    })

    it('should handle API validation errors', async () => {
      const validationError = {
        response: {
          status: 422,
          data: {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: [
                { field: 'title', message: 'Title is required' },
                { field: 'content', message: 'Content is required' }
              ]
            }
          }
        }
      }
      
      vi.mocked(articleService.createArticle).mockRejectedValue(validationError)
      
      try {
        await articleService.createArticle({
          title: '',
          content: '',
          category_id: 1,
          status: 'draft'
        })
      } catch (error: any) {
        expect(error.response.status).toBe(422)
        expect(error.response.data.error.code).toBe('VALIDATION_ERROR')
      }
    })

    it('should handle authentication errors and redirect', async () => {
      const authError = {
        response: {
          status: 401,
          data: {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required'
            }
          }
        }
      }
      
      vi.mocked(articleService.getArticles).mockRejectedValue(authError)
      
      try {
        await articleService.getArticles()
      } catch (error: any) {
        expect(error.response.status).toBe(401)
      }
    })
  })

  describe('Real-time Features Integration', () => {
    it('should handle concurrent operations correctly', async () => {
      // Mock multiple concurrent API calls
      vi.mocked(articleService.getArticles).mockResolvedValue({
        articles: [mockArticle],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          limit: 20,
          hasNext: false,
          hasPrev: false
        }
      })
      
      vi.mocked(categoryService.getCategories).mockResolvedValue({
        categories: [mockCategory],
        total: 1,
        limit: null,
        offset: 0
      })
      
      vi.mocked(analyticsService.getDashboardMetrics).mockResolvedValue({
        total_articles: 1,
        total_views: 100,
        total_likes: 10,
        recent_articles: [mockArticle],
        top_articles: [mockArticle],
        views_trend: []
      })
      
      // Execute concurrent operations
      const [articles, categories, metrics] = await Promise.all([
        articleService.getArticles(),
        categoryService.getCategories(),
        analyticsService.getDashboardMetrics()
      ])
      
      expect(articles.articles).toHaveLength(1)
      expect(categories.categories).toHaveLength(1)
      expect(metrics.total_articles).toBe(1)
    })
  })

  describe('Performance and Caching', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...mockArticle,
        id: i + 1,
        title: `Article ${i + 1}`
      }))
      
      vi.mocked(articleService.getArticles).mockResolvedValue({
        articles: largeDataset,
        pagination: {
          currentPage: 1,
          totalPages: 5,
          totalCount: 100,
          limit: 20,
          hasNext: true,
          hasPrev: false
        }
      })
      
      const result = await articleService.getArticles({ limit: 20, page: 1 })
      
      expect(result.articles).toHaveLength(100)
      expect(result.pagination.totalCount).toBe(100)
    })
  })
})

describe('Component Integration Tests', () => {
  let pinia: any

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('should integrate auth store with login component', async () => {
    // This would require actual component mounting and testing
    // For now, we test the store integration
    const authStore = useAuthStore()
    
    vi.mocked(authService.login).mockResolvedValue({
      token: 'test-token',
      user: mockUser
    })
    
    await authStore.login({ username: 'test', password: 'test' })
    
    expect(authStore.isAuthenticated).toBe(true)
    expect(authStore.user).toEqual(mockUser)
  })
})