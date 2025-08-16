<template>
  <div class="admin-layout">
    <!-- Loading overlay -->
    <div v-if="loading" class="loading-overlay">
      <el-loading-service />
    </div>

    <!-- Error boundary -->
    <div v-if="error" class="error-boundary">
      <el-alert
        :title="error.title || 'An error occurred'"
        :description="error.message"
        type="error"
        show-icon
        :closable="false"
      />
      <el-button @click="clearError" type="primary" style="margin-top: 16px">
        Try Again
      </el-button>
    </div>

    <!-- Main layout -->
    <el-container v-else class="layout-container">
      <!-- Sidebar -->
      <el-aside :width="sidebarCollapsed ? '64px' : '250px'" class="sidebar">
        <AdminSidebar 
          :collapsed="sidebarCollapsed"
          @toggle-collapse="toggleSidebar"
        />
      </el-aside>

      <!-- Main content area -->
      <el-container class="main-container">
        <!-- Header -->
        <el-header height="60px" class="header">
          <AdminHeader 
            :user="user"
            @logout="handleLogout"
          />
        </el-header>

        <!-- Breadcrumb -->
        <div class="breadcrumb-container">
          <AdminBreadcrumb />
        </div>

        <!-- Main content -->
        <el-main class="content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import AdminSidebar from './AdminSidebar.vue'
import AdminHeader from './AdminHeader.vue'
import AdminBreadcrumb from './AdminBreadcrumb.vue'

const router = useRouter()
const authStore = useAuthStore()

// Layout state
const sidebarCollapsed = ref(false)
const loading = ref(false)
const error = ref<{ title?: string; message: string } | null>(null)

// Computed properties
const user = computed(() => authStore.user)

// Methods
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const handleLogout = async () => {
  try {
    loading.value = true
    await authStore.logout()
    ElMessage.success('Logged out successfully')
    router.push('/login')
  } catch (err: any) {
    ElMessage.error('Logout failed: ' + (err.message || 'Unknown error'))
  } finally {
    loading.value = false
  }
}

const clearError = () => {
  error.value = null
}

// Error boundary
onErrorCaptured((err: Error) => {
  console.error('Layout error:', err)
  error.value = {
    title: 'Layout Error',
    message: err.message || 'An unexpected error occurred in the admin layout'
  }
  return false // Prevent error from propagating
})

// Initialize layout
onMounted(() => {
  // Load sidebar state from localStorage
  const savedCollapsed = localStorage.getItem('sidebar-collapsed')
  if (savedCollapsed !== null) {
    sidebarCollapsed.value = JSON.parse(savedCollapsed)
  }
})

// Save sidebar state to localStorage
const saveSidebarState = () => {
  localStorage.setItem('sidebar-collapsed', JSON.stringify(sidebarCollapsed.value))
}

// Watch for sidebar changes and save state
import { watch } from 'vue'
watch(sidebarCollapsed, saveSidebarState)
</script>

<style scoped>
.admin-layout {
  height: 100vh;
  overflow: hidden;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.error-boundary {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.layout-container {
  height: 100vh;
}

.sidebar {
  background: #001529;
  transition: width 0.3s ease;
  overflow: hidden;
}

.main-container {
  display: flex;
  flex-direction: column;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  padding: 0 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.breadcrumb-container {
  background: #fff;
  padding: 12px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.content {
  background: #f0f2f5;
  padding: 24px;
  overflow-y: auto;
}

/* Responsive design */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .main-container {
    margin-left: 0 !important;
  }

  .content {
    padding: 16px;
  }
}
</style>