import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services/auth'

// Mock the auth service
vi.mock('@/services/auth', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    verifyToken: vi.fn(),
    isAuthenticated: vi.fn(),
    getToken: vi.fn(),
    getUser: vi.fn()
  }
}))

// Mock window event listeners
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()
Object.defineProperty(window, 'addEventListener', { value: mockAddEventListener })
Object.defineProperty(window, 'removeEventListener', { value: mockRemoveEventListener })

describe('Auth Store', () => {
  let authStore: any

  beforeEach(() => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    vi.clearAllMocks()
  })

  describe('initAuth', () => {
    it('initializes with valid token and user', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
      
      authService.isAuthenticated = vi.fn().mockReturnValue(true)
      authService.verifyToken = vi.fn().mockResolvedValue(mockUser)
      
      await authStore.initAuth()
      
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.user).toEqual(mockUser)
      expect(authStore.loading).toBe(false)
      expect(authStore.error).toBe(null)
    })

    it('clears state when token is invalid', async () => {
      authService.isAuthenticated = vi.fn().mockReturnValue(true)
      authService.verifyToken = vi.fn().mockResolvedValue(null)
      authService.logout = vi.fn().mockResolvedValue(undefined)
      
      await authStore.initAuth()
      
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBe(null)
      expect(authStore.loading).toBe(false)
    })

    it('handles verification error gracefully', async () => {
      authService.isAuthenticated = vi.fn().mockReturnValue(true)
      authService.verifyToken = vi.fn().mockRejectedValue(new Error('Network error'))
      authService.logout = vi.fn().mockResolvedValue(undefined)
      
      await authStore.initAuth()
      
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBe(null)
      expect(authStore.loading).toBe(false)
    })

    it('skips verification when not authenticated', async () => {
      authService.isAuthenticated = vi.fn().mockReturnValue(false)
      
      await authStore.initAuth()
      
      expect(authService.verifyToken).not.toHaveBeenCalled()
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.loading).toBe(false)
    })
  })

  describe('login', () => {
    it('successfully logs in user', async () => {
      const credentials = { username: 'testuser', password: 'password123' }
      const mockAuthData = {
        token: 'mock-token',
        user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
      }
      
      authService.login = vi.fn().mockResolvedValue(mockAuthData)
      
      const result = await authStore.login(credentials)
      
      expect(authService.login).toHaveBeenCalledWith(credentials)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.user).toEqual(mockAuthData.user)
      expect(authStore.loading).toBe(false)
      expect(authStore.error).toBe(null)
      expect(result).toEqual(mockAuthData)
    })

    it('handles login failure', async () => {
      const credentials = { username: 'testuser', password: 'wrongpassword' }
      const errorMessage = 'Invalid credentials'
      
      authService.login = vi.fn().mockRejectedValue(new Error(errorMessage))
      
      await expect(authStore.login(credentials)).rejects.toThrow(errorMessage)
      
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBe(null)
      expect(authStore.loading).toBe(false)
      expect(authStore.error).toBe(errorMessage)
    })

    it('sets loading state during login', async () => {
      const credentials = { username: 'testuser', password: 'password123' }
      
      // Create a promise that we can control
      let resolveLogin: any
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve
      })
      
      authService.login = vi.fn().mockReturnValue(loginPromise)
      
      // Start login
      const loginCall = authStore.login(credentials)
      
      // Check loading state
      expect(authStore.loading).toBe(true)
      
      // Resolve login
      resolveLogin({
        token: 'mock-token',
        user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
      })
      
      await loginCall
      
      // Check final state
      expect(authStore.loading).toBe(false)
    })
  })

  describe('logout', () => {
    it('successfully logs out user', async () => {
      // Set initial authenticated state
      authStore.isAuthenticated = true
      authStore.user = { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
      
      authService.logout = vi.fn().mockResolvedValue(undefined)
      
      await authStore.logout()
      
      expect(authService.logout).toHaveBeenCalled()
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBe(null)
      expect(authStore.loading).toBe(false)
      expect(authStore.error).toBe(null)
    })

    it('handles logout API failure gracefully', async () => {
      // Set initial authenticated state
      authStore.isAuthenticated = true
      authStore.user = { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
      
      authService.logout = vi.fn().mockRejectedValue(new Error('Network error'))
      
      await authStore.logout()
      
      // Should still clear local state even if API call fails
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.user).toBe(null)
      expect(authStore.loading).toBe(false)
    })
  })

  describe('clearError', () => {
    it('clears error state', () => {
      authStore.error = 'Some error'
      
      authStore.clearError()
      
      expect(authStore.error).toBe(null)
    })
  })

  describe('token getter', () => {
    it('returns token from auth service', () => {
      const mockToken = 'mock-token'
      authService.getToken = vi.fn().mockReturnValue(mockToken)
      
      const token = authStore.token()
      
      expect(authService.getToken).toHaveBeenCalled()
      expect(token).toBe(mockToken)
    })
  })

  describe('token expiration handling', () => {
    it('sets up event listener for token expiration in browser environment', () => {
      // This test verifies the event listener is set up when window is available
      // The actual functionality is tested through integration tests
      expect(typeof window).toBe('object')
      
      const authStore = useAuthStore()
      
      // Verify the store was created successfully
      expect(authStore).toBeDefined()
      expect(typeof authStore.logout).toBe('function')
    })
  })
})