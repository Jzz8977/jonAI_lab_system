import api from './api'
import type { Article, DashboardMetrics, ApiResponse } from '@/types'

export interface ArticleAnalytics {
  article_id: number
  view_count: number
  like_count: number
  views_trend: {
    date: string
    views: number
  }[]
  likes_trend: {
    date: string
    likes: number
  }[]
  engagement_rate: number
}

export interface EngagementSummary {
  total_views: number
  total_likes: number
  unique_viewers: number
  engagement_rate: number
  top_performing_days: {
    date: string
    views: number
    likes: number
  }[]
}

export interface LikeToggleResult {
  liked: boolean
  likeCount: number
}

export interface ViewIncrementResult {
  view_count: number
  incremented: boolean
}

export interface LikeStatus {
  article_id: number
  has_liked: boolean
  ip_address: string
}

export const analyticsService = {
  /**
   * Get dashboard metrics with optional date range filtering
   */
  async getDashboardMetrics(dateRange?: '7d' | '30d' | 'all'): Promise<DashboardMetrics> {
    const response = await api.get<ApiResponse<DashboardMetrics>>('/analytics/dashboard', {
      params: dateRange ? { range: dateRange } : undefined
    })
    return response.data.data!
  },

  /**
   * Get top performing articles
   */
  async getTopArticles(limit = 10, dateRange?: '7d' | '30d' | 'all'): Promise<Article[]> {
    const response = await api.get<ApiResponse<{ articles: Article[] }>>('/analytics/articles/top', {
      params: { 
        limit,
        ...(dateRange && { range: dateRange })
      }
    })
    return response.data.data!.articles
  },

  /**
   * Get detailed analytics for a specific article
   */
  async getArticleAnalytics(articleId: number): Promise<ArticleAnalytics> {
    const response = await api.get<ApiResponse<ArticleAnalytics>>(`/analytics/articles/${articleId}`)
    return response.data.data!
  },

  /**
   * Get engagement summary for date range
   */
  async getEngagementSummary(dateRange: '7d' | '30d' = '7d'): Promise<EngagementSummary> {
    const response = await api.get<ApiResponse<EngagementSummary>>('/analytics/engagement', {
      params: { range: dateRange }
    })
    return response.data.data!
  },

  /**
   * Increment view count for an article
   */
  async incrementView(articleId: number): Promise<ViewIncrementResult> {
    const response = await api.post<ApiResponse<ViewIncrementResult>>(`/analytics/articles/${articleId}/view`)
    return response.data.data!
  },

  /**
   * Toggle like status for an article
   */
  async toggleLike(articleId: number): Promise<LikeToggleResult> {
    const response = await api.post<ApiResponse<LikeToggleResult>>(`/analytics/articles/${articleId}/like`)
    return response.data.data!
  },

  /**
   * Check if current user/IP has liked an article
   */
  async getLikeStatus(articleId: number): Promise<LikeStatus> {
    const response = await api.get<ApiResponse<LikeStatus>>(`/analytics/articles/${articleId}/status`)
    return response.data.data!
  }
}