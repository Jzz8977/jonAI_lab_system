import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TopArticlesRanking from '../TopArticlesRanking.vue'
import { ElIcon } from 'element-plus'
import type { Article } from '@/types'

const mockArticles: Article[] = [
  {
    id: 1,
    title: 'Top Article',
    slug: 'top-article',
    content: 'Content',
    excerpt: 'Excerpt',
    thumbnail_url: 'https://example.com/image1.jpg',
    category: { id: 1, name: 'AI News', slug: 'ai-news', description: '', created_at: '', updated_at: '' },
    author: { id: 1, username: 'admin', email: 'admin@example.com', role: 'admin', created_at: '', updated_at: '' },
    status: 'published',
    view_count: 1500,
    like_count: 25,
    published_at: '2024-01-15T10:00:00Z',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    title: 'Second Article',
    slug: 'second-article',
    content: 'Content',
    excerpt: 'Excerpt',
    thumbnail_url: undefined,
    category: { id: 2, name: 'Tech', slug: 'tech', description: '', created_at: '', updated_at: '' },
    author: { id: 1, username: 'admin', email: 'admin@example.com', role: 'admin', created_at: '', updated_at: '' },
    status: 'published',
    view_count: 800,
    like_count: 12,
    published_at: '2024-01-14T10:00:00Z',
    created_at: '2024-01-14T10:00:00Z',
    updated_at: '2024-01-14T10:00:00Z'
  }
]

describe('TopArticlesRanking', () => {
  it('renders empty state when no articles', () => {
    const wrapper = mount(TopArticlesRanking, {
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
    expect(wrapper.find('.empty-state p').text()).toBe('No articles found')
  })

  it('renders articles list correctly', () => {
    const wrapper = mount(TopArticlesRanking, {
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
    expect(wrapper.findAll('.article-item')).toHaveLength(2)
  })

  it('displays correct ranking badges', () => {
    const wrapper = mount(TopArticlesRanking, {
      props: {
        articles: mockArticles
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const rankNumbers = wrapper.findAll('.rank-number')
    expect(rankNumbers[0].text()).toBe('1')
    expect(rankNumbers[0].classes()).toContain('rank-gold')
    expect(rankNumbers[1].text()).toBe('2')
    expect(rankNumbers[1].classes()).toContain('rank-silver')
  })

  it('displays article information correctly', () => {
    const wrapper = mount(TopArticlesRanking, {
      props: {
        articles: mockArticles
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const firstArticle = wrapper.findAll('.article-item')[0]
    expect(firstArticle.find('.article-title').text()).toBe('Top Article')
    expect(firstArticle.find('.category').text()).toBe('AI News')
  })

  it('formats view and like counts correctly', () => {
    const wrapper = mount(TopArticlesRanking, {
      props: {
        articles: mockArticles
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const firstArticle = wrapper.findAll('.article-item')[0]
    const statItems = firstArticle.findAll('.stat-item span')
    expect(statItems[0].text()).toBe('1.5K') // 1500 views formatted
    expect(statItems[1].text()).toBe('25') // 25 likes
  })

  it('handles missing thumbnail gracefully', () => {
    const wrapper = mount(TopArticlesRanking, {
      props: {
        articles: mockArticles
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const secondArticle = wrapper.findAll('.article-item')[1]
    const thumbnail = secondArticle.find('.article-thumbnail')
    expect(thumbnail.find('img').exists()).toBe(false)
    expect(thumbnail.find('.thumbnail-placeholder').exists()).toBe(true)
  })

  it('formats dates correctly', () => {
    const wrapper = mount(TopArticlesRanking, {
      props: {
        articles: mockArticles
      },
      global: {
        components: {
          ElIcon
        }
      }
    })

    const firstArticle = wrapper.findAll('.article-item')[0]
    const dateElement = firstArticle.find('.date')
    expect(dateElement.text()).toMatch(/Jan \d+, 2024/)
  })
})