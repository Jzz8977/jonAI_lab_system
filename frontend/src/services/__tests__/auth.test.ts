import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authService } from '@/services/auth'
import api from '@/services/api'

// Mock the API service
vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock window.setInterval and clearInterval
const mockSetInterval = vi.fn()
const mockClearInterval = vi.fn()
const mockDispatchEvent = vi.fn()
Object.defineProperty(window, 'setInterval', { value: mockSetInterval })
Object.defineProperty(window, 'clearInterval', { value: mockClearInterval })
Object.defineProperty(window, 'dispatchEvent', { value: mockDispatchEvent })

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    mockSetInterval.mockClear()
    mockClearInterval.mockClear()
    mockDispatchEvent.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('login', () => {
    it('successfully logs in user', async () => {
      const credentials = { username: 'testuser', password: 'password123' }
      const mockResponse = {
        data: {
          success: true,
          data: {
            token: 'mock-token',
            user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
          }
        }
      }
      
      api.post = vi.fn().mockResolvedValue(mockResponse)
      
      const result = await authService.login(credentials)
      
      expect(api.post).toHaveBeenCalledWith('/auth/login', credentials)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'mock-token')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_user', JSON.stringify(mockResponse.data.data.user))
      expect(mockSetInterval).toHaveBeenCalled()
      expect(result).toEqual(mockResponse.data.data)
    })

    it('handles login failure', async () => {
      const credentials = { username: 'testuser', password: 'wrongpassword' }
      const errorMessage = 'Invalid credentials'
      
      api.post = vi.fn().mockRejectedValue(new Error(errorMessage))
      
      await expect(authService.login(credentials)).rejects.toThrow(errorMessage)
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
      expect(mockSetInterval).not.toHaveBeenCalled()
    })

    it('handles API response without success flag', async () => {
      const credentials = { username: 'testuser', password: 'password123' }
      const mockResponse = {
        data: {
          success: false,
          error: { message: 'Login failed' }
        }
      }
      
      api.post = vi.fn().mockResolvedValue(mockResponse)
      
      await expect(authService.login(credentials)).rejects.toThrow('Login failed')
    })
  })

  describe('logout', () => {
    it('successfully logs out user', async () => {
      // First login to set up a timer
      const credentials = { username: 'testuser', password: 'password123' }
      const mockResponse = {
        data: {
          success: true,
          data: {
            token: 'mock-token',
            user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
          }
        }
      }
      
      api.post = vi.fn().mockResolvedValue(mockResponse)
      mockSetInterval.mockReturnValue(123) // mock timer id
      
      await authService.login(credentials)
      
      // Now test logout
      api.post = vi.fn().mockResolvedValue({})
      
      await authService.logout()
      
      expect(api.post).toHaveBeenCalledWith('/auth/logout')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
      expect(mockClearInterval).toHaveBeenCalledWith(123)
    })

    it('clears tokens even if API call fails', async () => {
      // First login to set up a timer
      const credentials = { username: 'testuser', password: 'password123' }
      const mockResponse = {
        data: {
          success: true,
          data: {
            token: 'mock-token',
            user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
          }
        }
      }
      
      api.post = vi.fn().mockResolvedValue(mockResponse)
      mockSetInterval.mockReturnValue(456) // mock timer id
      
      await authService.login(credentials)
      
      // Now test logout with API failure
      api.post = vi.fn().mockRejectedValue(new Error('Network error'))
      
      await authService.logout()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
      expect(mockClearInterval).toHaveBeenCalledWith(456)
    })
  })

  describe('verifyToken', () => {
    it('returns user data for valid token', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
      const mockResponse = {
        data: {
          success: true,
          data: mockUser
        }
      }
      
      localStorageMock.getItem.mockReturnValue('mock-token')
      api.get = vi.fn().mockResolvedValue(mockResponse)
      
      const result = await authService.verifyToken()
      
      expect(api.get).toHaveBeenCalledWith('/auth/verify')
      expect(result).toEqual(mockUser)
    })

    it('returns null when no token exists', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const result = await authService.verifyToken()
      
      expect(api.get).not.toHaveBeenCalled()
      expect(result).toBe(null)
    })

    it('clears tokens and returns null for invalid token', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token')
      api.get = vi.fn().mockRejectedValue(new Error('Unauthorized'))
      
      const result = await authService.verifyToken()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
      expect(result).toBe(null)
    })
  })

  describe('getToken', () => {
    it('returns stored token', () => {
      const mockToken = 'mock-token'
      localStorageMock.getItem.mockReturnValue(mockToken)
      
      const result = authService.getToken()
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token')
      expect(result).toBe(mockToken)
    })

    it('returns null when no token exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const result = authService.getToken()
      
      expect(result).toBe(null)
    })
  })

  describe('getUser', () => {
    it('returns parsed user data', () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser))
      
      const result = authService.getUser()
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_user')
      expect(result).toEqual(mockUser)
    })

    it('returns null when no user data exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const result = authService.getUser()
      
      expect(result).toBe(null)
    })

    it('clears tokens and returns null for invalid JSON', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')
      
      const result = authService.getUser()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
      expect(result).toBe(null)
    })
  })

  describe('isAuthenticated', () => {
    it('returns true when token and user exist', () => {
      localStorageMock.getItem
        .mockReturnValueOnce('mock-token')
        .mockReturnValueOnce(JSON.stringify({ id: 1, username: 'testuser' }))
      
      const result = authService.isAuthenticated()
      
      expect(result).toBe(true)
    })

    it('returns false when token is missing', () => {
      localStorageMock.getItem
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(JSON.stringify({ id: 1, username: 'testuser' }))
      
      const result = authService.isAuthenticated()
      
      expect(result).toBe(false)
    })

    it('returns false when user data is missing', () => {
      localStorageMock.getItem
        .mockReturnValueOnce('mock-token')
        .mockReturnValueOnce(null)
      
      const result = authService.isAuthenticated()
      
      expect(result).toBe(false)
    })
  })

  describe('token refresh', () => {
    it('starts token refresh timer on login', async () => {
      const credentials = { username: 'testuser', password: 'password123' }
      const mockResponse = {
        data: {
          success: true,
          data: {
            token: 'mock-token',
            user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
          }
        }
      }
      
      api.post = vi.fn().mockResolvedValue(mockResponse)
      
      await authService.login(credentials)
      
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 50 * 60 * 1000)
    })

    it('stops token refresh timer on logout', async () => {
      // First login to set up a timer
      const credentials = { username: 'testuser', password: 'password123' }
      const mockResponse = {
        data: {
          success: true,
          data: {
            token: 'mock-token',
            user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
          }
        }
      }
      
      api.post = vi.fn().mockResolvedValue(mockResponse)
      mockSetInterval.mockReturnValue(789) // mock timer id
      
      await authService.login(credentials)
      
      // Now test logout
      api.post = vi.fn().mockResolvedValue({})
      
      await authService.logout()
      
      expect(mockClearInterval).toHaveBeenCalledWith(789)
    })

    it('dispatches token expired event when token verification fails', async () => {
      const credentials = { username: 'testuser', password: 'password123' }
      const mockResponse = {
        data: {
          success: true,
          data: {
            token: 'mock-token',
            user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
          }
        }
      }
      
      api.post = vi.fn().mockResolvedValue(mockResponse)
      
      // Mock setInterval to capture the callback
      let refreshCallback: Function | undefined
      mockSetInterval.mockImplementation((callback: Function) => {
        refreshCallback = callback
        return 123 // mock timer id
      })
      
      await authService.login(credentials)
      
      // Mock verifyToken to return null (token expired)
      authService.verifyToken = vi.fn().mockResolvedValue(null)
      
      // Execute the refresh callback
      if (refreshCallback) {
        await refreshCallback()
      }
      
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth:token-expired'
        })
      )
    })

    it('dispatches token expired event when token verification throws error', async () => {
      const credentials = { username: 'testuser', password: 'password123' }
      const mockResponse = {
        data: {
          success: true,
          data: {
            token: 'mock-token',
            user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
          }
        }
      }
      
      api.post = vi.fn().mockResolvedValue(mockResponse)
      
      // Mock setInterval to capture the callback
      let refreshCallback: Function | undefined
      mockSetInterval.mockImplementation((callback: Function) => {
        refreshCallback = callback
        return 123 // mock timer id
      })
      
      await authService.login(credentials)
      
      // Mock verifyToken to throw error
      authService.verifyToken = vi.fn().mockRejectedValue(new Error('Network error'))
      
      // Execute the refresh callback
      if (refreshCallback) {
        await refreshCallback()
      }
      
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth:token-expired'
        })
      )
    })
  })
})