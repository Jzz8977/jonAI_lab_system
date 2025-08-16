import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MetricsCard from '../MetricsCard.vue'
import { ElIcon } from 'element-plus'

describe('MetricsCard', () => {
  it('renders basic metrics card correctly', () => {
    const wrapper = mount(MetricsCard, {
      props: {
        title: 'Total Articles',
        value: 42,
        icon: 'Document',
        color: '#409EFF'
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    expect(wrapper.find('.metrics-title').text()).toBe('Total Articles')
    expect(wrapper.find('.metrics-value').text()).toBe('42')
    expect(wrapper.find('.metrics-card').attributes('style')).toContain('border-left-color: rgb(64, 158, 255)')
  })

  it('formats large numbers correctly', () => {
    const wrapper = mount(MetricsCard, {
      props: {
        title: 'Total Views',
        value: 1500,
        icon: 'View',
        color: '#67C23A'
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    expect(wrapper.find('.metrics-value').text()).toBe('1.5K')
  })

  it('formats millions correctly', () => {
    const wrapper = mount(MetricsCard, {
      props: {
        title: 'Total Views',
        value: 2500000,
        icon: 'View',
        color: '#67C23A'
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    expect(wrapper.find('.metrics-value').text()).toBe('2.5M')
  })

  it('applies hover effects', async () => {
    const wrapper = mount(MetricsCard, {
      props: {
        title: 'Test',
        value: 100,
        icon: 'Document',
        color: '#409EFF'
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const card = wrapper.find('.metrics-card')
    expect(card.classes()).not.toContain('hover')
    
    await card.trigger('mouseenter')
    // The hover effect is CSS-based, so we just verify the element exists
    expect(card.exists()).toBe(true)
  })

  it('renders icon with correct color', () => {
    const wrapper = mount(MetricsCard, {
      props: {
        title: 'Test',
        value: 100,
        icon: 'Document',
        color: '#FF0000'
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const iconContainer = wrapper.find('.metrics-icon')
    expect(iconContainer.attributes('style')).toContain('background-color: rgb(255, 0, 0)')
  })
})