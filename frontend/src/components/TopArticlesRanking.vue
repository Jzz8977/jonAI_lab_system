<template>
  <div class="top-articles">
    <div v-if="articles.length === 0" class="empty-state">
      <el-icon :size="48" color="#C0C4CC">
        <Document />
      </el-icon>
      <p>No articles found</p>
    </div>
    
    <div v-else class="articles-list">
      <div 
        v-for="(article, index) in articles" 
        :key="article.id" 
        class="article-item"
      >
        <div class="article-rank">
          <span class="rank-number" :class="getRankClass(index)">
            {{ index + 1 }}
          </span>
        </div>
        
        <div class="article-thumbnail">
          <img 
            v-if="article.thumbnail_url" 
            :src="article.thumbnail_url" 
            :alt="article.title"
            @error="handleImageError"
          />
          <div v-else class="thumbnail-placeholder">
            <el-icon :size="24" color="#C0C4CC">
              <Picture />
            </el-icon>
          </div>
        </div>
        
        <div class="article-info">
          <h4 class="article-title">{{ article.title }}</h4>
          <div class="article-meta">
            <span class="category">{{ article.category.name }}</span>
            <span class="date">{{ formatDate(article.published_at || article.created_at) }}</span>
          </div>
        </div>
        
        <div class="article-stats">
          <div class="stat-item">
            <el-icon :size="16" color="#67C23A">
              <View />
            </el-icon>
            <span>{{ formatNumber(article.view_count) }}</span>
          </div>
          <div class="stat-item">
            <el-icon :size="16" color="#E6A23C">
              <Star />
            </el-icon>
            <span>{{ formatNumber(article.like_count) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElIcon } from 'element-plus'
import { Document, Picture, View, Star } from '@element-plus/icons-vue'
import type { Article } from '@/types'

interface Props {
  articles: Article[]
}

defineProps<Props>()

const getRankClass = (index: number) => {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
}

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
  const placeholder = img.parentElement?.querySelector('.thumbnail-placeholder')
  if (placeholder) {
    (placeholder as HTMLElement).style.display = 'flex'
  }
}
</script>

<style scoped>
.top-articles {
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

.articles-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.article-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #EBEEF5;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.article-item:hover {
  border-color: #409EFF;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.article-rank {
  flex-shrink: 0;
}

.rank-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 14px;
  background-color: #F5F7FA;
  color: #909399;
}

.rank-gold {
  background-color: #FFD700;
  color: #FFFFFF;
}

.rank-silver {
  background-color: #C0C0C0;
  color: #FFFFFF;
}

.rank-bronze {
  background-color: #CD7F32;
  color: #FFFFFF;
}

.article-thumbnail {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.article-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background-color: #F5F7FA;
  display: none;
  align-items: center;
  justify-content: center;
}

.article-info {
  flex: 1;
  min-width: 0;
}

.article-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.category {
  background-color: #F0F9FF;
  color: #409EFF;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.article-stats {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

@media (max-width: 768px) {
  .article-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .article-rank {
    align-self: flex-start;
  }
  
  .article-thumbnail {
    width: 80px;
    height: 80px;
  }
  
  .article-stats {
    flex-direction: row;
    align-items: center;
    align-self: stretch;
    justify-content: space-between;
  }
}
</style>