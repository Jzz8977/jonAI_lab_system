import api from './api'
import type { Article, ApiResponse } from '@/types'

export interface ArticleListResponse {
  articles: Article[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ArticleFormData {
  title: string
  content: string
  excerpt?: string
  thumbnail_url?: string
  category_id: number
  status: 'draft' | 'published' | 'archived'
}

export interface ArticleFilters {
  status?: 'draft' | 'published' | 'archived'
  category_id?: number
  author_id?: number
  page?: number
  limit?: number
  orderBy?: string
  orderDir?: 'ASC' | 'DESC'
  search?: string
}

export const articleService = {
  // Get all articles with pagination and filtering
  async getArticles(filters?: ArticleFilters): Promise<ArticleListResponse> {
    const response = await api.get<ApiResponse<ArticleListResponse>>('/articles', { params: filters })
    return response.data.data!
  },

  // Get article by ID
  async getArticle(id: number): Promise<Article> {
    const response = await api.get<ApiResponse<Article>>(`/articles/${id}`)
    return response.data.data!
  },

  // Get article by slug
  async getArticleBySlug(slug: string): Promise<Article> {
    const response = await api.get<ApiResponse<Article>>(`/articles/slug/${slug}`)
    return response.data.data!
  },

  // Create new article
  async createArticle(articleData: ArticleFormData): Promise<Article> {
    const response = await api.post<ApiResponse<Article>>('/articles', articleData)
    return response.data.data!
  },

  // Update existing article
  async updateArticle(id: number, articleData: Partial<ArticleFormData>): Promise<Article> {
    const response = await api.put<ApiResponse<Article>>(`/articles/${id}`, articleData)
    return response.data.data!
  },

  // Publish article
  async publishArticle(id: number): Promise<Article> {
    const response = await api.post<ApiResponse<Article>>(`/articles/${id}/publish`)
    return response.data.data!
  },

  // Archive article
  async archiveArticle(id: number): Promise<Article> {
    const response = await api.post<ApiResponse<Article>>(`/articles/${id}/archive`)
    return response.data.data!
  },

  // Delete article
  async deleteArticle(id: number): Promise<void> {
    await api.delete(`/articles/${id}`)
  },

  // Bulk operations
  async bulkUpdateStatus(articleIds: number[], status: 'draft' | 'published' | 'archived'): Promise<void> {
    const promises = articleIds.map(id => this.updateArticle(id, { status }))
    await Promise.all(promises)
  },

  async bulkDelete(articleIds: number[]): Promise<void> {
    const promises = articleIds.map(id => this.deleteArticle(id))
    await Promise.all(promises)
  }
}