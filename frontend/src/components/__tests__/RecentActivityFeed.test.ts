import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import RecentActivityFeed from '../RecentActivityFeed.vue'
import { ElIcon } from 'element-plus'
import type { Article } from '@/types'

const mockArticles: Article[] = [
  {
    id: 1,
    title: 'Recent Published Article',
    slug: 'recent-published-article',
    content: 'Content',
    excerpt: 'Excerpt',
    thumbnail_url: 'https://example.com/image1.jpg',
    category: { id: 1, name: 'AI News', slug: 'ai-news', description: '', created_at: '', updated_at: '' },
    author: { id: 1, username: 'admin', email: 'admin@example.com', role: 'admin', created_at: '', updated_at: '' },
    status: 'published',
    view_count: 150,
    like_count: 5,
    published_at: '2024-01-15T10:00:00Z',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    title: 'Draft Article',
    slug: 'draft-article',
    content: 'Content',
    excerpt: 'Excerpt',
    thumbnail_url: undefined,
    category: { id: 2, name: 'Tech', slug: 'tech', description: '', created_at: '', updated_at: '' },
    author: { id: 1, username: 'admin', email: 'admin@example.com', role: 'admin', created_at: '', updated_at: '' },
    status: 'draft',
    view_count: 0,
    like_count: 0,
    published_at: null,
    created_at: '2024-01-14T10:00:00Z',
    updated_at: '2024-01-14T10:00:00Z'
  }
]

describe('RecentActivityFeed', () => {
  beforeEach(() => {
    // Mock Date.now() to ensure consistent relative time calculations
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders empty state when no articles', () => {
    const wrapper = mount(RecentActivityFeed, {
      props: {
        articles: []
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.empty-state p').text()).toBe('No recent activity')
  })

  it('renders activity list correctly', () => {
    const wrapper = mount(RecentActivityFeed, {
      props: {
        articles: mockArticles
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    expect(wrapper.find('.empty-state').exists()).toBe(false)
    expect(wrapper.findAll('.activity-item')).toHaveLength(2)
  })

  it('displays correct status indicators', () => {
    const wrapper = mount(RecentActivityFeed, {
      props: {
        articles: mockArticles
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const statusElements = wrapper.findAll('.activity-status')
    expect(statusElements[0].text()).toBe('Published')
    expect(statusElements[0].classes()).toContain('status-published')
    expect(statusElements[1].text()).toBe('Draft')
    expect(statusElements[1].classes()).toContain('status-draft')
  })

  it('displays article information correctly', () => {
    const wrapper = mount(RecentActivityFeed, {
      props: {
        articles: mockArticles
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const firstActivity = wrapper.findAll('.activity-item')[0]
    expect(firstActivity.find('.activity-title').text()).toBe('Recent Published Article')
    expect(firstActivity.find('.activity-category').text()).toBe('AI News')
    expect(firstActivity.find('.activity-author').text()).toBe('by admin')
  })

  it('displays view and like counts', () => {
    const wrapper = mount(RecentActivityFeed, {
      props: {
        articles: mockArticles
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const firstActivity = wrapper.findAll('.activity-item')[0]
    const statGroups = firstActivity.findAll('.stat-group span')
    expect(statGroups[0].text()).toBe('150') // views
    expect(statGroups[1].text()).toBe('5') // likes
  })

  it('calculates relative time correctly', () => {
    const wrapper = mount(RecentActivityFeed, {
      props: {
        articles: mockArticles
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const activityDates = wrapper.findAll('.activity-date')
    expect(activityDates[0].text()).toBe('2 hours ago') // 2024-01-15T10:00:00Z vs 2024-01-15T12:00:00Z
    expect(activityDates[1].text()).toBe('1 day ago') // 2024-01-14T10:00:00Z vs 2024-01-15T12:00:00Z
  })

  it('handles archived status correctly', () => {
    const archivedArticle: Article = {
      ...mockArticles[0],
      status: 'archived'
    }

    const wrapper = mount(RecentActivityFeed, {
      props: {
        articles: [archivedArticle]
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const statusElement = wrapper.find('.activity-status')
    expect(statusElement.text()).toBe('Archived')
    expect(statusElement.classes()).toContain('status-archived')
  })

  it('truncates long titles correctly', () => {
    const longTitleArticle: Article = {
      ...mockArticles[0],
      title: 'This is a very long article title that should be truncated when displayed in the activity feed to prevent layout issues'
    }

    const wrapper = mount(RecentActivityFeed, {
      props: {
        articles: [longTitleArticle]
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const titleElement = wrapper.find('.activity-title')
    expect(titleElement.text()).toBe(longTitleArticle.title)
    // The truncation is handled by CSS, so we just verify the element exists and has the correct CSS class
    expect(titleElement.exists()).toBe(true)
    expect(titleElement.classes()).toContain('activity-title')
  })
})