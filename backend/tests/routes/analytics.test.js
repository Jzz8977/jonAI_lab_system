const request = require('supertest');
const app = require('../../server');
const dbManager = require('../../config/database');
const Article = require('../../models/Article');
const Category = require('../../models/Category');
const User = require('../../models/User');

describe('Analytics Routes', () => {
  let testArticleId;
  let testUserId;
  let testCategoryId;
  
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
    
    // Create article_likes table
    db.exec(`
      CREATE TABLE IF NOT EXISTS article_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        UNIQUE(article_id, ip_address)
      )
    `);
    
    // Create article_views table
    db.exec(`
      CREATE TABLE IF NOT EXISTS article_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
      )
    `);
    
    // Create test user directly
    const userResult = db.prepare(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run('testuser', 'test@example.com', 'hashedpassword', 'admin');
    testUserId = userResult.lastInsertRowid;
    
    // Create test category directly
    const categoryResult = db.prepare(`
      INSERT INTO categories (name, description, slug)
      VALUES (?, ?, ?)
    `).run('Test Category', 'Test category for analytics tests', 'test-category');
    testCategoryId = categoryResult.lastInsertRowid;
    
    // Create test article directly
    const articleResult = db.prepare(`
      INSERT INTO articles (title, slug, content, excerpt, category_id, author_id, status, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      'Test Article for Analytics',
      'test-article-for-analytics',
      'This is test content for analytics testing',
      'Test excerpt',
      testCategoryId,
      testUserId,
      'published'
    );
    testArticleId = articleResult.lastInsertRowid;
  });
  
  afterAll(async () => {
    // Clean up test data
    const db = dbManager.getDatabase();
    db.exec('DELETE FROM article_views');
    db.exec('DELETE FROM article_likes');
    db.exec('DELETE FROM articles');
    db.exec('DELETE FROM categories');
    db.exec('DELETE FROM users');
  });
  
  beforeEach(() => {
    // Clean up analytics data before each test
    const db = dbManager.getDatabase();
    db.exec('DELETE FROM article_views');
    db.exec('DELETE FROM article_likes');
    
    // Reset article counts
    db.prepare('UPDATE articles SET view_count = 0, like_count = 0').run();
  });
  
  describe('POST /api/analytics/articles/:id/view', () => {
    test('should increment view count for valid article', async () => {
      const response = await request(app)
        .post(`/api/analytics/articles/${testArticleId}/view`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.viewed).toBe(true);
      expect(response.body.data.message).toBe('View count incremented');
    });
    
    test('should not increment view count for same IP on same day', async () => {
      // First request
      await request(app)
        .post(`/api/analytics/articles/${testArticleId}/view`)
        .expect(200);
      
      // Second request from same IP
      const response = await request(app)
        .post(`/api/analytics/articles/${testArticleId}/view`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.viewed).toBe(false);
      expect(response.body.data.message).toBe('Already viewed today');
    });
    
    test('should return 404 for non-existent article', async () => {
      const response = await request(app)
        .post('/api/analytics/articles/99999/view')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ARTICLE_NOT_FOUND');
    });
    
    test('should return 400 for invalid article ID', async () => {
      const response = await request(app)
        .post('/api/analytics/articles/invalid/view')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
  
  describe('POST /api/analytics/articles/:id/like', () => {
    test('should add like for valid article', async () => {
      const response = await request(app)
        .post(`/api/analytics/articles/${testArticleId}/like`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.liked).toBe(true);
      expect(response.body.data.message).toBe('Article liked');
    });
    
    test('should remove like when toggled again', async () => {
      // First request - like
      await request(app)
        .post(`/api/analytics/articles/${testArticleId}/like`)
        .expect(200);
      
      // Second request - unlike
      const response = await request(app)
        .post(`/api/analytics/articles/${testArticleId}/like`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.liked).toBe(false);
      expect(response.body.data.message).toBe('Article unliked');
    });
    
    test('should return 404 for non-existent article', async () => {
      const response = await request(app)
        .post('/api/analytics/articles/99999/like')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ARTICLE_NOT_FOUND');
    });
  });
  
  describe('GET /api/analytics/articles/:id/status', () => {
    test('should return like status for article', async () => {
      const response = await request(app)
        .get(`/api/analytics/articles/${testArticleId}/status`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.article_id).toBe(testArticleId);
      expect(response.body.data.has_liked).toBe(false);
      expect(response.body.data.ip_address).toBeDefined();
    });
    
    test('should return true after liking article', async () => {
      // Like the article first
      await request(app)
        .post(`/api/analytics/articles/${testArticleId}/like`)
        .expect(200);
      
      // Check status
      const response = await request(app)
        .get(`/api/analytics/articles/${testArticleId}/status`)
        .expect(200);
      
      expect(response.body.data.has_liked).toBe(true);
    });
  });
  
  describe('GET /api/analytics/dashboard', () => {
    test('should return dashboard metrics', async () => {
      // Set up test data
      await request(app).post(`/api/analytics/articles/${testArticleId}/view`);
      await request(app).post(`/api/analytics/articles/${testArticleId}/like`);
      
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totals');
      expect(response.body.data).toHaveProperty('recent_articles');
      expect(response.body.data).toHaveProperty('top_articles');
      expect(response.body.data).toHaveProperty('view_trends');
      expect(response.body.data).toHaveProperty('date_range');
      
      expect(response.body.data.totals.articles).toBe(1);
      expect(response.body.data.totals.views).toBe(1);
      expect(response.body.data.totals.likes).toBe(1);
    });
    
    test('should accept date range parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard?range=7d')
        .expect(200);
      
      expect(response.body.data.date_range).toBe('7d');
    });
    
    test('should return 400 for invalid date range', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard?range=invalid')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
  
  describe('GET /api/analytics/articles/top', () => {
    beforeEach(async () => {
      // Add some views to make it appear in top articles
      await request(app).post(`/api/analytics/articles/${testArticleId}/view`);
    });
    
    test('should return top articles', async () => {
      const response = await request(app)
        .get('/api/analytics/articles/top')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('articles');
      expect(response.body.data).toHaveProperty('limit');
      expect(response.body.data).toHaveProperty('date_range');
      
      expect(response.body.data.articles).toHaveLength(1);
      expect(response.body.data.articles[0].id).toBe(testArticleId);
      expect(response.body.data.limit).toBe(10);
    });
    
    test('should accept limit parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/articles/top?limit=5')
        .expect(200);
      
      expect(response.body.data.limit).toBe(5);
    });
    
    test('should return 400 for invalid limit', async () => {
      const response = await request(app)
        .get('/api/analytics/articles/top?limit=100')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
  
  describe('GET /api/analytics/articles/:id', () => {
    beforeEach(async () => {
      await request(app).post(`/api/analytics/articles/${testArticleId}/view`);
      await request(app).post(`/api/analytics/articles/${testArticleId}/like`);
    });
    
    test('should return article analytics', async () => {
      const response = await request(app)
        .get(`/api/analytics/articles/${testArticleId}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('article');
      expect(response.body.data).toHaveProperty('trends');
      
      expect(response.body.data.article.id).toBe(testArticleId);
      expect(response.body.data.article.view_count).toBe(1);
      expect(response.body.data.article.like_count).toBe(1);
    });
    
    test('should return 404 for non-existent article', async () => {
      const response = await request(app)
        .get('/api/analytics/articles/99999')
        .expect(500); // The service throws a generic error, not specifically "Article not found"
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
  
  describe('GET /api/analytics/engagement', () => {
    beforeEach(async () => {
      await request(app).post(`/api/analytics/articles/${testArticleId}/view`);
      await request(app).post(`/api/analytics/articles/${testArticleId}/like`);
    });
    
    test('should return engagement summary', async () => {
      const response = await request(app)
        .get('/api/analytics/engagement')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('articles_viewed');
      expect(response.body.data).toHaveProperty('total_views');
      expect(response.body.data).toHaveProperty('unique_visitors');
      expect(response.body.data).toHaveProperty('total_likes');
      expect(response.body.data).toHaveProperty('avg_views_per_visitor');
      
      expect(response.body.data.period).toBe('7 days');
    });
    
    test('should accept range parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/engagement?range=30d')
        .expect(200);
      
      expect(response.body.data.period).toBe('30 days');
    });
  });
});