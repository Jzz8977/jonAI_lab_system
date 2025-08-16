const request = require('supertest');
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

// Create a simple test app without authentication
const app = express();
app.use(express.json());

// Import category routes without auth middleware
const Category = require('../../models/Category');

// Create routes manually without auth middleware for testing
app.get('/api/categories', async (req, res) => {
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

app.post('/api/categories', async (req, res) => {
  try {
    const { name, description, slug } = req.body;
    
    const categoryData = {
      name: name?.trim(),
      description: description?.trim() || null,
      slug: slug?.trim() || Category.generateSlug(name?.trim() || '')
    };
    
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

describe('Category API (without auth)', () => {
  let db;

  beforeAll(() => {
    const dbPath = path.join(__dirname, '../../data/blog_admin.db');
    db = new Database(dbPath);
  });

  beforeEach(() => {
    // Clean up tables in correct order to avoid foreign key constraints
    db.prepare('DELETE FROM articles').run();
    db.prepare('DELETE FROM categories').run();
  });

  afterAll(() => {
    db.close();
  });

  describe('GET /api/categories', () => {
    it('should return empty array when no categories exist', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('should return all categories', async () => {
      // Insert test categories
      const insertCategory = db.prepare(`
        INSERT INTO categories (name, description, slug)
        VALUES (?, ?, ?)
      `);
      
      insertCategory.run('AI News', 'Latest AI developments', 'ai-news');
      insertCategory.run('Machine Learning', 'ML tutorials and guides', 'machine-learning');

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.categories[0].name).toBe('AI News');
    });
  });

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const categoryData = {
        name: 'AI News',
        description: 'Latest AI developments',
        slug: 'ai-news'
      };

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('AI News');
      expect(response.body.data.slug).toBe('ai-news');
      expect(response.body.data.id).toBeDefined();
    });

    it('should auto-generate slug if not provided', async () => {
      const categoryData = {
        name: 'Machine Learning & AI',
        description: 'ML and AI content'
      };

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe('machine-learning-ai');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/categories')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('Name is required');
    });

    it('should prevent duplicate names', async () => {
      const categoryData = {
        name: 'AI News',
        slug: 'ai-news'
      };

      // Create first category
      await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CATEGORY_EXISTS');
    });
  });
});