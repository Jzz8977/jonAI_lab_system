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
 * - GET /api/public/categories - List all categories with pagination
 * - GET /api/public/categories/:id - Get category by ID
 * - GET /api/public/categories/slug/:slug - Get category by slug
 */

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

module.exports = router;