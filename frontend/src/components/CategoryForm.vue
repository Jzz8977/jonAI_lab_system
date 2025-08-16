<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? 'Edit Category' : 'Create Category'"
    width="500px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="Name" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="Enter category name"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="Description" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          placeholder="Enter category description (optional)"
          :rows="3"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="Slug" prop="slug">
        <el-input
          v-model="formData.slug"
          placeholder="URL slug (auto-generated if empty)"
          maxlength="100"
          show-word-limit
        />
        <div class="form-help">
          Leave empty to auto-generate from name
        </div>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">Cancel</el-button>
        <el-button 
          type="primary" 
          :loading="loading"
          @click="handleSubmit"
        >
          {{ isEdit ? 'Update' : 'Create' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick, computed } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { categoryService, type CategoryFormData } from '@/services/categories'
import type { Category } from '@/types'

interface Props {
  visible: boolean
  category?: Category | null
}

interface Emits {
  (e: 'close'): void
  (e: 'success', category: Category): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formRef = ref<FormInstance>()
const loading = ref(false)

const formData = reactive<CategoryFormData>({
  name: '',
  description: '',
  slug: ''
})

const rules: FormRules = {
  name: [
    { required: true, message: 'Category name is required', trigger: 'blur' },
    { min: 2, max: 100, message: 'Name must be between 2 and 100 characters', trigger: 'blur' }
  ],
  description: [
    { max: 500, message: 'Description cannot exceed 500 characters', trigger: 'blur' }
  ],
  slug: [
    { max: 100, message: 'Slug cannot exceed 100 characters', trigger: 'blur' },
    { 
      pattern: /^[a-z0-9-]*$/, 
      message: 'Slug can only contain lowercase letters, numbers, and hyphens', 
      trigger: 'blur' 
    }
  ]
}

const isEdit = computed(() => !!props.category)

const resetForm = () => {
  formData.name = ''
  formData.description = ''
  formData.slug = ''
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

// Watch for category changes to populate form
watch(() => props.category, (newCategory) => {
  if (newCategory) {
    formData.name = newCategory.name
    formData.description = newCategory.description || ''
    formData.slug = newCategory.slug
  } else {
    resetForm()
  }
}, { immediate: true })

// Watch for dialog visibility to reset form
watch(() => props.visible, (visible) => {
  if (visible && !props.category) {
    resetForm()
  }
})

const handleClose = () => {
  emit('close')
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    const valid = await formRef.value.validate()
    if (!valid) return
    
    loading.value = true
    
    let result: Category
    if (isEdit.value && props.category) {
      result = await categoryService.updateCategory(props.category.id, formData)
      ElMessage.success('Category updated successfully')
    } else {
      result = await categoryService.createCategory(formData)
      ElMessage.success('Category created successfully')
    }
    
    emit('success', result)
    handleClose()
  } catch (error: any) {
    console.error('Error saving category:', error)
    ElMessage.error(error.message || 'Failed to save category')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.form-help {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.dialog-footer {
  text-align: right;
}
</style>