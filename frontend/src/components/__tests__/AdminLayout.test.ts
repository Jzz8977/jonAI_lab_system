import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import AdminLayout from '../AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'

// Mock Element Plus components
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn()
    }
  }
})

describe('AdminLayout', () => {
  let router: any
  let pinia: any

  beforeEach(() => {
    // Create router
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/login', component: { template: '<div>Login</div>' } }
      ]
    })

    // Create pinia
    pinia = createPinia()
  })

  const createWrapper = (options = {}) => {
    return mount(AdminLayout, {
      global: {
        plugins: [router, pinia, ElementPlus],
        stubs: {
          'router-view': true,
          'el-container': true,
          'el-aside': true,
          'el-header': true,
          'el-main': true,
          'el-alert': true,
          'el-button': true,
          'el-loading-service': true,
          'AdminSidebar': true,
          'AdminHeader': true,
          'AdminBreadcrumb': true
        }
      },
      ...options
    })
  }

  it('renders the layout structure correctly', () => {
    const wrapper = createWrapper()
    
    expect(wrapper.find('.admin-layout').exists()).toBe(true)
    expect(wrapper.find('.layout-container').exists()).toBe(true)
  })

  it('toggles sidebar collapse state', async () => {
    const wrapper = createWrapper()
    
    // Initial state should be expanded
    expect((wrapper.vm as any).sidebarCollapsed).toBe(false)
    
    // Toggle sidebar
    await (wrapper.vm as any).toggleSidebar()
    expect((wrapper.vm as any).sidebarCollapsed).toBe(true)
    
    // Toggle again
    await (wrapper.vm as any).toggleSidebar()
    expect((wrapper.vm as any).sidebarCollapsed).toBe(false)
  })

  it('handles logout correctly', async () => {
    const wrapper = createWrapper()
    const authStore = useAuthStore()
    
    // Mock the logout method
    authStore.logout = vi.fn().mockResolvedValue(undefined)
    
    // Mock router push
    const pushSpy = vi.spyOn(router, 'push').mockResolvedValue(undefined)
    
    await (wrapper.vm as any).handleLogout()
    
    expect(authStore.logout).toHaveBeenCalled()
    expect(pushSpy).toHaveBeenCalledWith('/login')
  })

  it('displays loading overlay when loading', async () => {
    const wrapper = createWrapper()
    
    // Set loading state directly on the component instance
    ;(wrapper.vm as any).loading = true
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.loading-overlay').exists()).toBe(true)
  })

  it('displays error boundary when error occurs', async () => {
    const wrapper = createWrapper()
    
    // Set error state directly on the component instance
    ;(wrapper.vm as any).error = { 
      title: 'Test Error', 
      message: 'Something went wrong' 
    }
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.error-boundary').exists()).toBe(true)
  })

  it('clears error when clearError is called', async () => {
    const wrapper = createWrapper()
    
    // Set error state directly on the component instance
    ;(wrapper.vm as any).error = { message: 'Test error' }
    
    expect((wrapper.vm as any).error).toBeTruthy()
    
    // Clear error
    await (wrapper.vm as any).clearError()
    
    expect((wrapper.vm as any).error).toBeNull()
  })

  it('computes user from auth store', async () => {
    const wrapper = createWrapper()
    const authStore = useAuthStore()
    
    // Mock user data
    authStore.user = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'admin',
      created_at: '2023-01-01',
      updated_at: '2023-01-01'
    }
    
    await wrapper.vm.$nextTick()
    
    expect((wrapper.vm as any).user).toEqual(authStore.user)
  })
})