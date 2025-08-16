import api from './api'
import type { Category, ApiResponse } from '@/types'

export interface CategoryListResponse {
  categories: Category[]
  total: number
  limit: number | null
  offset: number
}

export interface CategoryFormData {
  name: string
  description?: string
  slug?: string
}

export const categoryService = {
  // Get all categories with optional pagination and sorting
  async getCategories(params?: {
    limit?: number
    offset?: number
    orderBy?: string
    orderDir?: 'ASC' | 'DESC'
  }): Promise<CategoryListResponse> {
    const response = await api.get<ApiResponse<CategoryListResponse>>('/categories', { params })
    return response.data.data!
  },

  // Get category by ID
  async getCategory(id: number): Promise<Category> {
    const response = await api.get<ApiResponse<Category>>(`/categories/${id}`)
    return response.data.data!
  },

  // Create new category
  async createCategory(categoryData: CategoryFormData): Promise<Category> {
    const response = await api.post<ApiResponse<Category>>('/categories', categoryData)
    return response.data.data!
  },

  // Update existing category
  async updateCategory(id: number, categoryData: CategoryFormData): Promise<Category> {
    const response = await api.put<ApiResponse<Category>>(`/categories/${id}`, categoryData)
    return response.data.data!
  },

  // Delete category
  async deleteCategory(id: number): Promise<void> {
    await api.delete(`/categories/${id}`)
  }
}