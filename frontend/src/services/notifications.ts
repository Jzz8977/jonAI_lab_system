import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import type { MessageOptions, NotificationOptions } from 'element-plus'

export interface ToastOptions extends Partial<MessageOptions> {
  duration?: number
  showClose?: boolean
}

export interface NotificationToastOptions extends Partial<NotificationOptions> {
  duration?: number
  showClose?: boolean
}

export interface ConfirmOptions {
  title?: string
  message: string
  type?: 'warning' | 'error' | 'info' | 'success'
  confirmButtonText?: string
  cancelButtonText?: string
  confirmButtonClass?: string
}

/**
 * Notification service for consistent user feedback across the application
 */
export const notificationService = {
  /**
   * Show success toast message
   */
  success(message: string, options?: ToastOptions) {
    ElMessage.success({
      message,
      duration: 3000,
      showClose: true,
      ...options
    })
  },

  /**
   * Show error toast message
   */
  error(message: string, options?: ToastOptions) {
    ElMessage.error({
      message,
      duration: 5000,
      showClose: true,
      ...options
    })
  },

  /**
   * Show warning toast message
   */
  warning(message: string, options?: ToastOptions) {
    ElMessage.warning({
      message,
      duration: 4000,
      showClose: true,
      ...options
    })
  },

  /**
   * Show info toast message
   */
  info(message: string, options?: ToastOptions) {
    ElMessage.info({
      message,
      duration: 3000,
      showClose: true,
      ...options
    })
  },

  /**
   * Show notification (more prominent than toast)
   */
  notify: {
    success(title: string, message?: string, options?: NotificationToastOptions) {
      ElNotification.success({
        title,
        message,
        duration: 4000,
        showClose: true,
        ...options
      })
    },

    error(title: string, message?: string, options?: NotificationToastOptions) {
      ElNotification.error({
        title,
        message,
        duration: 6000,
        showClose: true,
        ...options
      })
    },

    warning(title: string, message?: string, options?: NotificationToastOptions) {
      ElNotification.warning({
        title,
        message,
        duration: 5000,
        showClose: true,
        ...options
      })
    },

    info(title: string, message?: string, options?: NotificationToastOptions) {
      ElNotification.info({
        title,
        message,
        duration: 4000,
        showClose: true,
        ...options
      })
    }
  },

  /**
   * Show confirmation dialog
   */
  async confirm(options: ConfirmOptions): Promise<boolean> {
    try {
      await ElMessageBox.confirm(
        options.message,
        options.title || 'Confirm Action',
        {
          confirmButtonText: options.confirmButtonText || 'Confirm',
          cancelButtonText: options.cancelButtonText || 'Cancel',
          type: options.type || 'warning',
          confirmButtonClass: options.confirmButtonClass
        }
      )
      return true
    } catch (error) {
      // User cancelled or closed dialog
      return false
    }
  },

  /**
   * Show delete confirmation dialog
   */
  async confirmDelete(itemName?: string, customMessage?: string): Promise<boolean> {
    const message = customMessage || 
      (itemName 
        ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
        : 'Are you sure you want to delete this item? This action cannot be undone.')

    return notificationService.confirm({
      title: 'Confirm Delete',
      message,
      type: 'error',
      confirmButtonText: 'Delete',
      confirmButtonClass: 'el-button--danger'
    })
  },

  /**
   * Show bulk action confirmation dialog
   */
  async confirmBulkAction(action: string, count: number): Promise<boolean> {
    return notificationService.confirm({
      title: `Confirm Bulk ${action}`,
      message: `Are you sure you want to ${action.toLowerCase()} ${count} item(s)?`,
      type: 'warning',
      confirmButtonText: action,
    })
  },

  /**
   * Show loading message
   */
  loading(message: string = 'Loading...', options?: ToastOptions) {
    return ElMessage({
      message,
      type: 'info',
      duration: 0, // Don't auto-close
      showClose: false,
      ...options
    })
  }
}

// Export individual methods for convenience
export const { success, error, warning, info, notify, confirm, confirmDelete, confirmBulkAction, loading } = notificationService