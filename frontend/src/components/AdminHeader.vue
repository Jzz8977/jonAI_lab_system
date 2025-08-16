<template>
  <div class="admin-header">
    <!-- Left side - could add additional controls here -->
    <div class="header-left">
      <!-- Future: breadcrumb toggle, search, etc. -->
    </div>

    <!-- Right side - User profile and actions -->
    <div class="header-right">
      <!-- User Profile Dropdown -->
      <el-dropdown 
        trigger="click" 
        placement="bottom-end"
        @command="handleCommand"
      >
        <div class="user-profile">
          <div class="user-avatar">
            <el-avatar :size="32" :src="userAvatar">
              <el-icon><User /></el-icon>
            </el-avatar>
          </div>
          <div class="user-info">
            <span class="username">{{ user?.username || 'Admin' }}</span>
            <span class="user-role">{{ user?.role || 'Administrator' }}</span>
          </div>
          <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
        </div>

        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile" :icon="User">
              Profile Settings
            </el-dropdown-item>
            <el-dropdown-item command="preferences" :icon="Setting">
              Preferences
            </el-dropdown-item>
            <el-dropdown-item divided />
            <el-dropdown-item command="logout" :icon="SwitchButton">
              Logout
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- Additional header actions -->
      <div class="header-actions">
        <!-- Notifications (future feature) -->
        <!-- 
        <el-badge :value="notificationCount" :hidden="notificationCount === 0">
          <el-button type="text" :icon="Bell" circle />
        </el-badge>
        -->
        
        <!-- Settings quick access -->
        <el-tooltip content="Settings" placement="bottom">
          <el-button 
            type="text" 
            :icon="Setting" 
            circle 
            @click="handleCommand('preferences')"
          />
        </el-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  User, 
  Setting, 
  SwitchButton, 
  ArrowDown
} from '@element-plus/icons-vue'
import type { User as UserType } from '@/types'

interface Props {
  user: UserType | null
}

defineProps<Props>()

const emit = defineEmits<{
  logout: []
}>()

// Computed properties
const userAvatar = computed(() => {
  // For now, return null to use the default icon
  // In the future, this could be a user profile image URL
  return null
})

// Methods
const handleCommand = async (command: string) => {
  switch (command) {
    case 'profile':
      handleProfileSettings()
      break
    case 'preferences':
      handlePreferences()
      break
    case 'logout':
      await handleLogout()
      break
    default:
      console.warn('Unknown command:', command)
  }
}

const handleProfileSettings = () => {
  // TODO: Implement profile settings modal/page
  ElMessage.info('Profile settings will be implemented in a future update')
}

const handlePreferences = () => {
  // TODO: Implement preferences modal/page
  ElMessage.info('Preferences will be implemented in a future update')
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to logout?',
      'Confirm Logout',
      {
        confirmButtonText: 'Logout',
        cancelButtonText: 'Cancel',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    emit('logout')
  } catch {
    // User cancelled logout
  }
}
</script>

<style scoped>
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  width: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 160px;
}

.user-profile:hover {
  background-color: #f5f5f5;
}

.user-avatar {
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.user-role {
  font-size: 12px;
  color: #8c8c8c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
  text-transform: capitalize;
}

.dropdown-icon {
  color: #8c8c8c;
  font-size: 12px;
  transition: transform 0.3s;
}

.user-profile:hover .dropdown-icon {
  color: #1890ff;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions .el-button {
  color: #8c8c8c;
}

.header-actions .el-button:hover {
  color: #1890ff;
  background-color: #f0f8ff;
}

/* Responsive design */
@media (max-width: 768px) {
  .user-info {
    display: none;
  }
  
  .user-profile {
    min-width: auto;
    padding: 8px;
  }
  
  .header-actions {
    gap: 4px;
  }
}

/* Dropdown menu styling */
:deep(.el-dropdown-menu) {
  min-width: 160px;
}

:deep(.el-dropdown-menu__item) {
  padding: 8px 16px;
  font-size: 14px;
}

:deep(.el-dropdown-menu__item:hover) {
  background-color: #f0f8ff;
  color: #1890ff;
}

:deep(.el-dropdown-menu__item.is-divided) {
  border-top: 1px solid #e8e8e8;
  margin-top: 4px;
  padding-top: 8px;
}
</style>