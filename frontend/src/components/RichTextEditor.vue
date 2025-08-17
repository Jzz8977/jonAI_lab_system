<template>
  <div class="rich-text-editor">
    <div ref="editorContainer" class="editor-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { uploadService } from '@/services'
import { ElMessage } from 'element-plus'

interface Props {
  modelValue: string
  placeholder?: string
  readonly?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Write your article content...',
  readonly: false
})

const emit = defineEmits<Emits>()

const editorContainer = ref<HTMLElement>()
let quill: Quill | null = null

// Custom image upload handler
const handleImageUpload = () => {
  const input = document.createElement('input')
  input.setAttribute('type', 'file')
  input.setAttribute('accept', 'image/jpeg,image/jpg,image/png,image/webp')
  input.click()

  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    if (!file) return

    // Validate file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      ElMessage.error('Please select a valid image file (JPG, PNG, WEBP)')
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      ElMessage.error('Image size must be less than 5MB')
      return
    }

    try {
      // Show loading message
      const loadingMessage = ElMessage({
        message: 'Uploading image...',
        type: 'info',
        duration: 0
      })

      // Upload image
      const result = await uploadService.uploadThumbnail(file)
      
      // Close loading message
      loadingMessage.close()

      // Insert image into editor
      if (quill) {
        const range = quill.getSelection()
        const index = range ? range.index : quill.getLength()
        quill.insertEmbed(index, 'image', result.url)
        quill.setSelection(index + 1, 0)
      }

      ElMessage.success('Image uploaded successfully')
    } catch (error: any) {
      ElMessage.error('Failed to upload image: ' + (error.message || 'Unknown error'))
    }
  })
}

const toolbarOptions = [
  [{ 'header': [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
  [{ 'script': 'sub'}, { 'script': 'super' }],
  [{ 'indent': '-1'}, { 'indent': '+1' }],
  [{ 'direction': 'rtl' }],
  [{ 'color': [] }, { 'background': [] }],
  [{ 'align': [] }],
  ['blockquote', 'code-block'],
  ['link', 'image'],
  ['clean']
]

onMounted(() => {
  if (editorContainer.value) {
    quill = new Quill(editorContainer.value, {
      theme: 'snow',
      placeholder: props.placeholder,
      readOnly: props.readonly,
      modules: {
        toolbar: {
          container: toolbarOptions,
          handlers: {
            image: handleImageUpload
          }
        }
      }
    })

    // Set initial content
    if (props.modelValue) {
      quill.root.innerHTML = props.modelValue
    }

    // Listen for text changes
    quill.on('text-change', () => {
      const html = quill?.root.innerHTML || ''
      emit('update:modelValue', html)
    })
  }
})

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (quill && newValue !== quill.root.innerHTML) {
    quill.root.innerHTML = newValue
  }
})

// Watch for readonly changes
watch(() => props.readonly, (newReadonly) => {
  if (quill) {
    quill.enable(!newReadonly)
  }
})

onBeforeUnmount(() => {
  if (quill) {
    quill = null
  }
})
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.editor-container {
  min-height: 300px;
}

:deep(.ql-editor) {
  min-height: 300px;
  font-size: 14px;
  line-height: 1.6;
}

:deep(.ql-toolbar) {
  border-bottom: 1px solid #dcdfe6;
}

:deep(.ql-container) {
  border: none;
}
</style>