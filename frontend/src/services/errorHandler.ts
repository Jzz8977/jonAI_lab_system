import { notificationService } from './notifications'
import type { AxiosError } from 'axios'
import type { ApiResponse } from '@/types'

export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: any
}

export interface ErrorHandlerOptions {
  showToast?: boolean
  showNotification?: boolean
  customMessage?: string
  logError?: boolean
}

/**
 * Enhanced error handling service for API responses and general errors
 */
export class ErrorHandler {
  /**
   * Handle API errors with consistent formatting and user feedback
   */
  static handleApiError(
    error: AxiosError<ApiResponse> | any, 
    options: ErrorHandlerOptions = {}
  ): ApiError {
    const {
      showToast = true,
      showNotification = false,
      customMessage,
      logError = true
    } = options

    let apiError: ApiError

    // Handle Axios errors
    if (error.response) {
      // Server responded with error status
      const response = error.response
      apiError = {
        message: customMessage || 
                response.data?.error?.message || 
                this.getStatusMessage(response.status),
        code: response.data?.error?.code || `HTTP_${response.status}`,
        status: response.status,
        details: response.data?.error?.details
      }
    } else if (error.request) {
      // Network error
      apiError = {
        message: customMessage || 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0
      }
    } else {
      // Other error
      apiError = {
        message: customMessage || error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR'
      }
    }

    // Log error for debugging
    if (logError) {
      console.error('API Error:', {
        originalError: error,
        processedError: apiError,
        timestamp: new Date().toISOString()
      })
    }

    // Show user feedback
    if (showNotification) {
      notificationService.notify.error('Error', apiError.message)
    } else if (showToast) {
      notificationService.error(apiError.message)
    }

    return apiError
  }

  /**
   * Handle form validation errors
   */
  static handleValidationError(
    errors: Record<string, string[]>,
    options: ErrorHandlerOptions = {}
  ): void {
    const { showToast = true, customMessage } = options

    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('\n')

    const message = customMessage || `Validation failed:\n${errorMessages}`

    if (showToast) {
      notificationService.error(message)
    }
  }

  /**
   * Handle general application errors
   */
  static handleGeneralError(
    error: Error | string,
    options: ErrorHandlerOptions = {}
  ): void {
    const {
      showToast = true,
      showNotification = false,
      customMessage,
      logError = true
    } = options

    const message = customMessage || 
                   (typeof error === 'string' ? error : error.message) ||
                   'An unexpected error occurred'

    if (logError) {
      console.error('General Error:', error)
    }

    if (showNotification) {
      notificationService.notify.error('Error', message)
    } else if (showToast) {
      notificationService.error(message)
    }
  }

  /**
   * Get user-friendly message for HTTP status codes
   */
  private static getStatusMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.'
      case 401:
        return 'Authentication required. Please log in.'
      case 403:
        return 'Access denied. You don\'t have permission for this action.'
      case 404:
        return 'The requested resource was not found.'
      case 409:
        return 'Conflict. The resource already exists or is in use.'
      case 422:
        return 'Invalid data. Please check your input.'
      case 429:
        return 'Too many requests. Please try again later.'
      case 500:
        return 'Server error. Please try again later.'
      case 502:
        return 'Service temporarily unavailable. Please try again later.'
      case 503:
        return 'Service unavailable. Please try again later.'
      default:
        return `Request failed with status ${status}`
    }
  }

  /**
   * Create a wrapper for async operations with error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> {
    try {
      return await operation()
    } catch (error) {
      this.handleApiError(error, options)
      return null
    }
  }

  /**
   * Create a wrapper for async operations that should show loading states
   */
  static async withLoadingAndErrorHandling<T>(
    operation: () => Promise<T>,
    loadingMessage: string = 'Loading...',
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> {
    const loadingToast = notificationService.loading(loadingMessage)
    
    try {
      const result = await operation()
      loadingToast.close()
      return result
    } catch (error) {
      loadingToast.close()
      this.handleApiError(error, options)
      return null
    }
  }
}

// Export convenience functions
export const handleApiError = ErrorHandler.handleApiError.bind(ErrorHandler)
export const handleValidationError = ErrorHandler.handleValidationError.bind(ErrorHandler)
export const handleGeneralError = ErrorHandler.handleGeneralError.bind(ErrorHandler)
export const withErrorHandling = ErrorHandler.withErrorHandling.bind(ErrorHandler)
export const withLoadingAndErrorHandling = ErrorHandler.withLoadingAndErrorHandling.bind(ErrorHandler)