const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const Category = require('../models/Category');

/**
 * Public API Routes (No Authentication Required)
 * 
 * These endpoints are designed for external systems to consume published content.
 * All article endpoints only return published articles for security.
 * 
 * Available endpoints:
 * - GET /api/public/articles - List published articles with filtering/pagination
 * - GET /api/public/articles/:id - Get published article by ID
 * - GET /api/public/articles/slug/:slug - Get published article by slug
 * - GET /api/public/articles/recent - Get recent published articles
 * - GET /api/public/articles/popular - Get popular published articles
 * - GET /api/public/categories - List all categories with pagination
 * - GET /api/public/categories/:id - Get category by ID  
 * - GET /api/public/categories/slug/:slug - Get category by slug
 * - GET /api/public/categories/:id/articles - Get articles for a specific category
 * - GET /api/public/search - Search published articles and categories
 * - GET /api/public/stats - Get public statistics
 */

// GET /api/public/articles/recent - Get recent published articles (no auth required)
router.get('/articles/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const options = {
      status: 'published',
      limit: parseInt(limit),
      orderBy: 'published_at',
      orderDir: 'DESC'
    };
    
    const articles = Article.findAll(options);
    
    res.json({
      success: true,
      data: {
        articles,
        limit: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Public recent articles fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ARTICLES_FETCH_ERROR',
        message: 'Failed to fetch recent articles'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/public/articles/popular - Get popular published articles (no auth required)
router.get('/articles/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const options = {
      status: 'published',
      limit: parseInt(limit),
      orderBy: 'view_count',
      orderDir: 'DESC'
    };
    
    const articles = Article.findAll(options);
    
    res.json({
      success: true,
      data: {
        articles,
        limit: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Public popular articles fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ARTICLES_FETCH_ERROR',
        message: 'Failed to fetch popular articles'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/public/articles - List published articles (no auth required)
router.get('/articles', async (req, res) => {
  try {
    const { limit, offset, orderBy, orderDir, category_id, search } = req.query;
    
    const options = {
      status: 'published' // Only return published articles for public API
    };
    
    if (limit) options.limit = parseInt(limit);
    if (offset) options.offset = parseInt(offset);
    if (orderBy) options.orderBy = orderBy;
    if (orderDir) options.orderDir = orderDir;
    if (category_id) options.category_id = parseInt(category_id);
    if (search) options.search = search;
    
    const articles = Article.findAll(options);
    const total = Article.count({ status: 'published', category_id: options.category_id, search: options.search });
    
    res.json({
      success: true,
      data: {
        articles,
        total,
        limit: options.limit || null,
        offset: options.offset || 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Public articles list error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ARTICLES_FETCH_ERROR',
        message: 'Failed to fetch articles'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/public/articles/:id - Get published article by ID (no auth required)
router.get('/articles/:id', async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    
    if (isNaN(articleId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ARTICLE_ID',
          message: 'Invalid article ID'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const article = Article.findById(articleId);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Only return published articles for public API
    if (article.status !== 'published') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: {
        article
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Public article fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ARTICLE_FETCH_ERROR',
        message: 'Failed to fetch article'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/public/articles/slug/:slug - Get published article by slug (no auth required)
router.get('/articles/slug/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    
    if (!slug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SLUG',
          message: 'Invalid article slug'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const article = Article.findBySlug(slug);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Only return published articles for public API
    if (article.status !== 'published') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: {
        article
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Public article fetch by slug error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ARTICLE_FETCH_ERROR',
        message: 'Failed to fetch article'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/public/categories - List all categories (no auth required)
router.get('/categories', async (req, res) => {
  try {
    const { limit, offset, orderBy, orderDir } = req.query;
    
    const options = {};
    if (limit) options.limit = parseInt(limit);
    if (offset) options.offset = parseInt(offset);
    if (orderBy) options.orderBy = orderBy;
    if (orderDir) options.orderDir = orderDir;
    
    const category = new Category();
    const categories = category.findAll(options);
    const total = category.count();
    
    res.json({
      success: true,
      data: {
        categories,
        total,
        limit: options.limit || null,
        offset: options.offset || 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Public categories list error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CATEGORIES_FETCH_ERROR',
        message: 'Failed to fetch categories'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/public/categories/:id - Get category by ID (no auth required)
router.get('/categories/:id', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: 'Invalid category ID'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const categoryModel = new Category();
    const category = categoryModel.findById(categoryId);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: {
        category
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Public category fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CATEGORY_FETCH_ERROR',
        message: 'Failed to fetch category'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/public/categories/slug/:slug - Get category by slug (no auth required)
router.get('/categories/slug/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    
    if (!slug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SLUG',
          message: 'Invalid category slug'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const categoryModel = new Category();
    const category = categoryModel.findBySlug(slug);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: {
        category
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Public category fetch by slug error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CATEGORY_FETCH_ERROR',
        message: 'Failed to fetch category'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/public/categories/:id/articles - Get articles for a specific category (no auth required)
router.get('/categories/:id/articles', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const { limit, offset, orderBy, orderDir } = req.query;
    
    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: 'Invalid category ID'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Check if category exists
    const categoryModel = new Category();
    const category = categoryModel.findById(categoryId);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const options = {
      status: 'published',
      category_id: categoryId
    };
    
    if (limit) options.limit = parseInt(limit);
    if (offset) options.offset = parseInt(offset);
    if (orderBy) options.orderBy = orderBy;
    if (orderDir) options.orderDir = orderDir;
    
    const articles = Article.findAll(options);
    const total = Article.count({ status: 'published', category_id: categoryId });
    
    res.json({
      success: true,
      data: {
        category,
        articles,
        total,
        limit: options.limit || null,
        offset: options.offset || 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Public category articles fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ARTICLES_FETCH_ERROR',
        message: 'Failed to fetch category articles'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/public/articles/recent - Get recent published articles (no auth required)
router.get('/articles/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const options = {
      status: 'published',
      limit: parseInt(limit),
      orderBy: 'published_at',
      orderDir: 'DESC'
    };
    
    const articles = Article.findAll(options);
    
    res.json({
      success: true,
      data: {
        articles,
        limit: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Public recent articles fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ARTICLES_FETCH_ERROR',
        message: 'Failed to fetch recent articles'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/public/articles/popular - Get popular published articles (no auth required)
router.get('/articles/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const options = {
      status: 'published',
      limit: parseInt(limit),
      orderBy: 'view_count',
      orderDir: 'DESC'
    };
    
    const articles = Article.findAll(options);
    
    res.json({
      success: true,
      data: {
        articles,
        limit: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Public popular articles fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ARTICLES_FETCH_ERROR',
        message: 'Failed to fetch popular articles'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/public/search - Search published articles and categories (no auth required)
router.get('/search', async (req, res) => {
  try {
    const { q, type = 'all', limit = 20, offset = 0 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query is required'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const results = {};
    
    if (type === 'all' || type === 'articles') {
      const articleOptions = {
        status: 'published',
        search: q.trim(),
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
      results.articles = Article.findAll(articleOptions);
      results.articlesTotal = Article.count({ status: 'published', search: q.trim() });
    }
    
    if (type === 'all' || type === 'categories') {
      const categoryModel = new Category();
      const categoryOptions = {
        search: q.trim(),
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
      results.categories = categoryModel.findAll(categoryOptions) || [];
      results.categoriesTotal = categoryModel.count(categoryOptions) || 0;
    }
    
    res.json({
      success: true,
      data: {
        query: q.trim(),
        type,
        results,
        limit: parseInt(limit),
        offset: parseInt(offset)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Public search error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'Failed to perform search'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/public/stats - Get public statistics (no auth required)
router.get('/stats', async (_, res) => {
  try {
    const publishedArticlesCount = Article.count({ status: 'published' });
    const categoryModel = new Category();
    const totalCategories = categoryModel.count();
    
    // Get most popular articles (top 5)
    const popularArticles = Article.findAll({
      status: 'published',
      limit: 5,
      orderBy: 'view_count',
      orderDir: 'DESC'
    });
    
    // Get recent articles (top 5)
    const recentArticles = Article.findAll({
      status: 'published',
      limit: 5,
      orderBy: 'published_at',
      orderDir: 'DESC'
    });
    
    res.json({
      success: true,
      data: {
        statistics: {
          publishedArticles: publishedArticlesCount,
          totalCategories,
          lastUpdated: new Date().toISOString()
        },
        popularArticles: popularArticles.map(article => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          view_count: article.view_count,
          published_at: article.published_at
        })),
        recentArticles: recentArticles.map(article => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          published_at: article.published_at
        }))
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Public stats fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_FETCH_ERROR',
        message: 'Failed to fetch statistics'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;