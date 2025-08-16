import api from './api'
import type { LoginCredentials, AuthResponse, ApiResponse, User } from '@/types'

export class AuthService {
  private static readonly TOKEN_KEY = 'auth_token'
  private static readonly USER_KEY = 'auth_user'
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token'
  private refreshTimer: number | null = null

  /**
   * Login user with credentials
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials)
      
      if (response.data.success && response.data.data) {
        const authData = response.data.data
        this.setTokens(authData.token, authData.user)
        this.startTokenRefresh()
        return authData
      } else {
        throw new Error(response.data.error?.message || 'Login failed')
      }
    } catch (error: any) {
      throw new Error(error.message || 'Login failed')
    }
  }

  /**
   * Logout user and clear tokens
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error)
    } finally {
      this.clearTokens()
      this.stopTokenRefresh()
    }
  }

  /**
   * Verify current token validity
   */
  async verifyToken(): Promise<User | null> {
    const token = this.getToken()
    if (!token) return null

    try {
      const response = await api.get<ApiResponse<User>>('/auth/verify')
      if (response.data.success && response.data.data) {
        return response.data.data
      }
    } catch (error) {
      console.warn('Token verification failed:', error)
      this.clearTokens()
    }
    return null
  }

  /**
   * Get stored authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(AuthService.TOKEN_KEY)
  }

  /**
   * Get stored user data
   */
  getUser(): User | null {
    const userData = localStorage.getItem(AuthService.USER_KEY)
    if (userData) {
      try {
        return JSON.parse(userData)
      } catch (error) {
        console.warn('Invalid user data in localStorage:', error)
        this.clearTokens()
      }
    }
    return null
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser()
  }

  /**
   * Set authentication tokens and user data
   */
  private setTokens(token: string, user: User): void {
    localStorage.setItem(AuthService.TOKEN_KEY, token)
    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user))
  }

  /**
   * Clear all authentication data
   */
  private clearTokens(): void {
    localStorage.removeItem(AuthService.TOKEN_KEY)
    localStorage.removeItem(AuthService.USER_KEY)
    localStorage.removeItem(AuthService.REFRESH_TOKEN_KEY)
  }

  /**
   * Start automatic token refresh
   */
  private startTokenRefresh(): void {
    // Refresh token every 50 minutes (tokens expire in 1 hour)
    const refreshInterval = 50 * 60 * 1000
    
    this.refreshTimer = window.setInterval(async () => {
      try {
        const user = await this.verifyToken()
        if (!user) {
          this.stopTokenRefresh()
          // Emit event for store to handle logout
          window.dispatchEvent(new CustomEvent('auth:token-expired'))
        }
      } catch (error) {
        console.warn('Token refresh failed:', error)
        this.stopTokenRefresh()
        // Emit event for store to handle logout
        window.dispatchEvent(new CustomEvent('auth:token-expired'))
      }
    }, refreshInterval)
  }

  /**
   * Stop automatic token refresh
   */
  private stopTokenRefresh(): void {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }
}

// Export singleton instance
export const authService = new AuthService()