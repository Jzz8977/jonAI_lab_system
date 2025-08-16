const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const Category = require('../models/Category');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// Middleware to validate article data
const validateArticleData = (req, res, next) => {
  // For creation, we'll set author_id from authenticated user, so don't validate it here
  const dataToValidate = { ...req.body };
  if (req.user && req.user.id) {
    dataToValidate.author_id = req.user.id;
  }
  
  const errors = Article.validateArticleData(dataToValidate);
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid article data',
        details: errors
      }
    });
  }
  
  next();
};

// Middleware to check if category exists
const validateCategory = async (req, res, next) => {
  if (req.body.category_id) {
    try {
      const dbManager = require('../config/database');
      const db = dbManager.getDatabase();
      const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(req.body.category_id);
      
      if (!category) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: 'Category not found'
          }
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Error validating category'
        }
      });
    }
  }
  
  next();
};

// GET /api/articles - List articles with pagination and filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      status,
      category_id,
      author_id,
      page = 1,
      limit = 10,
      orderBy = 'created_at',
      orderDir = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const options = {
      status,
      category_id: category_id ? parseInt(category_id) : undefined,
      author_id: author_id ? parseInt(author_id) : undefined,
      limit: parseInt(limit),
      offset,
      orderBy,
      orderDir: orderDir.toUpperCase(),
      includeRelations: true
    };

    const articles = Article.findAll(options);
    const totalCount = Article.count({
      status,
      category_id: category_id ? parseInt(category_id) : undefined,
      author_id: author_id ? parseInt(author_id) : undefined
    });

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error fetching articles'
      }
    });
  }
});

// GET /api/articles/:id - Get article by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Article ID must be a valid integer'
        }
      });
    }

    const article = Article.findById(parseInt(id), true);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article not found'
        }
      });
    }

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error fetching article'
      }
    });
  }
});

// GET /api/articles/slug/:slug - Get article by slug
router.get('/slug/:slug', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    
    const article = Article.findBySlug(slug, true);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article not found'
        }
      });
    }

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Error fetching article by slug:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error fetching article'
      }
    });
  }
});

// POST /api/articles - Create new article
router.post('/', authenticate, validateArticleData, validateCategory, async (req, res) => {
  try {
    const articleData = {
      ...req.body,
      author_id: req.user.id // Set author from authenticated user
    };

    const article = await Article.create(articleData);
    
    res.status(201).json({
      success: true,
      data: article,
      message: 'Article created successfully'
    });
  } catch (error) {
    console.error('Error creating article:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_SLUG',
          message: error.message
        }
      });
    }
    
    if (error.message.includes('Invalid category_id')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error creating article'
      }
    });
  }
});

// PUT /api/articles/:id - Update article
router.put('/:id', authenticate, validateCategory, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Article ID must be a valid integer'
        }
      });
    }

    const article = Article.findById(parseInt(id));
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article not found'
        }
      });
    }

    // Validate update data (partial validation)
    const updateData = req.body;
    const errors = [];

    if (updateData.title !== undefined) {
      if (!updateData.title || updateData.title.trim().length === 0) {
        errors.push('Title cannot be empty');
      }
      if (updateData.title && updateData.title.length > 255) {
        errors.push('Title must be less than 255 characters');
      }
    }

    if (updateData.content !== undefined) {
      if (!updateData.content || updateData.content.trim().length === 0) {
        errors.push('Content cannot be empty');
      }
    }

    if (updateData.status !== undefined) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(updateData.status)) {
        errors.push('Status must be one of: draft, published, archived');
      }
    }

    if (updateData.excerpt && updateData.excerpt.length > 500) {
      errors.push('Excerpt must be less than 500 characters');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data',
          details: errors
        }
      });
    }

    const updatedArticle = await article.update(updateData);
    
    res.json({
      success: true,
      data: updatedArticle,
      message: 'Article updated successfully'
    });
  } catch (error) {
    console.error('Error updating article:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_SLUG',
          message: error.message
        }
      });
    }
    
    if (error.message.includes('Invalid category_id')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error updating article'
      }
    });
  }
});

// POST /api/articles/:id/publish - Publish article
router.post('/:id/publish', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Article ID must be a valid integer'
        }
      });
    }

    const article = Article.findById(parseInt(id));
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article not found'
        }
      });
    }

    const publishedArticle = await article.publish();
    
    res.json({
      success: true,
      data: publishedArticle,
      message: 'Article published successfully'
    });
  } catch (error) {
    console.error('Error publishing article:', error);
    
    if (error.message.includes('already published')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_PUBLISHED',
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error publishing article'
      }
    });
  }
});

// POST /api/articles/:id/archive - Archive article
router.post('/:id/archive', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Article ID must be a valid integer'
        }
      });
    }

    const article = Article.findById(parseInt(id));
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article not found'
        }
      });
    }

    const archivedArticle = await article.archive();
    
    res.json({
      success: true,
      data: archivedArticle,
      message: 'Article archived successfully'
    });
  } catch (error) {
    console.error('Error archiving article:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error archiving article'
      }
    });
  }
});

// DELETE /api/articles/:id - Delete article
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Article ID must be a valid integer'
        }
      });
    }

    const article = Article.findById(parseInt(id));
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article not found'
        }
      });
    }

    const deleted = Article.delete(parseInt(id));
    
    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete article'
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error deleting article'
      }
    });
  }
});

module.exports = router;