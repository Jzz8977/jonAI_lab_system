import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authService } from '@/services/auth'
import type { User, LoginCredentials } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Initialize auth state from localStorage and verify token
  const initAuth = async () => {
    loading.value = true
    error.value = null
    
    try {
      if (authService.isAuthenticated()) {
        const userData = await authService.verifyToken()
        if (userData) {
          user.value = userData
          isAuthenticated.value = true
        } else {
          // Token is invalid, clear state
          await logout()
        }
      }
    } catch (err: any) {
      console.warn('Auth initialization failed:', err)
      await logout()
    } finally {
      loading.value = false
    }
  }

  const login = async (credentials: LoginCredentials) => {
    loading.value = true
    error.value = null
    
    try {
      const authData = await authService.login(credentials)
      user.value = authData.user
      isAuthenticated.value = true
      return authData
    } catch (err: any) {
      error.value = err.message || 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true
    error.value = null
    
    try {
      await authService.logout()
    } catch (err: any) {
      console.warn('Logout error:', err)
    } finally {
      user.value = null
      isAuthenticated.value = false
      loading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  // Computed getter for token
  const token = () => authService.getToken()

  // Handle token expiration events
  const handleTokenExpired = async () => {
    await logout()
  }

  // Set up event listeners for token expiration in browser environment
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:token-expired', handleTokenExpired)
  }

  return {
    isAuthenticated,
    user,
    loading,
    error,
    initAuth,
    login,
    logout,
    clearError,
    token
  }
})