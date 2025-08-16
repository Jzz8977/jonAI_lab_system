<template>
  <div class="article-editor">
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      @submit.prevent="handleSubmit"
    >
      <el-row :gutter="20">
        <el-col :span="16">
          <!-- Article Title -->
          <el-form-item label="Title" prop="title">
            <el-input
              v-model="form.title"
              placeholder="Enter article title"
              size="large"
              maxlength="255"
              show-word-limit
            />
          </el-form-item>

          <!-- Article Content -->
          <el-form-item label="Content" prop="content">
            <RichTextEditor
              v-model="form.content"
              placeholder="Write your article content here..."
            />
          </el-form-item>

          <!-- Article Excerpt -->
          <el-form-item label="Excerpt" prop="excerpt">
            <el-input
              v-model="form.excerpt"
              type="textarea"
              :rows="3"
              placeholder="Optional excerpt or summary (will be auto-generated if empty)"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </el-col>

        <el-col :span="8">
          <!-- Article Status -->
          <el-form-item label="Status" prop="status">
            <el-select v-model="form.status" placeholder="Select status" style="width: 100%">
              <el-option label="Draft" value="draft" />
              <el-option label="Published" value="published" />
              <el-option label="Archived" value="archived" />
            </el-select>
          </el-form-item>

          <!-- Category Selection -->
          <el-form-item label="Category" prop="category_id">
            <CategorySelect v-model="form.category_id" />
          </el-form-item>

          <!-- Thumbnail Upload -->
          <el-form-item label="Thumbnail">
            <ImageUpload
              v-model="form.thumbnail"
              :initial-url="form.thumbnail_url"
              @update:modelValue="handleThumbnailChange"
            />
          </el-form-item>

          <!-- Action Buttons -->
          <el-form-item>
            <div class="action-buttons">
              <el-button @click="handleCancel">Cancel</el-button>
              <el-button 
                type="primary" 
                @click="handleSaveDraft"
                :loading="saving"
                :disabled="!isFormValid"
              >
                Save as Draft
              </el-button>
              <el-button 
                type="success" 
                @click="handlePublish"
                :loading="publishing"
                :disabled="!isFormValid"
              >
                {{ isEditing ? 'Update & Publish' : 'Publish' }}
              </el-button>
            </div>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElButton, ElRow, ElCol, ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import RichTextEditor from './RichTextEditor.vue'
import ImageUpload from './ImageUpload.vue'
import CategorySelect from './CategorySelect.vue'
import { articleService, uploadService } from '@/services'


interface Props {
  articleId?: number
}

const props = defineProps<Props>()
const router = useRouter()

const formRef = ref<FormInstance>()
const saving = ref(false)
const publishing = ref(false)
const loading = ref(false)

const form = reactive({
  title: '',
  content: '',
  excerpt: '',
  category_id: null as number | null,
  status: 'draft' as 'draft' | 'published' | 'archived',
  thumbnail: null as File | null,
  thumbnail_url: ''
})

const rules: FormRules = {
  title: [
    { required: true, message: 'Please enter article title', trigger: 'blur' },
    { min: 3, max: 255, message: 'Title must be between 3 and 255 characters', trigger: 'blur' }
  ],
  content: [
    { required: true, message: 'Please enter article content', trigger: 'blur' },
    { min: 10, message: 'Content must be at least 10 characters', trigger: 'blur' }
  ],
  category_id: [
    { required: true, message: 'Please select a category', trigger: 'change' }
  ]
}

const isEditing = computed(() => !!props.articleId)
const isFormValid = computed(() => {
  return form.title.trim() && 
         form.content.trim() && 
         form.category_id !== null
})

// Load article data if editing
onMounted(async () => {
  if (props.articleId) {
    await loadArticle()
  }
})

const loadArticle = async () => {
  try {
    loading.value = true
    const article = await articleService.getArticle(props.articleId!)
    
    form.title = article.title
    form.content = article.content
    form.excerpt = article.excerpt || ''
    form.category_id = article.category.id
    form.status = article.status
    form.thumbnail_url = article.thumbnail_url || ''
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to load article')
  } finally {
    loading.value = false
  }
}

const handleThumbnailChange = (file: File | null) => {
  form.thumbnail = file
}

const uploadThumbnail = async (file: File) => {
  try {
    return await uploadService.uploadThumbnail(file)
  } catch (error: any) {
    throw new Error(error.message || 'Failed to upload thumbnail')
  }
}

const validateForm = async (): Promise<boolean> => {
  if (!formRef.value) return false
  
  try {
    await formRef.value.validate()
    return true
  } catch {
    return false
  }
}

const handleSaveDraft = async () => {
  if (!(await validateForm())) return
  
  try {
    saving.value = true
    
    // Upload thumbnail first if there's a new file
    let thumbnailUrl = form.thumbnail_url
    if (form.thumbnail) {
      const uploadResult = await uploadThumbnail(form.thumbnail)
      thumbnailUrl = uploadResult.url
    }
    
    const articleData = {
      title: form.title,
      content: form.content,
      excerpt: form.excerpt,
      category_id: form.category_id!,
      status: 'draft' as const,
      thumbnail_url: thumbnailUrl
    }

    let article
    if (isEditing.value) {
      article = await articleService.updateArticle(props.articleId!, articleData)
    } else {
      article = await articleService.createArticle(articleData)
    }

    ElMessage.success('Article saved as draft successfully')
    if (!isEditing.value) {
      // Redirect to edit mode for the newly created article
      router.push(`/articles/edit/${article.id}`)
    }
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to save article')
  } finally {
    saving.value = false
  }
}

const handlePublish = async () => {
  if (!(await validateForm())) return
  
  try {
    publishing.value = true
    
    // Upload thumbnail first if there's a new file
    let thumbnailUrl = form.thumbnail_url
    if (form.thumbnail) {
      const uploadResult = await uploadThumbnail(form.thumbnail)
      thumbnailUrl = uploadResult.url
    }
    
    const articleData = {
      title: form.title,
      content: form.content,
      excerpt: form.excerpt,
      category_id: form.category_id!,
      status: 'published' as const,
      thumbnail_url: thumbnailUrl
    }

    if (isEditing.value) {
      await articleService.updateArticle(props.articleId!, articleData)
    } else {
      await articleService.createArticle(articleData)
    }

    ElMessage.success('Article published successfully')
    router.push('/articles')
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to publish article')
  } finally {
    publishing.value = false
  }
}

const handleCancel = () => {
  router.push('/articles')
}

const handleSubmit = () => {
  // Prevent default form submission
}
</script>

<style scoped>
.article-editor {
  padding: 20px;
  background: white;
  border-radius: 8px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-direction: column;
  width: 100%;
}

.action-buttons .el-button {
  width: 100%;
}

:deep(.el-form-item__label) {
  font-weight: 600;
}

:deep(.el-textarea__inner) {
  resize: vertical;
}
</style>