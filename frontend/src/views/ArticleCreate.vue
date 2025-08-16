<template>
  <div class="article-create">
    <AdminBreadcrumb :items="breadcrumbItems" />
    
    <div class="page-header">
      <h1>Create New Article</h1>
      <p>Write and publish a new article for your blog</p>
    </div>

    <ArticleEditor />
  </div>
</template>

<script setup lang="ts">
import AdminBreadcrumb from '@/components/AdminBreadcrumb.vue'
import ArticleEditor from '@/components/ArticleEditor.vue'

const breadcrumbItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Articles', path: '/articles' },
  { label: 'Create Article' }
]
</script>

<style scoped>
.article-create {
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