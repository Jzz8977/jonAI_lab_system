<template>
  <div class="article-edit">
    <AdminBreadcrumb :items="breadcrumbItems" />
    
    <div class="page-header">
      <h1>Edit Article</h1>
      <p>Update your article content and settings</p>
    </div>

    <ArticleEditor :article-id="articleId" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminBreadcrumb from '@/components/AdminBreadcrumb.vue'
import ArticleEditor from '@/components/ArticleEditor.vue'

const route = useRoute()

const articleId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? parseInt(id, 10) : undefined
})

const breadcrumbItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Articles', path: '/articles' },
  { label: 'Edit Article' }
]
</script>

<style scoped>
.article-edit {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}
</style>