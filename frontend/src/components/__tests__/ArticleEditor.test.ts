import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElButton, ElRow, ElCol, ElMessage } from 'element-plus'
import ArticleEditor from '../ArticleEditor.vue'

// Mock services
vi.mock('@/services', () => ({
  articleService: {
    getArticle: vi.fn(),
    createArticle: vi.fn(),
    updateArticle: vi.fn()
  },
  uploadService: {
    uploadThumbnail: vi.fn()
  }
}))

// Mock child components
vi.mock('../RichTextEditor.vue', () => ({
  default: {
    name: 'RichTextEditor',
    template: '<div class="mock-rich-text-editor"></div>',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue']
  }
}))

vi.mock('../ImageUpload.vue', () => ({
  default: {
    name: 'ImageUpload',
    template: '<div class="mock-image-upload"></div>',
    props: ['modelValue', 'initialUrl'],
    emits: ['update:modelValue']
  }
}))

vi.mock('../CategorySelect.vue', () => ({
  default: {
    name: 'CategorySelect',
    template: '<div class="mock-category-select"></div>',
    props: ['modelValue'],
    emits: ['update:modelValue']
  }
}))

// Mock ElMessage
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn()
    }
  }
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/articles', component: { template: '<div>Articles</div>' } },
    { path: '/articles/edit/:id', component: { template: '<div>Edit</div>' } }
  ]
})

