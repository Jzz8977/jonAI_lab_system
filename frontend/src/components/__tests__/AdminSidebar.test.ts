import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import AdminSidebar from '../AdminSidebar.vue'

describe('AdminSidebar', () => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/dashboard', component: { template: '<div>Dashboard</div>' } },
      { path: '/articles', component: { template: '<div>Articles</div>' } },
      { path: '/categories', component: { template: '<div>Categories</div>' } }
    ]
  })

  const createWrapper = (props = {}) => {
    return mount(AdminSidebar, {
      props: {
        collapsed: false,
        ...props
      },
      global: {
        plugins: [router, ElementPlus],
        stubs: {
          'el-menu': true,
          'el-menu-item': true,
          'el-sub-menu': true,
          'el-button': true,
          'el-icon': true
        }
      }
    })
  }

  it('renders correctly when expanded', () => {
    const wrapper = createWrapper({ collapsed: false })
    
    expect(wrapper.find('.brand').exists()).toBe(true)
    expect(wrapper.find('.brand-collapsed').exists()).toBe(false)
    expect(wrapper.text()).toContain('JonAI-Lab')
    expect(wrapper.text()).toContain('Admin')
  })

  it('renders correctly when collapsed', () => {
    const wrapper = createWrapper({ collapsed: true })
    
    expect(wrapper.find('.brand').exists()).toBe(false)
    expect(wrapper.find('.brand-collapsed').exists()).toBe(true)
    expect(wrapper.find('.brand-icon').text()).toBe('J')
  })

  it('emits toggle-collapse when collapse button is clicked', async () => {
    const wrapper = createWrapper()
    
    const collapseBtn = wrapper.find('.collapse-btn')
    await collapseBtn.trigger('click')
    
    expect(wrapper.emitted('toggle-collapse')).toBeTruthy()
    expect(wrapper.emitted('toggle-collapse')).toHaveLength(1)
  })

  it('computes active menu correctly for dashboard route', async () => {
    await router.push('/dashboard')
    const wrapper = createWrapper()
    
    expect((wrapper.vm as any).activeMenu).toBe('/dashboard')
  })

  it('computes active menu correctly for articles route', async () => {
    await router.push('/articles')
    const wrapper = createWrapper()
    
    expect((wrapper.vm as any).activeMenu).toBe('/articles')
  })

  it('computes active menu correctly for categories route', async () => {
    await router.push('/categories')
    const wrapper = createWrapper()
    
    expect((wrapper.vm as any).activeMenu).toBe('/categories')
  })

  it('defaults to dashboard for unknown routes', async () => {
    await router.push('/unknown')
    const wrapper = createWrapper()
    
    expect((wrapper.vm as any).activeMenu).toBe('/dashboard')
  })
})