<template>
  <el-select
    :model-value="modelValue"
    placeholder="Select a category"
    :loading="loading"
    :disabled="disabled"
    filterable
    clearable
    @update:model-value="handleChange"
  >
    <el-option
      v-for="category in validCategories"
      :key="category.id"
      :label="category.name"
      :value="category.id"
    >
      <div class="category-option">
        <span class="category-name">{{ category.name }}</span>
        <span v-if="category.description" class="category-description">
          {{ category.description }}
        </span>
      </div>
    </el-option>
  </el-select>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { categoryService } from '@/services'
import type { Category } from '@/types'

interface Props {
  modelValue?: number | null
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: number | null): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const categories = ref<Category[]>([])
const loading = ref(false)

// Computed property to filter out null/invalid categories
const validCategories = computed(() => {
  return categories.value.filter(category => category && category.id && category.name)
})

const handleChange = (value: number | null) => {
  emit('update:modelValue', value)
}

const loadCategories = async () => {
  try {
    loading.value = true
    const response = await categoryService.getCategories()
    categories.value = response.categories || []
  } catch (error: any) {
    console.error('Error loading categories:', error)
    ElMessage.error('Failed to load categories')
    categories.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCategories()
})

// Expose method to refresh categories (useful after creating new categories)
defineExpose({
  refresh: loadCategories
})
</script>

<style scoped>
.category-option {
  display: flex;
  flex-direction: column;
}

.category-name {
  font-weight: 500;
}

.category-description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}
</style>