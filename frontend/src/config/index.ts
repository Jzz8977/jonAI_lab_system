// Application configuration
export const config = {
  // API configuration
  api: {
    baseURL: '/api',
    timeout: 10000
  },

  // File upload configuration
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedImageExtensions: ['.jpg', '.jpeg', '.png', '.webp']
  },

  // Pagination defaults
  pagination: {
    defaultPageSize: 10,
    pageSizes: [10, 20, 50, 100]
  },

  // Authentication
  auth: {
    tokenKey: 'auth_token',
    userKey: 'auth_user'
  },

  // Application metadata
  app: {
    name: 'JonAI-Lab Blog Admin',
    version: '1.0.0',
    description: 'Admin interface for JonAI-Lab Blog'
  }
}