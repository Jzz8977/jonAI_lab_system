<template>
  <div class="login-container">
    <el-card class="login-card" shadow="always">
      <template #header>
        <div class="login-header">
          <h2>Blog Admin Login</h2>
          <p>Sign in to manage your blog content</p>
        </div>
      </template>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-position="top"
        size="large"
        @submit.prevent="handleLogin"
      >
        <el-form-item label="Username" prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="Enter your username"
            :prefix-icon="User"
            clearable
            data-testid="username-input"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item label="Password" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="Enter your password"
            :prefix-icon="Lock"
            show-password
            clearable
            data-testid="password-input"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="authStore.loading"
            :disabled="!isFormValid"
            @click="handleLogin"
            class="login-button"
            data-testid="login-button"
          >
            {{ authStore.loading ? 'Signing in...' : 'Sign In' }}
          </el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="authStore.error"
        :title="authStore.error"
        type="error"
        :closable="true"
        @close="authStore.clearError"
        class="error-alert"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { type FormInstance, type FormRules } from 'element-plus'
import { notificationService } from '@/services/notifications'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import type { LoginCredentials } from '@/types'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Form reference and data
const loginFormRef = ref<FormInstance>()
const loginForm = ref<LoginCredentials>({
  username: '',
  password: ''
})

// Form validation rules
const loginRules: FormRules = {
  username: [
    { required: true, message: 'Username is required', trigger: 'blur' },
    { min: 3, max: 50, message: 'Username must be between 3 and 50 characters', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Password is required', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' }
  ]
}

// Computed properties
const isFormValid = computed(() => {
  return loginForm.value.username.length >= 3 && 
         loginForm.value.password.length >= 6
})

// Methods
const handleLogin = async () => {
  if (!loginFormRef.value) return

  try {
    // Validate form
    const valid = await loginFormRef.value.validate()
    if (!valid) return

    // Attempt login
    await authStore.login(loginForm.value)
    
    // Show success message
    notificationService.success('Login successful!')
    
    // Redirect to the intended page or dashboard
    const returnTo = route.query.returnTo as string || '/dashboard'
    router.push(returnTo)
  } catch (error: any) {
    // Error is already handled by the store and displayed in the alert
    console.error('Login failed:', error)
  }
}

// Clear any existing errors when component mounts
onMounted(() => {
  authStore.clearError()
})
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
}

.login-header {
  text-align: center;
  margin-bottom: 0;
}

.login-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.login-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.login-button {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}

.error-alert {
  margin-top: 16px;
}

:deep(.el-card__header) {
  padding: 24px 24px 0 24px;
}

:deep(.el-card__body) {
  padding: 24px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #303133;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-button) {
  border-radius: 8px;
}
</style>