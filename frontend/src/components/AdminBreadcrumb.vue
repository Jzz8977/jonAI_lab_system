<template>
  <div class="admin-breadcrumb">
    <el-breadcrumb separator="/">
      <el-breadcrumb-item 
        v-for="item in breadcrumbItems" 
        :key="item.path"
        :to="item.to"
      >
        <el-icon v-if="item.icon" class="breadcrumb-icon">
          <component :is="item.icon" />
        </el-icon>
        {{ item.title }}
      </el-breadcrumb-item>
    </el-breadcrumb>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  House,
  Odometer, 
  Document, 
  Collection,
  Plus,
  Edit
} from '@element-plus/icons-vue'

interface BreadcrumbItem {
  title: string
  path: string
  to?: string
  icon?: any
}

const route = useRoute()

// Breadcrumb configuration mapping
const breadcrumbConfig: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [
    { title: 'Home', path: '/', to: '/dashboard', icon: House },
    { title: 'Dashboard', path: '/dashboard', icon: Odometer }
  ],
  '/articles': [
    { title: 'Home', path: '/', to: '/dashboard', icon: House },
    { title: 'Articles', path: '/articles', icon: Document }
  ],
  '/articles/new': [
    { title: 'Home', path: '/', to: '/dashboard', icon: House },
    { title: 'Articles', path: '/articles', to: '/articles', icon: Document },
    { title: 'New Article', path: '/articles/new', icon: Plus }
  ],
  '/articles/edit': [
    { title: 'Home', path: '/', to: '/dashboard', icon: House },
    { title: 'Articles', path: '/articles', to: '/articles', icon: Document },
    { title: 'Edit Article', path: '/articles/edit', icon: Edit }
  ],
  '/categories': [
    { title: 'Home', path: '/', to: '/dashboard', icon: House },
    { title: 'Categories', path: '/categories', icon: Collection }
  ],
  '/categories/new': [
    { title: 'Home', path: '/', to: '/dashboard', icon: House },
    { title: 'Categories', path: '/categories', to: '/categories', icon: Collection },
    { title: 'New Category', path: '/categories/new', icon: Plus }
  ],
  '/categories/edit': [
    { title: 'Home', path: '/', to: '/dashboard', icon: House },
    { title: 'Categories', path: '/categories', to: '/categories', icon: Collection },
    { title: 'Edit Category', path: '/categories/edit', icon: Edit }
  ]
}

// Computed breadcrumb items based on current route
const breadcrumbItems = computed(() => {
  const currentPath = route.path
  
  // Check for exact match first
  if (breadcrumbConfig[currentPath]) {
    return breadcrumbConfig[currentPath]
  }
  
  // Check for dynamic routes (e.g., /articles/123/edit)
  if (currentPath.includes('/articles/') && currentPath.includes('/edit')) {
    return [
      { title: 'Home', path: '/', to: '/dashboard', icon: House },
      { title: 'Articles', path: '/articles', to: '/articles', icon: Document },
      { title: 'Edit Article', path: currentPath, icon: Edit }
    ]
  }
  
  if (currentPath.includes('/categories/') && currentPath.includes('/edit')) {
    return [
      { title: 'Home', path: '/', to: '/dashboard', icon: House },
      { title: 'Categories', path: '/categories', to: '/categories', icon: Collection },
      { title: 'Edit Category', path: currentPath, icon: Edit }
    ]
  }
  
  // Check for article detail view (e.g., /articles/123)
  if (currentPath.match(/^\/articles\/\d+$/)) {
    return [
      { title: 'Home', path: '/', to: '/dashboard', icon: House },
      { title: 'Articles', path: '/articles', to: '/articles', icon: Document },
      { title: 'Article Details', path: currentPath, icon: Document }
    ]
  }
  
  // Check for category detail view (e.g., /categories/123)
  if (currentPath.match(/^\/categories\/\d+$/)) {
    return [
      { title: 'Home', path: '/', to: '/dashboard', icon: House },
      { title: 'Categories', path: '/categories', to: '/categories', icon: Collection },
      { title: 'Category Details', path: currentPath, icon: Collection }
    ]
  }
  
  // Default fallback - try to build breadcrumb from path segments
  const segments = currentPath.split('/').filter(Boolean)
  const items: BreadcrumbItem[] = [
    { title: 'Home', path: '/', to: '/dashboard', icon: House }
  ]
  
  let currentSegmentPath = ''
  segments.forEach((segment, index) => {
    currentSegmentPath += `/${segment}`
    
    // Capitalize and format segment name
    const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    
    // Add appropriate icon based on segment
    let icon
    if (segment === 'dashboard') icon = Odometer
    else if (segment === 'articles') icon = Document
    else if (segment === 'categories') icon = Collection
    else if (segment === 'new') icon = Plus
    else if (segment === 'edit') icon = Edit
    
    items.push({
      title,
      path: currentSegmentPath,
      to: index === segments.length - 1 ? undefined : currentSegmentPath, // Last item is not clickable
      icon
    })
  })
  
  return items
})
</script>

<style scoped>
.admin-breadcrumb {
  display: flex;
  align-items: center;
  min-height: 32px;
}

.breadcrumb-icon {
  margin-right: 4px;
  font-size: 14px;
}

/* Custom breadcrumb styling */
:deep(.el-breadcrumb) {
  font-size: 14px;
  line-height: 1.5;
}

:deep(.el-breadcrumb__item) {
  display: inline-flex;
  align-items: center;
}

:deep(.el-breadcrumb__inner) {
  display: inline-flex;
  align-items: center;
  color: #8c8c8c;
  font-weight: 400;
  transition: color 0.3s;
}

:deep(.el-breadcrumb__inner:hover) {
  color: #1890ff;
}

:deep(.el-breadcrumb__inner.is-link) {
  color: #1890ff;
  cursor: pointer;
}

:deep(.el-breadcrumb__inner.is-link:hover) {
  color: #40a9ff;
}

:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #262626;
  font-weight: 500;
}

:deep(.el-breadcrumb__separator) {
  margin: 0 8px;
  color: #d9d9d9;
  font-weight: 500;
}

/* Responsive design */
@media (max-width: 768px) {
  .admin-breadcrumb {
    overflow-x: auto;
    white-space: nowrap;
  }
  
  :deep(.el-breadcrumb) {
    font-size: 13px;
  }
  
  .breadcrumb-icon {
    font-size: 13px;
  }
}
</style>