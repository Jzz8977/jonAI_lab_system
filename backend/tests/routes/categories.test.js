const request = require('supertest');
const Database = require('better-sqlite3');
const path = require('path');
const jwt = require('jsonwebtoken');

// Create app without starting server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import routes
const apiRoutes = require('../../routes');

// API routes
app.use('/api', apiRoutes);

describe('Category Routes', () => {
  let db;
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // Set up test database
    const dbPath = path.join(__dirname, '../../data/blog_admin.db');
    db = new Database(dbPath);
    
    // Clean up any existing test users
    db.prepare('DELETE FROM users WHERE email LIKE ?').run('%test%');
    
    // Create test user using the User model
    const User = require('../../models/User');
    const testUser = await User.create({
      username: 'testuser_categories',
      email: 'test_categories@example.com',
      password: 'testpassword',
      role: 'admin'
    });
    
    testUserId = testUser.id;
    
    // Generate auth token with correct payload structure
    authToken = jwt.sign(
      { id: testUserId, username: 'testuser_categories' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    // Clean up tables in correct order to avoid foreign key constraints
    db.prepare('DELETE FROM articles').run();
    db.prepare('DELETE FROM categories').run();
  });

  afterAll(() => {
    // Clean up test data
    db.prepare('DELETE FROM articles').run();
    db.prepare('DELETE FROM categories').run();
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    db.close();
  });

  describe('GET /api/categories', () => {
    it('should return empty array when no categories exist', async () => {
      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
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
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.categories[0].name).toBe('AI News');
    });

    it('should support pagination', async () => {
      // Insert test categories
      const insertCategory = db.prepare(`
        INSERT INTO categories (name, description, slug)
        VALUES (?, ?, ?)
      `);
      
      for (let i = 1; i <= 5; i++) {
        insertCategory.run(`Category ${i}`, `Description ${i}`, `category-${i}`);
      }

      const response = await request(app)
        .get('/api/categories?limit=2&offset=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toHaveLength(2);
      expect(response.body.data.total).toBe(5);
      expect(response.body.data.limit).toBe(2);
      expect(response.body.data.offset).toBe(1);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/categories')
        .expect(401);
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should return category by ID', async () => {
      const insertCategory = db.prepare(`
        INSERT INTO categories (name, description, slug)
        VALUES (?, ?, ?)
      `);
      
      const result = insertCategory.run('AI News', 'Latest AI developments', 'ai-news');
      const categoryId = result.lastInsertRowid;

      const response = await request(app)
        .get(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(categoryId);
      expect(response.body.data.name).toBe('AI News');
      expect(response.body.data.slug).toBe('ai-news');
    });

    it('should return 404 for non-existent category', async () => {
      const response = await request(app)
        .get('/api/categories/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app)
        .get('/api/categories/invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CATEGORY_ID');
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
        .set('Authorization', `Bearer ${authToken}`)
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
        .set('Authorization', `Bearer ${authToken}`)
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe('machine-learning-ai');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
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
        .set('Authorization', `Bearer ${authToken}`)
        .send(categoryData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(categoryData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CATEGORY_EXISTS');
    });

    it('should validate slug format', async () => {
      const categoryData = {
        name: 'AI News',
        slug: 'Invalid Slug!'
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(categoryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toContain('Slug can only contain lowercase letters, numbers, and hyphens');
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update an existing category', async () => {
      // Create category first
      const insertCategory = db.prepare(`
        INSERT INTO categories (name, description, slug)
        VALUES (?, ?, ?)
      `);
      
      const result = insertCategory.run('AI News', 'Old description', 'ai-news');
      const categoryId = result.lastInsertRowid;

      const updateData = {
        name: 'Updated AI News',
        description: 'Updated description',
        slug: 'updated-ai-news'
      };

      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated AI News');
      expect(response.body.data.description).toBe('Updated description');
      expect(response.body.data.slug).toBe('updated-ai-news');
    });

    it('should return 404 for non-existent category', async () => {
      const updateData = {
        name: 'Updated Name',
        slug: 'updated-slug'
      };

      const response = await request(app)
        .put('/api/categories/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('should validate update data', async () => {
      const insertCategory = db.prepare(`
        INSERT INTO categories (name, description, slug)
        VALUES (?, ?, ?)
      `);
      
      const result = insertCategory.run('AI News', 'Description', 'ai-news');
      const categoryId = result.lastInsertRowid;

      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '', slug: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete a category without associated articles', async () => {
      const insertCategory = db.prepare(`
        INSERT INTO categories (name, description, slug)
        VALUES (?, ?, ?)
      `);
      
      const result = insertCategory.run('AI News', 'Description', 'ai-news');
      const categoryId = result.lastInsertRowid;

      const response = await request(app)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedId).toBe(categoryId);
    });

    it('should prevent deletion of category with associated articles', async () => {
      // Create category
      const insertCategory = db.prepare(`
        INSERT INTO categories (name, description, slug)
        VALUES (?, ?, ?)
      `);
      
      const categoryResult = insertCategory.run('AI News', 'Description', 'ai-news');
      const categoryId = categoryResult.lastInsertRowid;

      // Create associated article
      const insertArticle = db.prepare(`
        INSERT INTO articles (title, slug, content, category_id, author_id, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      insertArticle.run('Test Article', 'test-article', 'Content', categoryId, testUserId, 'published');

      const response = await request(app)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CATEGORY_HAS_ARTICLES');
    });

    it('should return 404 for non-existent category', async () => {
      const response = await request(app)
        .delete('/api/categories/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app)
        .delete('/api/categories/invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CATEGORY_ID');
    });
  });
});