describe('ArticleEditor', () => {
  let mockArticleService: any
  let mockUploadService: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get the mocked services
    const services = await import('@/services')
    mockArticleService = services.articleService
    mockUploadService = services.uploadService
  })

  const createWrapper = (props = {}) => {
    return mount(ArticleEditor, {
      props,
      global: {
        plugins: [router],
        components: {
          ElForm,
          ElFormItem,
          ElInput,
          ElSelect,
          ElOption,
          ElButton,
          ElRow,
          ElCol
        }
      }
    })
  }

  it('renders correctly for new article', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('.article-editor').exists()).toBe(true)
    expect(wrapper.find('.mock-rich-text-editor').exists()).toBe(true)
    expect(wrapper.find('.mock-image-upload').exists()).toBe(true)
    expect(wrapper.find('.mock-category-select').exists()).toBe(true)
  })

  it('loads article data when editing', async () => {
    const mockArticle = {
      id: 1,
      title: 'Test Article',
      content: '<p>Test content</p>',
      excerpt: 'Test excerpt',
      category: { id: 1, name: 'Test Category' },
      status: 'draft',
      thumbnail_url: 'https://example.com/thumb.jpg'
    }

    mockArticleService.getArticle.mockResolvedValue(mockArticle)

    const wrapper = createWrapper({ articleId: 1 })
    await wrapper.vm.$nextTick()

    expect(mockArticleService.getArticle).toHaveBeenCalledWith(1)
    
    // Check that form is populated
    const component = wrapper.vm as any
    expect(component.form.title).toBe('Test Article')
    expect(component.form.content).toBe('<p>Test content</p>')
    expect(component.form.excerpt).toBe('Test excerpt')
    expect(component.form.category_id).toBe(1)
    expect(component.form.status).toBe('draft')
    expect(component.form.thumbnail_url).toBe('https://example.com/thumb.jpg')
  })

  it('handles article loading error', async () => {
    mockArticleService.getArticle.mockRejectedValue(new Error('Failed to load'))

    const wrapper = createWrapper({ articleId: 1 })
    await wrapper.vm.$nextTick()

    expect(ElMessage.error).toHaveBeenCalledWith('Failed to load')
  })

  it('validates required fields', async () => {
    const wrapper = createWrapper()
    const component = wrapper.vm as any

    // Form should be invalid initially
    expect(component.isFormValid).toBe(false)

    // Fill required fields
    component.form.title = 'Test Title'
    component.form.content = 'Test content'
    component.form.category_id = 1

    await wrapper.vm.$nextTick()

    expect(component.isFormValid).toBe(true)
  })

  it('saves article as draft', async () => {
    const mockCreatedArticle = { id: 1, title: 'Test Article' }
    mockArticleService.createArticle.mockResolvedValue(mockCreatedArticle)

    const wrapper = createWrapper()
    const component = wrapper.vm as any

    // Fill form
    component.form.title = 'Test Article'
    component.form.content = 'Test content'
    component.form.category_id = 1

    const saveDraftButton = wrapper.findAll('.el-button').find(btn => 
      btn.text().includes('Save as Draft')
    )

    if (saveDraftButton) {
      await saveDraftButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(mockArticleService.createArticle).toHaveBeenCalledWith({
        title: 'Test Article',
        content: 'Test content',
        excerpt: '',
        category_id: 1,
        status: 'draft',
        thumbnail_url: ''
      })

      expect(ElMessage.success).toHaveBeenCalledWith('Article saved as draft successfully')
    }
  })

  it('publishes article', async () => {
    const mockCreatedArticle = { id: 1, title: 'Test Article' }
    mockArticleService.createArticle.mockResolvedValue(mockCreatedArticle)

    const wrapper = createWrapper()
    const component = wrapper.vm as any

    // Fill form
    component.form.title = 'Test Article'
    component.form.content = 'Test content'
    component.form.category_id = 1

    const publishButton = wrapper.findAll('.el-button').find(btn => 
      btn.text().includes('Publish')
    )

    if (publishButton) {
      await publishButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(mockArticleService.createArticle).toHaveBeenCalledWith({
        title: 'Test Article',
        content: 'Test content',
        excerpt: '',
        category_id: 1,
        status: 'published',
        thumbnail_url: ''
      })

      expect(ElMessage.success).toHaveBeenCalledWith('Article published successfully')
    }
  })

  it('uploads thumbnail before saving', async () => {
    const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    const mockUploadResult = { url: 'https://example.com/uploaded.jpg' }
    const mockCreatedArticle = { id: 1, title: 'Test Article' }

    mockUploadService.uploadThumbnail.mockResolvedValue(mockUploadResult)
    mockArticleService.createArticle.mockResolvedValue(mockCreatedArticle)

    const wrapper = createWrapper()
    const component = wrapper.vm as any

    // Fill form with thumbnail
    component.form.title = 'Test Article'
    component.form.content = 'Test content'
    component.form.category_id = 1
    component.form.thumbnail = mockFile

    const publishButton = wrapper.findAll('.el-button').find(btn => 
      btn.text().includes('Publish')
    )

    if (publishButton) {
      await publishButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(mockUploadService.uploadThumbnail).toHaveBeenCalledWith(mockFile)
      expect(mockArticleService.createArticle).toHaveBeenCalledWith({
        title: 'Test Article',
        content: 'Test content',
        excerpt: '',
        category_id: 1,
        status: 'published',
        thumbnail_url: 'https://example.com/uploaded.jpg'
      })
    }
  })

  it('updates existing article', async () => {
    const mockArticle = {
      id: 1,
      title: 'Test Article',
      content: '<p>Test content</p>',
      excerpt: 'Test excerpt',
      category: { id: 1, name: 'Test Category' },
      status: 'draft',
      thumbnail_url: ''
    }

    mockArticleService.getArticle.mockResolvedValue(mockArticle)
    mockArticleService.updateArticle.mockResolvedValue(mockArticle)

    const wrapper = createWrapper({ articleId: 1 })
    await wrapper.vm.$nextTick()

    const component = wrapper.vm as any
    component.form.title = 'Updated Title'

    const publishButton = wrapper.findAll('.el-button').find(btn => 
      btn.text().includes('Update & Publish')
    )

    if (publishButton) {
      await publishButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(mockArticleService.updateArticle).toHaveBeenCalledWith(1, {
        title: 'Updated Title',
        content: '<p>Test content</p>',
        excerpt: 'Test excerpt',
        category_id: 1,
        status: 'published',
        thumbnail_url: ''
      })
    }
  })

  it('handles save errors', async () => {
    mockArticleService.createArticle.mockRejectedValue(new Error('Save failed'))

    const wrapper = createWrapper()
    const component = wrapper.vm as any

    // Fill form
    component.form.title = 'Test Article'
    component.form.content = 'Test content'
    component.form.category_id = 1

    const saveDraftButton = wrapper.findAll('.el-button').find(btn => 
      btn.text().includes('Save as Draft')
    )

    if (saveDraftButton) {
      await saveDraftButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(ElMessage.error).toHaveBeenCalledWith('Save failed')
    }
  })

  it('navigates to articles list on cancel', async () => {
    const pushSpy = vi.spyOn(router, 'push')
    
    const wrapper = createWrapper()

    const cancelButton = wrapper.findAll('.el-button').find(btn => 
      btn.text().includes('Cancel')
    )

    if (cancelButton) {
      await cancelButton.trigger('click')
      expect(pushSpy).toHaveBeenCalledWith('/articles')
    }
  })
})