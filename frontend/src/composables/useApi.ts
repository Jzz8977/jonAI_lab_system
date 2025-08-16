// Enhanced composable for handling API calls with loading states and error handling
import { ref, type Ref, computed } from 'vue'
import { notificationService } from '@/services/notifications'
import { handleApiError } from '@/services/errorHandler'
import type { ApiError } from '@/services/errorHandler'

interface UseApiOptions {
  showSuccessMessage?: boolean
  showErrorMessage?: boolean
  successMessage?: string
  loadingMessage?: string
  immediate?: boolean
  resetOnExecute?: boolean
}

export function useApi<T = any, Args extends any[] = any[]>(
  apiCall: (...args: Args) => Promise<T>,
  options: UseApiOptions = {}
) {
  const {
    showSuccessMessage = false,
    showErrorMessage = true,
    successMessage = 'Operation completed successfully',
    loadingMessage,
    immediate = false,
    resetOnExecute = true
  } = options

  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  const data = ref<T | null>(null) as Ref<T | null>
  const hasExecuted = ref(false)

  // Computed properties for better state management
  const isIdle = computed(() => !loading.value && !hasExecuted.value)
  const isSuccess = computed(() => !loading.value && hasExecuted.value && !error.value && data.value !== null)
  const isError = computed(() => !loading.value && hasExecuted.value && error.value !== null)

  const execute = async (...args: Args): Promise<T | null> => {
    try {
      loading.value = true
      if (resetOnExecute) {
        error.value = null
      }
      
      // Show loading message if provided
      let loadingToast: any = null
      if (loadingMessage) {
        loadingToast = notificationService.loading(loadingMessage)
      }
      
      const result = await apiCall(...args)
      data.value = result
      hasExecuted.value = true
      
      // Close loading toast
      if (loadingToast) {
        loadingToast.close()
      }
      
      if (showSuccessMessage) {
        notificationService.success(successMessage)
      }
      
      return result
    } catch (err: any) {
      hasExecuted.value = true
      const apiError = handleApiError(err, { 
        showToast: showErrorMessage,
        logError: true 
      })
      error.value = apiError
      
      return null
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    loading.value = false
    error.value = null
    data.value = null
    hasExecuted.value = false
  }

  const retry = async (...args: Args): Promise<T | null> => {
    return execute(...args)
  }

  // Execute immediately if requested
  if (immediate) {
    execute(...([] as any) as Args)
  }

  return {
    loading,
    error,
    data,
    hasExecuted,
    isIdle,
    isSuccess,
    isError,
    execute,
    retry,
    reset
  }
}

// Specialized composable for form submissions
export function useFormSubmit<T = any>(
  submitFn: (data: any) => Promise<T>,
  options: UseApiOptions = {}
) {
  const { execute, loading, error, reset, retry, isSuccess, isError } = useApi<T, [any]>(submitFn, {
    showSuccessMessage: true,
    loadingMessage: 'Saving...',
    ...options
  })

  return {
    submit: execute,
    submitting: loading,
    error,
    isSuccess,
    isError,
    retry,
    reset
  }
}

// Specialized composable for data fetching
export function useFetch<T = any>(
  fetchFn: () => Promise<T>,
  options: UseApiOptions = {}
) {
  const { execute, loading, error, data, reset, retry, isSuccess, isError, isIdle } = useApi<T, []>(fetchFn, {
    immediate: true,
    showErrorMessage: true,
    ...options
  })

  const refresh = () => execute()

  return {
    data,
    loading,
    error,
    isIdle,
    isSuccess,
    isError,
    refresh,
    retry,
    reset
  }
}

// Specialized composable for paginated data
export function usePaginatedApi<T = any>(
  apiCall: (page: number, limit: number, ...args: any[]) => Promise<{ data: T[], pagination: any }>,
  initialPage = 1,
  initialLimit = 20
) {
  const page = ref(initialPage)
  const limit = ref(initialLimit)
  const items = ref<T[]>([])
  const pagination = ref<any>({})
  
  const { loading, error, execute, isSuccess } = useApi(
    async (...args: any[]) => {
      const result = await apiCall(page.value, limit.value, ...args)
      items.value = result.data
      pagination.value = result.pagination
      return result
    },
    { showErrorMessage: true }
  )

  const loadPage = async (newPage: number, ...args: any[]) => {
    page.value = newPage
    return execute(...args)
  }

  const changePageSize = async (newLimit: number, ...args: any[]) => {
    limit.value = newLimit
    page.value = 1 // Reset to first page
    return execute(...args)
  }

  const refresh = (...args: any[]) => execute(...args)

  return {
    items,
    pagination,
    loading,
    error,
    isSuccess,
    page,
    limit,
    loadPage,
    changePageSize,
    refresh
  }
}