<template>
  <div v-if="authStore.loading" class="auth-loading">
    <div class="loading-container">
      <el-icon class="loading-icon" :size="40">
        <Loading />
      </el-icon>
      <p class="loading-text">Verifying authentication...</p>
    </div>
  </div>
  <slot v-else-if="authStore.isAuthenticated" />
  <div v-else class="auth-required">
    <el-result
      icon="warning"
      title="Authentication Required"
      sub-title="Please log in to access this page"
    >
      <template #extra>
        <el-button type="primary" @click="goToLogin" data-testid="go-to-login-btn">
          Go to Login
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const goToLogin = () => {
  // Store the current route to redirect back after login
  const returnTo = route.fullPath !== '/login' ? route.fullPath : '/dashboard'
  router.push({
    path: '/login',
    query: { returnTo }
  })
}

// Watch for authentication changes and redirect if needed
watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (!isAuth && !authStore.loading) {
      goToLogin()
    }
  }
)

// Initialize auth when component mounts
onMounted(async () => {
  if (!authStore.isAuthenticated && !authStore.loading) {
    await authStore.initAuth()
  }
})
</script>

<style scoped>
.auth-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 9999;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-icon {
  animation: spin 1s linear infinite;
  color: #409eff;
}

.loading-text {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.auth-required {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}
</style>