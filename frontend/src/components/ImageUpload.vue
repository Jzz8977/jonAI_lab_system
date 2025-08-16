<template>
  <div class="image-upload">
    <div class="upload-area" @click="triggerFileInput" @drop="handleDrop" @dragover.prevent @dragenter.prevent>
      <div v-if="!previewUrl" class="upload-placeholder">
        <el-icon class="upload-icon"><Plus /></el-icon>
        <div class="upload-text">
          <p>Click to upload or drag and drop</p>
          <p class="upload-hint">JPG, PNG, WEBP up to 5MB</p>
        </div>
      </div>
      
      <div v-else class="preview-container">
        <img :src="previewUrl" alt="Preview" class="preview-image" />
        <div class="preview-overlay">
          <el-button type="primary" size="small" @click.stop="triggerFileInput">
            <el-icon><Edit /></el-icon>
            Change
          </el-button>
          <el-button type="danger" size="small" @click.stop="removeImage">
            <el-icon><Delete /></el-icon>
            Remove
          </el-button>
        </div>
      </div>
    </div>
    
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/jpg,image/png,image/webp"
      @change="handleFileSelect"
      style="display: none"
    />
    
    <div v-if="error" class="error-message">
      <el-alert :title="error" type="error" show-icon :closable="false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElIcon, ElButton, ElAlert } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'

interface Props {
  modelValue?: File | null
  initialUrl?: string
  maxSize?: number // in MB
}

interface Emits {
  (e: 'update:modelValue', value: File | null): void
}

const props = withDefaults(defineProps<Props>(), {
  maxSize: 5
})

const emit = defineEmits<Emits>()

const fileInput = ref<HTMLInputElement>()
const previewUrl = ref<string>('')
const error = ref<string>('')

// Initialize preview URL from initial URL or file
watch(() => props.initialUrl, (newUrl) => {
  if (newUrl && !props.modelValue) {
    previewUrl.value = newUrl
  }
}, { immediate: true })

watch(() => props.modelValue, (newFile) => {
  if (newFile) {
    const reader = new FileReader()
    reader.onload = (e) => {
      previewUrl.value = e.target?.result as string
    }
    reader.readAsDataURL(newFile)
  } else if (!props.initialUrl) {
    previewUrl.value = ''
  }
}, { immediate: true })

const validateFile = (file: File): string | null => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return 'Please select a valid image file (JPG, PNG, WEBP)'
  }
  
  // Check file size
  const maxSizeBytes = props.maxSize * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return `File size must be less than ${props.maxSize}MB`
  }
  
  return null
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    processFile(file)
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  const file = event.dataTransfer?.files[0]
  
  if (file) {
    processFile(file)
  }
}

const processFile = (file: File) => {
  error.value = ''
  
  const validationError = validateFile(file)
  if (validationError) {
    error.value = validationError
    return
  }
  
  emit('update:modelValue', file)
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const removeImage = () => {
  previewUrl.value = ''
  error.value = ''
  emit('update:modelValue', null)
  
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<style scoped>
.image-upload {
  width: 100%;
}

.upload-area {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
  position: relative;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: #409eff;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.upload-icon {
  font-size: 48px;
  color: #c0c4cc;
}

.upload-text p {
  margin: 0;
  color: #606266;
}

.upload-hint {
  font-size: 12px;
  color: #909399;
}

.preview-container {
  position: relative;
  width: 100%;
  height: 200px;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s;
  border-radius: 4px;
}

.preview-container:hover .preview-overlay {
  opacity: 1;
}

.error-message {
  margin-top: 8px;
}
</style>