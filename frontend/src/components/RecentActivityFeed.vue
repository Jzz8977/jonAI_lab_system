<template>
  <div class="recent-activity">
    <div v-if="articles.length === 0" class="empty-state">
      <el-icon :size="48" color="#C0C4CC">
        <Clock />
      </el-icon>
      <p>No recent activity</p>
    </div>
    
    <div v-else class="activity-list">
      <div 
        v-for="article in articles" 
        :key="article.id" 
        class="activity-item"
      >
        <div class="activity-icon">
          <el-icon :size="20" :color="getStatusColor(article.status)">
            <component :is="getStatusIcon(article.status)" />
          </el-icon>
        </div>
        
        <div class="activity-content">
          <div class="activity-header">
            <h4 class="activity-title">{{ article.title }}</h4>
            <span class="activity-status" :class="getStatusClass(article.status)">
              {{ getStatusText(article.status) }}
            </span>
          </div>
          
          <div class="activity-meta">
            <span class="activity-category">{{ article.category.name }}</span>
            <span class="activity-author">by {{ article.author.username }}</span>
            <span class="activity-date">{{ getRelativeTime(article.created_at) }}</span>
          </div>
          
          <div class="activity-stats">
            <div class="stat-group">
              <el-icon :size="14" color="#67C23A">
                <View />
              </el-icon>
              <span>{{ article.view_count }}</span>
            </div>
            <div class="stat-group">
              <el-icon :size="14" color="#E6A23C">
                <Star />
              </el-icon>
              <span>{{ article.like_count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElIcon } from 'element-plus'
import { 
  Clock, 
  Document, 
  Check, 
  FolderOpened, 
  View, 
  Star 
} from '@element-plus/icons-vue'
import type { Article } from '@/types'

interface Props {
  articles: Article[]
}

defineProps<Props>()

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'published':
      return Check
    case 'archived':
      return FolderOpened
    default:
      return Document
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'published':
      return '#67C23A'
    case 'archived':
      return '#909399'
    default:
      return '#E6A23C'
  }
}

const getStatusClass = (status: string) => {
  return `status-${status}`
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'published':
      return 'Published'
    case 'archived':
      return 'Archived'
    default:
      return 'Draft'
  }
}

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }
}
</script>

<style scoped>
.recent-activity {
  max-height: 600px;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-state p {
  margin: 16px 0 0 0;
  font-size: 14px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  border: 1px solid #EBEEF5;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.activity-item:hover {
  border-color: #409EFF;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.activity-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #F5F7FA;
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.activity-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.activity-status {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-published {
  background-color: #F0F9FF;
  color: #67C23A;
}

.status-draft {
  background-color: #FDF6EC;
  color: #E6A23C;
}

.status-archived {
  background-color: #F4F4F5;
  color: #909399;
}

.activity-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #909399;
  flex-wrap: wrap;
}

.activity-category {
  background-color: #F0F9FF;
  color: #409EFF;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.activity-stats {
  display: flex;
  gap: 16px;
}

.stat-group {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

@media (max-width: 768px) {
  .activity-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .activity-meta {
    flex-direction: column;
    gap: 4px;
  }
}
</style>