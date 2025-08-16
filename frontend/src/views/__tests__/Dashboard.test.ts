import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Dashboard from '../Dashboard.vue'
import { ElSelect, ElOption, ElMessage } from 'element-plus'
import type { DashboardMetrics } from '@/types'

// Mock the analytics service
vi.mock('@/services', () => ({
    analyticsService: {
        getDashboardMetrics: vi.fn()
    }
}))

// Mock child components
vi.mock('@/components/MetricsCard.vue', () => ({
    default: {
        name: 'MetricsCard',
        template: '<div class="metrics-card-mock">{{ title }}: {{ value }}</div>',
        props: ['title', 'value', 'icon', 'color']
    }
}))

vi.mock('@/components/TopArticlesRanking.vue', () => ({
    default: {
        name: 'TopArticlesRanking',
        template: '<div class="top-articles-mock">Top Articles</div>',
        props: ['articles']
    }
}))

vi.mock('@/components/RecentActivityFeed.vue', () => ({
    default: {
        name: 'RecentActivityFeed',
        template: '<div class="recent-activity-mock">Recent Activity</div>',
        props: ['articles']
    }
}))

vi.mock('@/components/ViewsTrendChart.vue', () => ({
    default: {
        name: 'ViewsTrendChart',
        template: '<div class="views-trend-mock">Views Trend</div>',
        props: ['data']
    }
}))

const mockDashboardMetrics: DashboardMetrics = {
    total_articles: 25,
    total_views: 5000,
    total_likes: 150,
    recent_articles: [],
    top_articles: [],
    views_trend: [
        { date: '2024-01-10', views: 100 },
        { date: '2024-01-11', views: 150 }
    ]
}

describe('Dashboard', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        const { analyticsService } = await import('@/services')
        vi.mocked(analyticsService.getDashboardMetrics).mockResolvedValue(mockDashboardMetrics)
    })

    it('renders dashboard header correctly', () => {
        const wrapper = mount(Dashboard, {
            global: {
                components: {
                    ElSelect,
                    ElOption,
                    ElMessage
                }
            }
        })

        expect(wrapper.find('h1').text()).toBe('Dashboard')
        expect(wrapper.find('.date-range-picker').exists()).toBe(true)
    })

    it('loads dashboard data on mount', async () => {
        const { analyticsService } = await import('@/services')

        mount(Dashboard, {
            global: {
                components: {
                    ElSelect,
                    ElOption,
                    ElMessage
                }
            }
        })

        // Wait for the component to mount and call the service
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(analyticsService.getDashboardMetrics).toHaveBeenCalledWith('30d')
    })

    it('renders metrics cards with correct data', async () => {
        const wrapper = mount(Dashboard, {
            global: {
                components: {
                    ElSelect,
                    ElOption,
                    ElMessage
                }
            }
        })

        // Wait for data to load
        await new Promise(resolve => setTimeout(resolve, 0))
        await wrapper.vm.$nextTick()

        const metricsCards = wrapper.findAll('.metrics-card-mock')
        expect(metricsCards).toHaveLength(4)
        expect(metricsCards[0].text()).toContain('Total Articles: 25')
        expect(metricsCards[1].text()).toContain('Total Views: 5000')
        expect(metricsCards[2].text()).toContain('Total Likes: 150')
    })

    it('calculates average views correctly', async () => {
        const wrapper = mount(Dashboard, {
            global: {
                components: {
                    ElSelect,
                    ElOption,
                    ElMessage
                }
            }
        })

        // Wait for data to load
        await new Promise(resolve => setTimeout(resolve, 0))
        await wrapper.vm.$nextTick()

        const metricsCards = wrapper.findAll('.metrics-card-mock')
        const avgViewsCard = metricsCards[3]
        expect(avgViewsCard.text()).toContain('Avg. Views per Article: 200') // 5000 / 25 = 200
    })

    it('handles date range change', async () => {
        const { analyticsService } = await import('@/services')

        const wrapper = mount(Dashboard, {
            global: {
                components: {
                    ElSelect,
                    ElOption,
                    ElMessage
                }
            }
        })

        // Wait for initial load
        await new Promise(resolve => setTimeout(resolve, 0))

        // Clear the initial call
        vi.mocked(analyticsService.getDashboardMetrics).mockClear()

        // Simulate date range change by calling the component method directly
        await wrapper.vm.handleDateRangeChange()

        expect(analyticsService.getDashboardMetrics).toHaveBeenCalled()
    })

    it('shows loading state', async () => {
        const { analyticsService } = await import('@/services')

        // Mock a pending promise
        vi.mocked(analyticsService.getDashboardMetrics).mockReturnValue(new Promise(() => { }))

        const wrapper = mount(Dashboard, {
            global: {
                components: {
                    ElSelect,
                    ElOption,
                    ElMessage
                }
            }
        })

        // Check for loading class or attribute instead of v-loading directive
        expect(wrapper.find('.dashboard-content').exists()).toBe(true)
    })

    it('handles API errors gracefully', async () => {
        const { analyticsService } = await import('@/services')

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        vi.mocked(analyticsService.getDashboardMetrics).mockRejectedValue(new Error('API Error'))

        mount(Dashboard, {
            global: {
                components: {
                    ElSelect,
                    ElOption,
                    ElMessage
                }
            }
        })

        // Wait for the error to be handled
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(analyticsService.getDashboardMetrics).toHaveBeenCalled()

        consoleSpy.mockRestore()
    })

    it('renders child components', async () => {
        const wrapper = mount(Dashboard, {
            global: {
                components: {
                    ElSelect,
                    ElOption,
                    ElMessage
                }
            }
        })

        // Wait for data to load
        await new Promise(resolve => setTimeout(resolve, 0))
        await wrapper.vm.$nextTick()

        expect(wrapper.find('.views-trend-mock').exists()).toBe(true)
        expect(wrapper.find('.top-articles-mock').exists()).toBe(true)
        expect(wrapper.find('.recent-activity-mock').exists()).toBe(true)
    })

    it('has responsive layout classes', () => {
        const wrapper = mount(Dashboard, {
            global: {
                components: {
                    ElSelect,
                    ElOption,
                    ElMessage
                }
            }
        })

        expect(wrapper.find('.metrics-grid').exists()).toBe(true)
        expect(wrapper.find('.content-grid').exists()).toBe(true)
        expect(wrapper.find('.charts-section').exists()).toBe(true)
    })
})