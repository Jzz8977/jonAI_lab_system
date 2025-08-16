<template>
  <div class="articles">
    <!-- Header with actions -->
    <div class="articles-header">
      <h1>Article Management</h1>
      <div class="header-actions">
        <el-button type="primary" @click="$router.push('/articles/create')">
          <el-icon><Plus /></el-icon>
          Create Article
        </el-button>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="filters-section">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-input
            v-model="filters.search"
            placeholder="Search articles..."
            clearable
            @input="debouncedSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="filters.status"
            placeholder="All Status"
            clearable
            @change="loadArticles"
          >
            <el-option label="Draft" value="draft" />
            <el-option label="Published" value="published" />
            <el-option label="Archived" value="archived" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="filters.category_id"
            placeholder="All Categories"
            clearable
            @change="loadArticles"
          >
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="filters.orderBy"
            @change="loadArticles"
          >
            <el-option label="Created Date" value="created_at" />
            <el-option label="Updated Date" value="updated_at" />
            <el-option label="Title" value="title" />
            <el-option label="Views" value="view_count" />
            <el-option label="Likes" value="like_count" />
          </el-select>
        </el-col>
        <el-col :span="3">
          <el-select
            v-model="filters.orderDir"
            @change="loadArticles"
          >
            <el-option label="Descending" value="DESC" />
            <el-option label="Ascending" value="ASC" />
          </el-select>
        </el-col>
        <el-col :span="3">
          <el-button @click="resetFilters">Reset</el-button>
        </el-col>
      </el-row>
    </div>

    <!-- Bulk Actions -->
    <div v-if="selectedArticles.length > 0" class="bulk-actions">
      <el-alert
        :title="`${selectedArticles.length} article(s) selected`"
        type="info"
        show-icon
        :closable="false"
      >
        <template #default>
          <div class="bulk-buttons">
            <el-button size="small" @click="bulkUpdateStatus('draft')">
              Set as Draft
            </el-button>
            <el-button size="small" @click="bulkUpdateStatus('published')">
              Publish
            </el-button>
            <el-button size="small" @click="bulkUpdateStatus('archived')">
              Archive
            </el-button>
            <el-button size="small" type="danger" @click="bulkDelete">
              Delete
            </el-button>
            <el-button size="small" @click="clearSelection">
              Clear Selection
            </el-button>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- Articles Table -->
    <div class="articles-table">
      <el-table
        v-loading="loading"
        :data="articles"
        @selection-change="handleSelectionChange"
        empty-text="No articles found"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column label="Title" min-width="200">
          <template #default="{ row }">
            <div class="article-title">
              <el-link @click="previewArticle(row)" type="primary">
                {{ row.title }}
              </el-link>
              <div class="article-meta">
                <el-tag size="small">{{ row.slug }}</el-tag>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Category" width="120">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.category.name }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Status" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              size="small"
            >
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Author" width="120">
          <template #default="{ row }">
            {{ row.author.username }}
          </template>
        </el-table-column>

        <el-table-column label="Stats" width="100">
          <template #default="{ row }">
            <div class="article-stats">
              <span><el-icon><View /></el-icon> {{ row.view_count }}</span>
              <span><el-icon><Star /></el-icon> {{ row.like_count }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Created" width="120">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="Actions" width="200" fixed="right">
          <template #default="{ row }">
            <div class="article-actions">
              <el-button size="small" @click="editArticle(row)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button size="small" @click="previewArticle(row)">
                <el-icon><View /></el-icon>
              </el-button>
              <el-dropdown @command="(command) => handleStatusAction(command, row)">
                <el-button size="small">
                  Status <el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="draft" :disabled="row.status === 'draft'">
                      Set as Draft
                    </el-dropdown-item>
                    <el-dropdown-item command="published" :disabled="row.status === 'published'">
                      Publish
                    </el-dropdown-item>
                    <el-dropdown-item command="archived" :disabled="row.status === 'archived'">
                      Archive
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button size="small" type="danger" @click="deleteArticle(row)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Pagination -->
    <div class="pagination-section">
      <el-pagination
        v-model:current-page="filters.page"
        v-model:page-size="filters.limit"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.totalCount"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadArticles"
        @current-change="loadArticles"
      />
    </div>

    <!-- Article Preview Dialog -->
    <el-dialog
      v-model="previewDialog.visible"
      :title="previewDialog.article?.title"
      width="80%"
      top="5vh"
    >
      <div v-if="previewDialog.article" class="article-preview">
        <div class="preview-meta">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="Status">
              <el-tag :type="getStatusType(previewDialog.article.status)">
                {{ previewDialog.article.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Category">
              {{ previewDialog.article.category.name }}
            </el-descriptions-item>
            <el-descriptions-item label="Author">
              {{ previewDialog.article.author.username }}
            </el-descriptions-item>
            <el-descriptions-item label="Created">
              {{ formatDate(previewDialog.article.created_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="Views">
              {{ previewDialog.article.view_count }}
            </el-descriptions-item>
            <el-descriptions-item label="Likes">
              {{ previewDialog.article.like_count }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        
        <div v-if="previewDialog.article.thumbnail_url" class="preview-thumbnail">
          <img :src="previewDialog.article.thumbnail_url" alt="Article thumbnail" />
        </div>
        
        <div class="preview-content">
          <h3>Content:</h3>
          <div v-html="previewDialog.article.content"></div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="previewDialog.visible = false">Close</el-button>
        <el-button type="primary" @click="editArticle(previewDialog.article!)">
          Edit Article
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { notificationService, confirmDelete, confirmBulkAction } from '@/services/notifications'
import { usePaginatedApi } from '@/composables/useApi'
import { 
  Plus, 
  Search, 
  Edit, 
  Delete, 
  View, 
  Star, 
  ArrowDown 
} from '@element-plus/icons-vue'
import { articleService } from '@/services/articles'
import { categoryService } from '@/services/categories'
import type { Article, Category } from '@/types'
import type { ArticleFilters } from '@/services/articles'

const router = useRouter()

// Reactive data
const categories = ref<Category[]>([])
const selectedArticles = ref<Article[]>([])

const filters = reactive<ArticleFilters>({
  search: '',
  status: undefined,
  category_id: undefined,
  page: 1,
  limit: 20,
  orderBy: 'created_at',
  orderDir: 'DESC'
})

// Use enhanced paginated API composable
const {
  items: articles,
  pagination,
  loading,
  error,
  loadPage,
  changePageSize,
  refresh: loadArticles
} = usePaginatedApi(
  (page, limit) => articleService.getArticles({ ...filters, page, limit }),
  1,
  20
)

const previewDialog = reactive({
  visible: false,
  article: null as Article | null
})

// Computed
const debouncedSearch = computed(() => {
  let timeout: NodeJS.Timeout
  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      loadArticles()
    }, 500)
  }
})

// Methods - loadArticles is now handled by the composable

const loadCategories = async () => {
  try {
    const response = await categoryService.getCategories()
    categories.value = response.categories
  } catch (error: any) {
    notificationService.error('Failed to load categories')
  }
}

const resetFilters = () => {
  Object.assign(filters, {
    search: '',
    status: undefined,
    category_id: undefined,
    page: 1,
    limit: 20,
    orderBy: 'created_at',
    orderDir: 'DESC'
  })
  loadArticles()
}

const handleSelectionChange = (selection: Article[]) => {
  selectedArticles.value = selection
}

const clearSelection = () => {
  selectedArticles.value = []
}

const bulkUpdateStatus = async (status: 'draft' | 'published' | 'archived') => {
  const confirmed = await confirmBulkAction(`Set as ${status}`, selectedArticles.value.length)
  if (!confirmed) return
  
  try {
    const articleIds = selectedArticles.value.map(article => article.id)
    await articleService.bulkUpdateStatus(articleIds, status)
    
    notificationService.success(`Successfully updated ${articleIds.length} article(s)`)
    clearSelection()
    loadArticles()
  } catch (error: any) {
    notificationService.error(error.message || 'Failed to update articles')
  }
}

const bulkDelete = async () => {
  const confirmed = await confirmDelete(
    undefined,
    `Are you sure you want to delete ${selectedArticles.value.length} article(s)? This action cannot be undone.`
  )
  if (!confirmed) return
  
  try {
    const articleIds = selectedArticles.value.map(article => article.id)
    await articleService.bulkDelete(articleIds)
    
    notificationService.success(`Successfully deleted ${articleIds.length} article(s)`)
    clearSelection()
    loadArticles()
  } catch (error: any) {
    notificationService.error(error.message || 'Failed to delete articles')
  }
}

const handleStatusAction = async (command: string, article: Article) => {
  try {
    let updatedArticle: Article
    
    switch (command) {
      case 'published':
        updatedArticle = await articleService.publishArticle(article.id)
        break
      case 'archived':
        updatedArticle = await articleService.archiveArticle(article.id)
        break
      default:
        updatedArticle = await articleService.updateArticle(article.id, { status: command as any })
    }
    
    notificationService.success(`Article ${command} successfully`)
    loadArticles()
  } catch (error: any) {
    notificationService.error(error.message || `Failed to ${command} article`)
  }
}

const editArticle = (article: Article) => {
  router.push(`/articles/edit/${article.id}`)
}

const previewArticle = (article: Article) => {
  previewDialog.article = article
  previewDialog.visible = true
}

const deleteArticle = async (article: Article) => {
  const confirmed = await confirmDelete(article.title)
  if (!confirmed) return
  
  try {
    await articleService.deleteArticle(article.id)
    notificationService.success('Article deleted successfully')
    loadArticles()
  } catch (error: any) {
    notificationService.error(error.message || 'Failed to delete article')
  }
}

const getStatusType = (status: string) => {
  switch (status) {
    case 'published':
      return 'success'
    case 'draft':
      return 'warning'
    case 'archived':
      return 'info'
    default:
      return ''
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

// Lifecycle
onMounted(() => {
  loadArticles()
  loadCategories()
})
</script>
<style sc
oped>
.articles {
  padding: 24px;
}

.articles-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.articles-header h1 {
  margin: 0;
  color: #303133;
}

.filters-section {
  margin-bottom: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.bulk-actions {
  margin-bottom: 16px;
}

.bulk-buttons {
  margin-top: 8px;
}

.bulk-buttons .el-button {
  margin-right: 8px;
}

.articles-table {
  margin-bottom: 24px;
}

.article-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.article-meta {
  display: flex;
  gap: 8px;
}

.article-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.article-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-actions {
  display: flex;
  gap: 4px;
}

.pagination-section {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.article-preview {
  max-height: 70vh;
  overflow-y: auto;
}

.preview-meta {
  margin-bottom: 16px;
}

.preview-thumbnail {
  margin-bottom: 16px;
  text-align: center;
}

.preview-thumbnail img {
  max-width: 300px;
  max-height: 200px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-content {
  margin-top: 16px;
}

.preview-content h3 {
  margin-bottom: 12px;
  color: #303133;
}

.preview-content div {
  line-height: 1.6;
  color: #606266;
}

/* Responsive design */
@media (max-width: 768px) {
  .articles {
    padding: 16px;
  }
  
  .articles-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .filters-section .el-row {
    flex-direction: column;
  }
  
  .filters-section .el-col {
    margin-bottom: 8px;
  }
  
  .article-actions {
    flex-direction: column;
  }
}
</style>