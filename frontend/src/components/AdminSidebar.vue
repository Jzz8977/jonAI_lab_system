<template>
  <div class="admin-sidebar">
    <!-- Logo/Brand -->
    <div class="sidebar-header">
      <div v-if="!collapsed" class="brand">
        <h2>JonAI-Lab</h2>
        <span class="subtitle">Admin</span>
      </div>
      <div v-else class="brand-collapsed">
        <span class="brand-icon">J</span>
      </div>
    </div>

    <!-- Navigation Menu -->
    <el-menu
      :default-active="activeMenu"
      class="sidebar-menu"
      background-color="#001529"
      text-color="#rgba(255, 255, 255, 0.65)"
      active-text-color="#1890ff"
      :collapse="collapsed"
      :collapse-transition="false"
      router
    >
      <el-menu-item index="/dashboard">
        <el-icon><Odometer /></el-icon>
        <template #title>Dashboard</template>
      </el-menu-item>

      <el-menu-item index="/articles">
        <el-icon><Document /></el-icon>
        <template #title>Articles</template>
      </el-menu-item>

      <el-menu-item index="/categories">
        <el-icon><Collection /></el-icon>
        <template #title>Categories</template>
      </el-menu-item>

      <!-- Future menu items can be added here -->
      <!-- 
      <el-sub-menu index="analytics">
        <template #title>
          <el-icon><DataAnalysis /></el-icon>
          <span>Analytics</span>
        </template>
        <el-menu-item index="/analytics/overview">Overview</el-menu-item>
        <el-menu-item index="/analytics/reports">Reports</el-menu-item>
      </el-sub-menu>
      -->
    </el-menu>

    <!-- Collapse Toggle Button -->
    <div class="sidebar-footer">
      <el-button
        type="text"
        class="collapse-btn"
        @click="$emit('toggle-collapse')"
      >
        <el-icon>
          <Expand v-if="collapsed" />
          <Fold v-else />
        </el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Odometer, 
  Document, 
  Collection, 
  Expand, 
  Fold
} from '@element-plus/icons-vue'

interface Props {
  collapsed: boolean
}

defineProps<Props>()
defineEmits<{
  'toggle-collapse': []
}>()

const route = useRoute()

// Compute active menu item based on current route
const activeMenu = computed(() => {
  const path = route.path
  
  // Map routes to menu items
  if (path.startsWith('/dashboard')) return '/dashboard'
  if (path.startsWith('/articles')) return '/articles'
  if (path.startsWith('/categories')) return '/categories'
  
  // Default to dashboard
  return '/dashboard'
})
</script>

<style scoped>
.admin-sidebar {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #001529;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #1f1f1f;
  text-align: center;
}

.brand {
  color: #fff;
}

.brand h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1890ff;
}

.brand .subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  display: block;
  margin-top: 4px;
}

.brand-collapsed {
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-icon {
  width: 32px;
  height: 32px;
  background: #1890ff;
  color: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
}

.sidebar-menu {
  flex: 1;
  border: none;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 250px;
}

/* Custom menu item styling */
:deep(.el-menu-item) {
  height: 48px;
  line-height: 48px;
  margin: 4px 8px;
  border-radius: 6px;
  transition: all 0.3s;
}

:deep(.el-menu-item:hover) {
  background-color: rgba(24, 144, 255, 0.1) !important;
  color: #1890ff !important;
}

:deep(.el-menu-item.is-active) {
  background-color: #1890ff !important;
  color: #fff !important;
}

:deep(.el-menu-item.is-active .el-icon) {
  color: #fff !important;
}

:deep(.el-sub-menu .el-sub-menu__title) {
  height: 48px;
  line-height: 48px;
  margin: 4px 8px;
  border-radius: 6px;
  transition: all 0.3s;
}

:deep(.el-sub-menu .el-sub-menu__title:hover) {
  background-color: rgba(24, 144, 255, 0.1) !important;
  color: #1890ff !important;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #1f1f1f;
  text-align: center;
}

.collapse-btn {
  color: rgba(255, 255, 255, 0.65) !important;
  width: 100%;
  height: 40px;
  border: 1px solid #1f1f1f;
  border-radius: 6px;
  transition: all 0.3s;
}

.collapse-btn:hover {
  color: #1890ff !important;
  border-color: #1890ff;
  background-color: rgba(24, 144, 255, 0.1);
}

/* Collapsed state adjustments */
.admin-sidebar:has(.sidebar-menu.el-menu--collapse) .sidebar-footer {
  padding: 16px 8px;
}

.admin-sidebar:has(.sidebar-menu.el-menu--collapse) .collapse-btn {
  width: 48px;
  padding: 0;
}
</style>