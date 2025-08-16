import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AuthGuard from '@/components/AuthGuard.vue'
import { useAuthStore } from '@/stores/auth'

// Mock the router
const mockPush = vi.fn()
const mockRoute = {
  fullPath: '/dashboard',
  query: {}
}

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useRoute: () => mockRoute
}))

describe('AuthGuard Component', () => {
  let wrapper: any
  let authStore: any

  beforeEach(() => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    vi.clearAllMocks()
    mockPush.mockClear()
  })

  it('shows loading state when auth is loading', () => {
    authStore.loading = true
    authStore.isAuthenticated = false

    wrapper = mount(AuthGuard, {
      slots: {
        default: '<div data-testid="protected-content">Protected Content</div>'
      },
      global: {
        stubs: {
          'el-icon': true,
          'el-result': true,
          'el-button': true
        }
      }
    })

    expect(wrapper.find('.auth-loading').exists()).toBe(true)
    expect(wrapper.find('.loading-text').text()).toBe('Verifying authentication...')
    expect(wrapper.find('[data-testid="protected-content"]').exists()).toBe(false)
  })

  it('renders protected content when authenticated', () => {
    authStore.loading = false
    authStore.isAuthenticated = true

    wrapper = mount(AuthGuard, {
      slots: {
        default: '<div data-testid="protected-content">Protected Content</div>'
      }
    })

    expect(wrapper.find('[data-testid="protected-content"]').exists()).toBe(true)
    expect(wrapper.find('.auth-loading').exists()).toBe(false)
    expect(wrapper.find('.auth-required').exists()).toBe(false)
  })

  it('shows authentication required message when not authenticated', () => {
    authStore.loading = false
    authStore.isAuthenticated = false

    wrapper = mount(AuthGuard, {
      slots: {
        default: '<div data-testid="protected-content">Protected Content</div>'
      },
      global: {
        stubs: {
          'el-result': true,
          'el-button': true
        }
      }
    })

    expect(wrapper.find('.auth-required').exists()).toBe(true)
    expect(wrapper.find('[data-testid="protected-content"]').exists()).toBe(false)
  })

  it('redirects to login with returnTo query when go to login is clicked', async () => {
    authStore.loading = false
    authStore.isAuthenticated = false
    mockRoute.fullPath = '/articles'

    wrapper = mount(AuthGuard, {
      global: {
        stubs: {
          'el-result': {
            template: '<div><slot name="extra"></slot></div>'
          },
          'el-button': {
            template: '<button @click="$emit(\'click\')" data-testid="go-to-login-btn"><slot></slot></button>',
            emits: ['click']
          }
        }
      }
    })

    await wrapper.find('[data-testid="go-to-login-btn"]').trigger('click')

    expect(mockPush).toHaveBeenCalledWith({
      path: '/login',
      query: { returnTo: '/articles' }
    })
  })

  it('redirects to dashboard when current route is login', async () => {
    authStore.loading = false
    authStore.isAuthenticated = false
    mockRoute.fullPath = '/login'

    wrapper = mount(AuthGuard, {
      global: {
        stubs: {
          'el-result': {
            template: '<div><slot name="extra"></slot></div>'
          },
          'el-button': {
            template: '<button @click="$emit(\'click\')" data-testid="go-to-login-btn"><slot></slot></button>',
            emits: ['click']
          }
        }
      }
    })

    await wrapper.find('[data-testid="go-to-login-btn"]').trigger('click')

    expect(mockPush).toHaveBeenCalledWith({
      path: '/login',
      query: { returnTo: '/dashboard' }
    })
  })

  it('initializes auth on mount when not authenticated and not loading', async () => {
    authStore.loading = false
    authStore.isAuthenticated = false
    authStore.initAuth = vi.fn()

    wrapper = mount(AuthGuard, {
      global: {
        stubs: {
          'el-result': true,
          'el-button': true
        }
      }
    })

    expect(authStore.initAuth).toHaveBeenCalled()
  })

  it('does not initialize auth when already loading', () => {
    authStore.loading = true
    authStore.isAuthenticated = false
    authStore.initAuth = vi.fn()

    wrapper = mount(AuthGuard, {
      global: {
        stubs: {
          'el-icon': true
        }
      }
    })

    expect(authStore.initAuth).not.toHaveBeenCalled()
  })

  it('does not initialize auth when already authenticated', () => {
    authStore.loading = false
    authStore.isAuthenticated = true
    authStore.initAuth = vi.fn()

    wrapper = mount(AuthGuard, {
      slots: {
        default: '<div>Protected Content</div>'
      }
    })

    expect(authStore.initAuth).not.toHaveBeenCalled()
  })

  it('redirects to login when authentication changes to false', async () => {
    authStore.loading = false
    authStore.isAuthenticated = true

    wrapper = mount(AuthGuard, {
      slots: {
        default: '<div>Protected Content</div>'
      }
    })

    // Simulate authentication change
    authStore.isAuthenticated = false
    await wrapper.vm.$nextTick()

    expect(mockPush).toHaveBeenCalledWith({
      path: '/login',
      query: { returnTo: '/dashboard' }
    })
  })
})