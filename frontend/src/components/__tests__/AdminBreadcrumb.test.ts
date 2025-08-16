import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import AdminBreadcrumb from '../AdminBreadcrumb.vue'

describe('AdminBreadcrumb', () => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/dashboard', component: { template: '<div>Dashboard</div>' } },
      { path: '/articles', component: { template: '<div>Articles</div>' } },
      { path: '/articles/new', component: { template: '<div>New Article</div>' } },
      { path: '/categories', component: { template: '<div>Categories</div>' } }
    ]
  })

  const createWrapper = () => {
    return mount(AdminBreadcrumb, {
      global: {
        plugins: [router, ElementPlus],
        stubs: {
          'el-breadcrumb': true,
          'el-breadcrumb-item': true,
          'el-icon': true
        }
      }
    })
  }

  it('generates correct breadcrumb for dashboard route', async () => {
    await router.push('/dashboard')
    const wrapper = createWrapper()
    
    const items = (wrapper.vm as any).breadcrumbItems
    expect(items).toHaveLength(2)
    expect(items[0].title).toBe('Home')
    expect(items[1].title).toBe('Dashboard')
  })

  it('generates correct breadcrumb for articles route', async () => {
    await router.push('/articles')
    const wrapper = createWrapper()
    
    const items = (wrapper.vm as any).breadcrumbItems
    expect(items).toHaveLength(2)
    expect(items[0].title).toBe('Home')
    expect(items[1].title).toBe('Articles')
  })

  it('generates correct breadcrumb for new article route', async () => {
    await router.push('/articles/new')
    const wrapper = createWrapper()
    
    const items = (wrapper.vm as any).breadcrumbItems
    expect(items).toHaveLength(3)
    expect(items[0].title).toBe('Home')
    expect(items[1].title).toBe('Articles')
    expect(items[2].title).toBe('New Article')
  })

  it('generates correct breadcrumb for categories route', async () => {
    await router.push('/categories')
    const wrapper = createWrapper()
    
    const items = (wrapper.vm as any).breadcrumbItems
    expect(items).toHaveLength(2)
    expect(items[0].title).toBe('Home')
    expect(items[1].title).toBe('Categories')
  })

  it('handles dynamic article edit routes', async () => {
    await router.push('/articles/123/edit')
    const wrapper = createWrapper()
    
    const items = (wrapper.vm as any).breadcrumbItems
    expect(items).toHaveLength(3)
    expect(items[0].title).toBe('Home')
    expect(items[1].title).toBe('Articles')
    expect(items[2].title).toBe('Edit Article')
  })

  it('handles dynamic article detail routes', async () => {
    await router.push('/articles/123')
    const wrapper = createWrapper()
    
    const items = (wrapper.vm as any).breadcrumbItems
    expect(items).toHaveLength(3)
    expect(items[0].title).toBe('Home')
    expect(items[1].title).toBe('Articles')
    expect(items[2].title).toBe('Article Details')
  })

  it('provides correct navigation links', async () => {
    await router.push('/articles/new')
    const wrapper = createWrapper()
    
    const items = (wrapper.vm as any).breadcrumbItems
    expect(items[0].to).toBe('/dashboard')
    expect(items[1].to).toBe('/articles')
    expect(items[2].to).toBeUndefined() // Last item should not be clickable
  })

  it('falls back to path-based breadcrumb for unknown routes', async () => {
    await router.push('/unknown/path')
    const wrapper = createWrapper()
    
    const items = (wrapper.vm as any).breadcrumbItems
    expect(items).toHaveLength(3)
    expect(items[0].title).toBe('Home')
    expect(items[1].title).toBe('Unknown')
    expect(items[2].title).toBe('Path')
  })
})