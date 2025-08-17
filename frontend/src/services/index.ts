// API service methods for all backend endpoints
import api from './api'
import type { 
  ApiResponse, 
  LoginCredentials, 
  AuthResponse, 
  User
} from '@/types'

// Import specialized services
export { articleService } from './articles'
export { categoryService } from './categories'
export { analyticsService } from './analytics'

// Authentication services
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials)
    return response.data.data!
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  async verifyToken(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/verify')
    return response.data.data!
  }
}

// Note: Article and Category services are now imported from their dedicated files above

// Note: Analytics services are now imported from their dedicated file above

// File upload services
export const uploadService = {
  async uploadThumbnail(file: File): Promise<{
    filename:string, url: string 
}> {
    const formData = new FormData()
    formData.append('thumbnail', file)
    
    const response = await api.post<ApiResponse<{ url: string }>>('/upload/thumbnail', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data.data!
  }
}