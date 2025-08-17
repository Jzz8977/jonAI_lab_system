const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all category routes
router.use(authenticate);

// GET /api/categories - List all categories
router.get('/', async (req, res) => {
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
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_CATEGORIES_ERROR',
        message: 'Failed to fetch categories'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/categories/:id - Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: 'Valid category ID is required'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const category = new Category();
    const categoryData = category.findById(parseInt(id));
    
    if (!categoryData) {
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
      data: categoryData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_CATEGORY_ERROR',
        message: 'Failed to fetch category'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/categories - Create new category
router.post('/', async (req, res) => {
  try {
    const { name, description, slug } = req.body;
    
    // Auto-generate slug if not provided
    const categoryData = {
      name: name?.trim(),
      description: description?.trim() || null,
      slug: slug?.trim() || Category.generateSlug(name?.trim() || '')
    };
    
    // Validate input
    const validationErrors = Category.validate(categoryData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid category data',
          details: validationErrors
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const category = new Category();
    const newCategory = category.create(categoryData);
    
    res.status(201).json({
      success: true,
      data: newCategory,
      message: 'Category created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating category:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CATEGORY_EXISTS',
          message: error.message
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_CATEGORY_ERROR',
        message: 'Failed to create category'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, slug } = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: 'Valid category ID is required'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Auto-generate slug if not provided
    const categoryData = {
      name: name?.trim(),
      description: description?.trim() || null,
      slug: slug?.trim() || Category.generateSlug(name?.trim() || '')
    };
    
    // Validate input
    const validationErrors = Category.validate(categoryData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid category data',
          details: validationErrors
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const category = new Category();
    const updatedCategory = category.update(parseInt(id), categoryData);
    
    res.json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating category:', error);
    
    if (error.message === 'Category not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CATEGORY_EXISTS',
          message: error.message
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_CATEGORY_ERROR',
        message: 'Failed to update category'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: 'Valid category ID is required'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const category = new Category();
    const result = category.delete(parseInt(id));
    
    res.json({
      success: true,
      data: result,
      message: 'Category deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    
    if (error.message === 'Category not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.message.includes('associated articles')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CATEGORY_HAS_ARTICLES',
          message: error.message
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_CATEGORY_ERROR',
        message: 'Failed to delete category'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/categories/stats - Get categories with article counts
router.get('/stats', async (_, res) => {
  try {
    const Article = require('../models/Article');
    const category = new Category();
    const categories = category.findAll();
    
    const categoriesWithStats = categories.map(cat => {
      const articleCount = Article.count({ category_id: cat.id });
      const publishedCount = Article.count({ category_id: cat.id, status: 'published' });
      
      return {
        ...cat,
        article_count: articleCount,
        published_count: publishedCount
      };
    });
    
    res.json({
      success: true,
      data: {
        categories: categoriesWithStats,
        total: categoriesWithStats.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_CATEGORY_STATS_ERROR',
        message: 'Failed to fetch category statistics'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/categories/:id/articles - Get articles for a specific category
router.get('/:id/articles', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, limit, offset, orderBy, orderDir } = req.query;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY_ID',
          message: 'Valid category ID is required'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Check if category exists
    const category = new Category();
    const categoryData = category.findById(parseInt(id));
    
    if (!categoryData) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const Article = require('../models/Article');
    const options = {
      category_id: parseInt(id)
    };
    
    if (status) options.status = status;
    if (limit) options.limit = parseInt(limit);
    if (offset) options.offset = parseInt(offset);
    if (orderBy) options.orderBy = orderBy;
    if (orderDir) options.orderDir = orderDir;
    
    const articles = Article.findAll(options);
    const total = Article.count({ category_id: parseInt(id), status });
    
    res.json({
      success: true,
      data: {
        category: categoryData,
        articles,
        total,
        limit: options.limit || null,
        offset: options.offset || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching category articles:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_CATEGORY_ARTICLES_ERROR',
        message: 'Failed to fetch category articles'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/categories/slug/:slug - Get category by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SLUG',
          message: 'Valid category slug is required'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const category = new Category();
    const categoryData = category.findBySlug(slug);
    
    if (!categoryData) {
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
      data: categoryData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching category by slug:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_CATEGORY_ERROR',
        message: 'Failed to fetch category'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;