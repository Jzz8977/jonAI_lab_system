import axios, { AxiosResponse, AxiosError } from 'axios'
import type { ApiResponse } from '@/types'
import { notificationService } from './notifications'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // Check if response indicates success
    if (response.data && !response.data.success && response.data.error) {
      // API returned error in success response
      const error = new Error(response.data.error.message)
      ;(error as any).response = response
      throw error
    }
    return response
  },
  (error: AxiosError<ApiResponse>) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        notificationService.warning('Session expired. Please log in again.')
        window.location.href = '/login'
      }
    }
    
    // Handle rate limiting
    if (error.response?.status === 429) {
      notificationService.error('Too many requests. Please slow down.')
    }
    
    // Handle server errors
    if (error.response?.status && error.response.status >= 500) {
      notificationService.error('Server error. Please try again later.')
    }
    
    // Transform error to consistent format
    const errorMessage = error.response?.data?.error?.message || 
                        error.message || 
                        'An unexpected error occurred'
    
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      code: error.response?.data?.error?.code,
      data: error.response?.data,
      originalError: error
    })
  }
)

export default api