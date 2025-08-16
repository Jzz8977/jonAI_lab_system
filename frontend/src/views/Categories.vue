<template>
  <div class="categories">
    <div class="page-header">
      <div class="header-content">
        <h1>Category Management</h1>
        <p>Manage article categories and types</p>
      </div>
      <div class="header-actions">
        <el-button 
          type="primary" 
          :icon="Plus"
          @click="handleCreate"
        >
          Create Category
        </el-button>
      </div>
    </div>

    <div class="content-card">
      <div class="table-toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="searchQuery"
            placeholder="Search categories..."
            :prefix-icon="Search"
            style="width: 300px"
            clearable
            @input="handleSearch"
          />
        </div>
        <div class="toolbar-right">
          <el-button 
            :icon="Refresh"
            @click="loadCategories"
            :loading="loading"
          >
            Refresh
          </el-button>
        </div>
      </div>

      <el-table
        :data="filteredCategories"
        :loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        
        <el-table-column prop="name" label="Name" min-width="150">
          <template #default="{ row }">
            <div class="category-name">
              <strong>{{ row.name }}</strong>
              <div class="category-slug">{{ row.slug }}</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="description" label="Description" min-width="200">
          <template #default="{ row }">
            <span v-if="row.description" class="description-text">
              {{ row.description }}
            </span>
            <span v-else class="no-description">No description</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="Created" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="Actions" width="150" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                type="primary"
                size="small"
                :icon="Edit"
                @click="handleEdit(row)"
              >
                Edit
              </el-button>
              <el-button
                type="danger"
                size="small"
                :icon="Delete"
                @click="handleDelete(row)"
              >
                Delete
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!loading && filteredCategories.length === 0" class="empty-state">
        <div class="empty-content">
          <el-icon size="48" color="#c0c4cc">
            <FolderOpened />
          </el-icon>
          <h3>No categories found</h3>
          <p v-if="searchQuery">
            No categories match your search criteria.
          </p>
          <p v-else>
            Get started by creating your first category.
          </p>
          <el-button 
            v-if="!searchQuery"
            type="primary" 
            :icon="Plus"
            @click="handleCreate"
          >
            Create Category
          </el-button>
        </div>
      </div>
    </div>

    <!-- Category Form Dialog -->
    <CategoryForm
      :visible="formVisible"
      :category="selectedCategory"
      @close="handleFormClose"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { notificationService, confirmDelete } from '@/services/notifications'
import { useFetch } from '@/composables/useApi'
import { Plus, Search, Refresh, Edit, Delete, FolderOpened } from '@element-plus/icons-vue'
import { categoryService } from '@/services/categories'
import CategoryForm from '@/components/CategoryForm.vue'
import type { Category } from '@/types'

const searchQuery = ref('')
const formVisible = ref(false)
const selectedCategory = ref<Category | null>(null)

// Use enhanced API composable for better error handling
const {
  data: categoriesData,
  loading,
  refresh: loadCategories
} = useFetch(
  () => categoryService.getCategories({ orderBy: 'name', orderDir: 'ASC' }),
  { showErrorMessage: true }
)

const categories = computed(() => categoriesData.value?.categories || [])

// Computed property for filtered categories
const filteredCategories = computed(() => {
  if (!searchQuery.value) {
    return categories.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return categories.value.filter(category => 
    category.name.toLowerCase().includes(query) ||
    category.slug.toLowerCase().includes(query) ||
    (category.description && category.description.toLowerCase().includes(query))
  )
})

// loadCategories is now handled by the composable

// Handle search input
const handleSearch = () => {
  // Search is handled by computed property
}

// Handle create category
const handleCreate = () => {
  selectedCategory.value = null
  formVisible.value = true
}

// Handle edit category
const handleEdit = (category: Category) => {
  selectedCategory.value = category
  formVisible.value = true
}

// Handle delete category
const handleDelete = async (category: Category) => {
  const confirmed = await confirmDelete(category.name)
  if (!confirmed) return
  
  try {
    await categoryService.deleteCategory(category.id)
    notificationService.success('Category deleted successfully')
    await loadCategories()
  } catch (error: any) {
    console.error('Error deleting category:', error)
    
    // Handle specific error for categories with articles
    if (error.message?.includes('associated articles')) {
      notificationService.error('Cannot delete category that has associated articles')
    } else {
      notificationService.error('Failed to delete category')
    }
  }
}

// Handle form close
const handleFormClose = () => {
  formVisible.value = false
  selectedCategory.value = null
}

// Handle form success
const handleFormSuccess = async (_category: Category) => {
  await loadCategories()
}

// Format date for display
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Categories are automatically loaded by useFetch with immediate: true
</script>

<style scoped>
.categories {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-content p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.content-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.category-name {
  display: flex;
  flex-direction: column;
}

.category-slug {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.description-text {
  color: var(--el-text-color-regular);
}

.no-description {
  color: var(--el-text-color-placeholder);
  font-style: italic;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.empty-state {
  padding: 60px 24px;
  text-align: center;
}

.empty-content h3 {
  margin: 16px 0 8px 0;
  color: var(--el-text-color-primary);
}

.empty-content p {
  margin: 0 0 24px 0;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .table-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .action-buttons {
    flex-direction: column;
  }
}
</style>