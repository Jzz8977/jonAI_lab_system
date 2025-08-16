import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ViewsTrendChart from '../ViewsTrendChart.vue'
import { ElIcon } from 'element-plus'

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: vi.fn().mockImplementation(() => ({
    destroy: vi.fn()
  })),
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  Filler: {},
  register: vi.fn()
}))

const mockTrendData = [
  { date: '2024-01-10', views: 100 },
  { date: '2024-01-11', views: 150 },
  { date: '2024-01-12', views: 200 },
  { date: '2024-01-13', views: 180 },
  { date: '2024-01-14', views: 250 }
]

describe('ViewsTrendChart', () => {
  it('renders empty state when no data', () => {
    const wrapper = mount(ViewsTrendChart, {
      props: {
        data: []
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    expect(wrapper.find('.empty-chart').exists()).toBe(true)
    expect(wrapper.find('.empty-chart p').text()).toBe('No trend data available')
    expect(wrapper.find('canvas').exists()).toBe(false)
  })

  it('renders canvas when data is provided', () => {
    const wrapper = mount(ViewsTrendChart, {
      props: {
        data: mockTrendData
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    expect(wrapper.find('.empty-chart').exists()).toBe(false)
    expect(wrapper.find('canvas').exists()).toBe(true)
  })

  it('has correct canvas dimensions', () => {
    const wrapper = mount(ViewsTrendChart, {
      props: {
        data: mockTrendData
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const canvas = wrapper.find('canvas')
    expect(canvas.attributes('width')).toBe('400')
    expect(canvas.attributes('height')).toBe('200')
  })

  it('updates chart when data changes', async () => {
    const wrapper = mount(ViewsTrendChart, {
      props: {
        data: mockTrendData
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    expect(wrapper.find('canvas').exists()).toBe(true)

    // Change data to empty
    await wrapper.setProps({ data: [] })
    expect(wrapper.find('.empty-chart').exists()).toBe(true)
    expect(wrapper.find('canvas').exists()).toBe(false)

    // Change back to data
    await wrapper.setProps({ data: mockTrendData })
    expect(wrapper.find('.empty-chart').exists()).toBe(false)
    expect(wrapper.find('canvas').exists()).toBe(true)
  })

  it('has correct container styling', () => {
    const wrapper = mount(ViewsTrendChart, {
      props: {
        data: mockTrendData
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const container = wrapper.find('.chart-container')
    expect(container.exists()).toBe(true)
    
    // Check if the container has the expected CSS classes
    const containerElement = container.element as HTMLElement
    const computedStyle = window.getComputedStyle(containerElement)
    expect(computedStyle.position).toBe('relative')
  })

  it('handles data prop reactivity', async () => {
    const wrapper = mount(ViewsTrendChart, {
      props: {
        data: []
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    expect(wrapper.find('.empty-chart').exists()).toBe(true)

    await wrapper.setProps({ data: mockTrendData })
    expect(wrapper.find('.empty-chart').exists()).toBe(false)
    expect(wrapper.find('canvas').exists()).toBe(true)
  })
})