import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage } from 'element-plus'
import Login from '@/views/Login.vue'
import { useAuthStore } from '@/stores/auth'


// Mock the router
const mockPush = vi.fn()
const mockRoute = {
  query: {}
}

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useRoute: () => mockRoute
}))

// Mock Element Plus message
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

// Mock auth service
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

describe('Login Component', () => {
  let wrapper: any
  let authStore: any

  beforeEach(() => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    
    // Reset mocks
    vi.clearAllMocks()
    mockPush.mockClear()
    
    wrapper = mount(Login, {
      global: {
        stubs: {
          'el-card': {
            template: '<div class="el-card"><div class="el-card__header"><slot name="header"></slot></div><div class="el-card__body"><slot></slot></div></div>'
          },
          'el-form': {
            template: '<form @submit="$emit(\'submit\', $event)"><slot></slot></form>',
            emits: ['submit'],
            methods: {
              validate: vi.fn().mockResolvedValue(true)
            }
          },
          'el-form-item': {
            template: '<div class="el-form-item"><label v-if="label">{{ label }}</label><slot></slot></div>',
            props: ['label', 'prop']
          },
          'el-input': {
            template: '<input :data-testid="$attrs[\'data-testid\']" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keyup.enter="$emit(\'keyup\', $event)" />',
            props: ['modelValue', 'placeholder', 'type', 'prefixIcon', 'clearable', 'showPassword'],
            emits: ['update:modelValue', 'keyup']
          },
          'el-button': {
            template: '<button :data-testid="$attrs[\'data-testid\']" :disabled="disabled || undefined" :loading="loading" @click="$emit(\'click\')"><slot></slot></button>',
            props: ['type', 'size', 'loading', 'disabled'],
            emits: ['click']
          },
          'el-alert': {
            template: '<div v-if="title" class="el-alert" @close="$emit(\'close\')">{{ title }}<button v-if="closable" @click="$emit(\'close\')">×</button></div>',
            props: ['title', 'type', 'closable'],
            emits: ['close']
          }
        }
      }
    })
  })

  it('renders login form correctly', () => {
    expect(wrapper.find('h2').text()).toBe('Blog Admin Login')
    expect(wrapper.find('p').text()).toBe('Sign in to manage your blog content')
  })

  it('validates required fields', async () => {
    const usernameInput = wrapper.find('[data-testid="username-input"]')
    const passwordInput = wrapper.find('[data-testid="password-input"]')
    
    // Initially form should be invalid
    expect(wrapper.vm.isFormValid).toBe(false)
    
    // Add valid username
    await usernameInput.setValue('testuser')
    expect(wrapper.vm.isFormValid).toBe(false)
    
    // Add valid password
    await passwordInput.setValue('password123')
    expect(wrapper.vm.isFormValid).toBe(true)
  })

  it('validates username length', async () => {
    const usernameInput = wrapper.find('[data-testid="username-input"]')
    const passwordInput = wrapper.find('[data-testid="password-input"]')
    
    // Too short username
    await usernameInput.setValue('ab')
    await passwordInput.setValue('password123')
    expect(wrapper.vm.isFormValid).toBe(false)
    
    // Valid username
    await usernameInput.setValue('abc')
    expect(wrapper.vm.isFormValid).toBe(true)
  })

  it('validates password length', async () => {
    const usernameInput = wrapper.find('[data-testid="username-input"]')
    const passwordInput = wrapper.find('[data-testid="password-input"]')
    
    await usernameInput.setValue('testuser')
    
    // Too short password
    await passwordInput.setValue('12345')
    expect(wrapper.vm.isFormValid).toBe(false)
    
    // Valid password
    await passwordInput.setValue('123456')
    expect(wrapper.vm.isFormValid).toBe(true)
  })

  it('handles successful login', async () => {
    const mockAuthData = {
      token: 'mock-token',
      user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
    }
    
    // Mock successful login
    authStore.login = vi.fn().mockResolvedValue(mockAuthData)
    
    // Fill form
    await wrapper.find('[data-testid="username-input"]').setValue('testuser')
    await wrapper.find('[data-testid="password-input"]').setValue('password123')
    
    // Submit form
    await wrapper.find('[data-testid="login-button"]').trigger('click')
    
    // Verify login was called
    expect(authStore.login).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123'
    })
    
    // Verify success message and redirect
    expect(ElMessage.success).toHaveBeenCalledWith('Login successful!')
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('handles login failure', async () => {
    const errorMessage = 'Invalid credentials'
    
    // Mock failed login
    authStore.login = vi.fn().mockRejectedValue(new Error(errorMessage))
    authStore.error = errorMessage
    
    // Fill form
    await wrapper.find('[data-testid="username-input"]').setValue('testuser')
    await wrapper.find('[data-testid="password-input"]').setValue('wrongpassword')
    
    // Submit form
    await wrapper.find('[data-testid="login-button"]').trigger('click')
    
    // Verify error handling
    expect(authStore.login).toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows loading state during login', async () => {
    authStore.loading = true
    
    await wrapper.vm.$nextTick()
    
    const loginButton = wrapper.find('[data-testid="login-button"]')
    expect(loginButton.attributes('loading')).toBe('true')
    expect(loginButton.text()).toBe('Signing in...')
  })

  it('disables login button when form is invalid', async () => {
    const loginButton = wrapper.find('[data-testid="login-button"]')
    expect(loginButton.attributes('disabled')).toBeDefined()
    
    // Fill valid form
    await wrapper.find('[data-testid="username-input"]').setValue('testuser')
    await wrapper.find('[data-testid="password-input"]').setValue('password123')
    
    await wrapper.vm.$nextTick()
    expect(loginButton.attributes('disabled')).toBeUndefined()
  })

  it('clears error on mount', () => {
    authStore.clearError = vi.fn()
    
    mount(Login, {
      global: {
        stubs: {
          'el-card': true,
          'el-form': true,
          'el-form-item': true,
          'el-input': true,
          'el-button': true,
          'el-alert': true
        }
      }
    })
    
    expect(authStore.clearError).toHaveBeenCalled()
  })

  it('redirects to returnTo URL after successful login', async () => {
    const mockAuthData = {
      token: 'mock-token',
      user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'admin' }
    }
    
    // Set returnTo query parameter
    mockRoute.query = { returnTo: '/articles' }
    
    // Mock successful login
    authStore.login = vi.fn().mockResolvedValue(mockAuthData)
    
    const newWrapper = mount(Login, {
      global: {
        stubs: {
          'el-card': {
            template: '<div class="el-card"><div class="el-card__header"><slot name="header"></slot></div><div class="el-card__body"><slot></slot></div></div>'
          },
          'el-form': {
            template: '<form @submit="$emit(\'submit\', $event)"><slot></slot></form>',
            emits: ['submit'],
            methods: {
              validate: vi.fn().mockResolvedValue(true)
            }
          },
          'el-form-item': {
            template: '<div class="el-form-item"><label v-if="label">{{ label }}</label><slot></slot></div>',
            props: ['label', 'prop']
          },
          'el-input': {
            template: '<input :data-testid="$attrs[\'data-testid\']" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keyup.enter="$emit(\'keyup\', $event)" />',
            props: ['modelValue', 'placeholder', 'type', 'prefixIcon', 'clearable', 'showPassword'],
            emits: ['update:modelValue', 'keyup']
          },
          'el-button': {
            template: '<button :data-testid="$attrs[\'data-testid\']" :disabled="disabled || undefined" :loading="loading" @click="$emit(\'click\')"><slot></slot></button>',
            props: ['type', 'size', 'loading', 'disabled'],
            emits: ['click']
          },
          'el-alert': {
            template: '<div v-if="title" class="el-alert" @close="$emit(\'close\')">{{ title }}<button v-if="closable" @click="$emit(\'close\')">×</button></div>',
            props: ['title', 'type', 'closable'],
            emits: ['close']
          }
        }
      }
    })
    
    // Fill form
    await newWrapper.find('[data-testid="username-input"]').setValue('testuser')
    await newWrapper.find('[data-testid="password-input"]').setValue('password123')
    
    // Submit form
    await newWrapper.find('[data-testid="login-button"]').trigger('click')
    
    // Verify redirect to returnTo URL
    expect(mockPush).toHaveBeenCalledWith('/articles')
  })
})