import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: '/dashboard'
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/admin',
      component: () => import('@/components/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '/dashboard',
          name: 'dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: '/articles',
          name: 'articles',
          component: () => import('@/views/Articles.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: '/articles/create',
          name: 'article-create',
          component: () => import('@/views/ArticleCreate.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: '/articles/edit/:id',
          name: 'article-edit',
          component: () => import('@/views/ArticleEdit.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: '/categories',
          name: 'categories',
          component: () => import('@/views/Categories.vue'),
          meta: { requiresAuth: true }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/dashboard'
    }
  ]
})

// Global navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)
  
  // Initialize auth state if not already done (only on first navigation)
  if (from.name === undefined && !authStore.loading) {
    await authStore.initAuth()
  }
  
  // Wait for auth initialization to complete
  if (authStore.loading) {
    // Create a promise that resolves when loading is complete
    await new Promise<void>((resolve) => {
      const unwatch = authStore.$subscribe((_mutation, state) => {
        if (!state.loading) {
          unwatch()
          resolve()
        }
      })
    })
  }
  
  // Apply route guards
  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (requiresGuest && authStore.isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router