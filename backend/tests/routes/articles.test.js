// Set environment variables before importing modules
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DB_PATH = ':memory:';

const request = require('supertest');
const express = require('express');
const articleRoutes = require('../../routes/articles');
const Article = require('../../models/Article');
const User = require('../../models/User');
const Category = require('../../models/Category');
const { generateToken } = require('../../utils/jwt');
const dbManager = require('../../config/database');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/articles', articleRoutes);

describe('Article Routes', () => {
  let testUser;
  let testCategory;
  let authToken;
  let categoryModel;

  beforeAll(async () => {
    // Create tables directly for testing
    const db = dbManager.getDatabase();
    
    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create categories table
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        slug VARCHAR(100) UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create articles table
    db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        thumbnail_url VARCHAR(500),
        category_id INTEGER NOT NULL,
        author_id INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        view_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);
    
    // Create test user
    testUser = await User.create({
      username: 'testarticleuser',
      email: 'articleuser@test.com',
      password: 'TestPass123'
    });

    // Generate auth token using the same method as the JWT utils
    const jwt = require('jsonwebtoken');
    const testSecret = process.env.JWT_SECRET;
    authToken = jwt.sign(
      { 
        id: testUser.id, 
        username: testUser.username,
        email: testUser.email,
        role: testUser.role
      },
      testSecret,
      { 
        expiresIn: '1h',
        issuer: 'blog-admin-api',
        audience: 'blog-admin-client'
      }
    );

    // Create test category directly using database
    const result = db.prepare(`
      INSERT INTO categories (name, description, slug, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run('Test Article Category', 'Test category for articles', 'test-article-category');
    
    testCategory = {
      id: result.lastInsertRowid,
      name: 'Test Article Category',
      description: 'Test category for articles',
      slug: 'test-article-category'
    };
  });

  afterAll(() => {
    // Clean up test data
    const db = dbManager.getDatabase();
    try {
      db.prepare('DELETE FROM articles WHERE author_id = ?').run(testUser.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(testUser.id);
      db.prepare('DELETE FROM categories WHERE id = ?').run(testCategory.id);
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  beforeEach(() => {
    // Clean up articles before each test
    const db = dbManager.getDatabase();
    db.prepare('DELETE FROM articles WHERE author_id = ?').run(testUser.id);
  });

  describe('GET /api/articles', () => {
    beforeEach(async () => {
      // Create test articles
      await Article.create({
        title: 'Test Article 1',
        content: 'Content for article 1',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'draft'
      });

      await Article.create({
        title: 'Test Article 2',
        content: 'Content for article 2',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'published'
      });
    });

    test('should return articles list with pagination', async () => {
      const response = await request(app)
        .get('/api/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.articles.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.pagination.totalCount).toBeGreaterThanOrEqual(2);
    });

    test('should filter articles by status', async () => {
      const response = await request(app)
        .get('/api/articles?status=draft')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles.every(a => a.status === 'draft')).toBe(true);
    });

    test('should apply pagination parameters', async () => {
      const response = await request(app)
        .get('/api/articles?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles.length).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.currentPage).toBe(1);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/articles')
        .expect(401);
    });
  });

  describe('GET /api/articles/:id', () => {
    test('should return article by ID', async () => {
      const article = await Article.create({
        title: 'Get By ID Test',
        content: 'Test content',
        category_id: testCategory.id,
        author_id: testUser.id
      });

      const response = await request(app)
        .get(`/api/articles/${article.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(article.id);
      expect(response.body.data.title).toBe('Get By ID Test');
      expect(response.body.data.category).toBeDefined();
      expect(response.body.data.author).toBeDefined();
    });

    test('should return 404 for non-existent article', async () => {
      const response = await request(app)
        .get('/api/articles/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ARTICLE_NOT_FOUND');
    });

    test('should return 400 for invalid ID', async () => {
      const response = await request(app)
        .get('/api/articles/invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/articles/1')
        .expect(401);
    });
  });

  describe('GET /api/articles/slug/:slug', () => {
    test('should return article by slug', async () => {
      const article = await Article.create({
        title: 'Get By Slug Test',
        content: 'Test content',
        category_id: testCategory.id,
        author_id: testUser.id
      });

      const response = await request(app)
        .get('/api/articles/slug/get-by-slug-test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(article.id);
      expect(response.body.data.slug).toBe('get-by-slug-test');
    });

    test('should return 404 for non-existent slug', async () => {
      const response = await request(app)
        .get('/api/articles/slug/non-existent-slug')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ARTICLE_NOT_FOUND');
    });
  });

  describe('POST /api/articles', () => {
    test('should create article with valid data', async () => {
      const articleData = {
        title: 'New Test Article',
        content: 'This is the content of the new article.',
        excerpt: 'Test excerpt',
        thumbnail_url: 'https://example.com/image.jpg',
        category_id: testCategory.id,
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(articleData);

      if (response.status !== 201) {
        console.error('Response body:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(articleData.title);
      expect(response.body.data.slug).toBe('new-test-article');
      expect(response.body.data.author_id).toBe(testUser.id);
      expect(response.body.message).toBe('Article created successfully');
    });

    test('should return validation errors for invalid data', async () => {
      const invalidData = {
        title: '', // Empty title
        content: '', // Empty content
        category_id: testCategory.id
      };

      const response = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('Title is required');
      expect(response.body.error.details).toContain('Content is required');
    });

    test('should return error for invalid category', async () => {
      const articleData = {
        title: 'Test Article',
        content: 'Test content',
        category_id: 99999 // Non-existent category
      };

      const response = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(articleData);

      if (response.body.error.code !== 'INVALID_CATEGORY') {
        console.log('Response body:', response.body);
      }

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CATEGORY');
    });

    test('should require authentication', async () => {
      const articleData = {
        title: 'Test Article',
        content: 'Test content',
        category_id: testCategory.id
      };

      await request(app)
        .post('/api/articles')
        .send(articleData)
        .expect(401);
    });
  });

  describe('PUT /api/articles/:id', () => {
    test('should update article with valid data', async () => {
      const article = await Article.create({
        title: 'Original Title',
        content: 'Original content',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'draft'
      });

      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        status: 'published'
      };

      const response = await request(app)
        .put(`/api/articles/${article.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.content).toBe('Updated content');
      expect(response.body.data.status).toBe('published');
      expect(response.body.data.slug).toBe('updated-title');
      expect(response.body.message).toBe('Article updated successfully');
    });

    test('should return validation errors for invalid update data', async () => {
      const article = await Article.create({
        title: 'Test Article',
        content: 'Test content',
        category_id: testCategory.id,
        author_id: testUser.id
      });

      const invalidUpdateData = {
        title: '', // Empty title
        status: 'invalid_status'
      };

      const response = await request(app)
        .put(`/api/articles/${article.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('Title cannot be empty');
      expect(response.body.error.details).toContain('Status must be one of: draft, published, archived');
    });

    test('should return 404 for non-existent article', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      const response = await request(app)
        .put('/api/articles/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ARTICLE_NOT_FOUND');
    });

    test('should require authentication', async () => {
      await request(app)
        .put('/api/articles/1')
        .send({ title: 'Updated Title' })
        .expect(401);
    });
  });

  describe('POST /api/articles/:id/publish', () => {
    test('should publish draft article', async () => {
      const article = await Article.create({
        title: 'Draft Article',
        content: 'Draft content',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'draft'
      });

      const response = await request(app)
        .post(`/api/articles/${article.id}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('published');
      expect(response.body.data.published_at).toBeDefined();
      expect(response.body.message).toBe('Article published successfully');
    });

    test('should return error for already published article', async () => {
      const article = await Article.create({
        title: 'Published Article',
        content: 'Published content',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'published'
      });

      const response = await request(app)
        .post(`/api/articles/${article.id}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ALREADY_PUBLISHED');
    });

    test('should return 404 for non-existent article', async () => {
      const response = await request(app)
        .post('/api/articles/99999/publish')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ARTICLE_NOT_FOUND');
    });
  });

  describe('POST /api/articles/:id/archive', () => {
    test('should archive article', async () => {
      const article = await Article.create({
        title: 'Published Article',
        content: 'Published content',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'published'
      });

      const response = await request(app)
        .post(`/api/articles/${article.id}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('archived');
      expect(response.body.message).toBe('Article archived successfully');
    });

    test('should return 404 for non-existent article', async () => {
      const response = await request(app)
        .post('/api/articles/99999/archive')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ARTICLE_NOT_FOUND');
    });
  });

  describe('DELETE /api/articles/:id', () => {
    test('should delete article', async () => {
      const article = await Article.create({
        title: 'Article to Delete',
        content: 'Content to delete',
        category_id: testCategory.id,
        author_id: testUser.id
      });

      const response = await request(app)
        .delete(`/api/articles/${article.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Article deleted successfully');

      // Verify article is deleted
      const deletedArticle = Article.findById(article.id);
      expect(deletedArticle).toBeNull();
    });

    test('should return 404 for non-existent article', async () => {
      const response = await request(app)
        .delete('/api/articles/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ARTICLE_NOT_FOUND');
    });

    test('should return 400 for invalid ID', async () => {
      const response = await request(app)
        .delete('/api/articles/invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    test('should require authentication', async () => {
      await request(app)
        .delete('/api/articles/1')
        .expect(401);
    });
  });
});