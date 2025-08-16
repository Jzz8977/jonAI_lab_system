const AnalyticsService = require('../../services/analytics');
const dbManager = require('../../config/database');
const Article = require('../../models/Article');
const Category = require('../../models/Category');
const User = require('../../models/User');

describe('AnalyticsService', () => {
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
  
  describe('incrementViewCount', () => {
    test('should increment view count for new IP', async () => {
      const result = await AnalyticsService.incrementViewCount(testArticleId, '192.168.1.1', 'Test User Agent');
      
      expect(result.viewed).toBe(true);
      expect(result.message).toBe('View count incremented');
      
      // Check that view was recorded
      const db = dbManager.getDatabase();
      const viewRecord = db.prepare('SELECT * FROM article_views WHERE article_id = ? AND ip_address = ?')
        .get(testArticleId, '192.168.1.1');
      
      expect(viewRecord).toBeTruthy();
      expect(viewRecord.user_agent).toBe('Test User Agent');
      
      // Check that article view count was incremented
      const article = db.prepare('SELECT view_count FROM articles WHERE id = ?').get(testArticleId);
      expect(article.view_count).toBe(1);
    });
    
    test('should not increment view count for same IP on same day', async () => {
      // First view
      await AnalyticsService.incrementViewCount(testArticleId, '192.168.1.2');
      
      // Second view from same IP on same day
      const result = await AnalyticsService.incrementViewCount(testArticleId, '192.168.1.2');
      
      expect(result.viewed).toBe(false);
      expect(result.message).toBe('Already viewed today');
      
      // Check that article view count is still 1
      const db = dbManager.getDatabase();
      const article = db.prepare('SELECT view_count FROM articles WHERE id = ?').get(testArticleId);
      expect(article.view_count).toBe(1);
    });
    
    test('should throw error for non-existent article', async () => {
      try {
        await AnalyticsService.incrementViewCount(99999, '192.168.1.3');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Article not found');
      }
    });
    
    test('should allow multiple IPs to view same article', async () => {
      await AnalyticsService.incrementViewCount(testArticleId, '192.168.1.4');
      await AnalyticsService.incrementViewCount(testArticleId, '192.168.1.5');
      await AnalyticsService.incrementViewCount(testArticleId, '192.168.1.6');
      
      const db = dbManager.getDatabase();
      const article = db.prepare('SELECT view_count FROM articles WHERE id = ?').get(testArticleId);
      expect(article.view_count).toBe(3);
    });
  });
  
  describe('toggleLike', () => {
    test('should add like for new IP', async () => {
      const result = await AnalyticsService.toggleLike(testArticleId, '192.168.1.10', 'Test User Agent');
      
      expect(result.liked).toBe(true);
      expect(result.message).toBe('Article liked');
      
      // Check that like was recorded
      const db = dbManager.getDatabase();
      const likeRecord = db.prepare('SELECT * FROM article_likes WHERE article_id = ? AND ip_address = ?')
        .get(testArticleId, '192.168.1.10');
      
      expect(likeRecord).toBeTruthy();
      expect(likeRecord.user_agent).toBe('Test User Agent');
      
      // Check that article like count was incremented
      const article = db.prepare('SELECT like_count FROM articles WHERE id = ?').get(testArticleId);
      expect(article.like_count).toBe(1);
    });
    
    test('should remove like for existing IP', async () => {
      // First like
      await AnalyticsService.toggleLike(testArticleId, '192.168.1.11');
      
      // Toggle like (unlike)
      const result = await AnalyticsService.toggleLike(testArticleId, '192.168.1.11');
      
      expect(result.liked).toBe(false);
      expect(result.message).toBe('Article unliked');
      
      // Check that like was removed
      const db = dbManager.getDatabase();
      const likeRecord = db.prepare('SELECT * FROM article_likes WHERE article_id = ? AND ip_address = ?')
        .get(testArticleId, '192.168.1.11');
      
      expect(likeRecord).toBeFalsy();
      
      // Check that article like count was decremented
      const article = db.prepare('SELECT like_count FROM articles WHERE id = ?').get(testArticleId);
      expect(article.like_count).toBe(0);
    });
    
    test('should throw error for non-existent article', async () => {
      try {
        await AnalyticsService.toggleLike(99999, '192.168.1.12');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Article not found');
      }
    });
  });
  
  describe('hasLiked', () => {
    test('should return true if IP has liked article', async () => {
      await AnalyticsService.toggleLike(testArticleId, '192.168.1.20');
      
      const hasLiked = await AnalyticsService.hasLiked(testArticleId, '192.168.1.20');
      expect(hasLiked).toBe(true);
    });
    
    test('should return false if IP has not liked article', async () => {
      const hasLiked = await AnalyticsService.hasLiked(testArticleId, '192.168.1.21');
      expect(hasLiked).toBe(false);
    });
  });
  
  describe('getDashboardMetrics', () => {
    beforeEach(async () => {
      // Set up test data
      await AnalyticsService.incrementViewCount(testArticleId, '192.168.1.30');
      await AnalyticsService.incrementViewCount(testArticleId, '192.168.1.31');
      await AnalyticsService.toggleLike(testArticleId, '192.168.1.30');
    });
    
    test('should return dashboard metrics', async () => {
      const metrics = await AnalyticsService.getDashboardMetrics();
      
      expect(metrics).toHaveProperty('totals');
      expect(metrics).toHaveProperty('recent_articles');
      expect(metrics).toHaveProperty('top_articles');
      expect(metrics).toHaveProperty('view_trends');
      
      expect(metrics.totals.articles).toBe(1);
      expect(metrics.totals.views).toBe(2);
      expect(metrics.totals.likes).toBe(1);
      
      expect(metrics.recent_articles).toHaveLength(1);
      expect(metrics.recent_articles[0].id).toBe(testArticleId);
      
      expect(metrics.top_articles).toHaveLength(1);
      expect(metrics.top_articles[0].id).toBe(testArticleId);
    });
  });
  
  describe('getTopArticles', () => {
    beforeEach(async () => {
      // Create additional test article
      const secondArticle = await Article.create({
        title: 'Second Test Article',
        content: 'Second test content',
        excerpt: 'Second test excerpt',
        category_id: testCategoryId,
        author_id: testUserId,
        status: 'published'
      });
      
      // Add more views to first article
      await AnalyticsService.incrementViewCount(testArticleId, '192.168.1.40');
      await AnalyticsService.incrementViewCount(testArticleId, '192.168.1.41');
      await AnalyticsService.incrementViewCount(testArticleId, '192.168.1.42');
      
      // Add fewer views to second article
      await AnalyticsService.incrementViewCount(secondArticle.id, '192.168.1.43');
    });
    
    test('should return articles ordered by view count', async () => {
      const topArticles = await AnalyticsService.getTopArticles(10);
      
      expect(topArticles).toHaveLength(2);
      expect(topArticles[0].view_count).toBeGreaterThan(topArticles[1].view_count);
      expect(topArticles[0].id).toBe(testArticleId);
    });
    
    test('should respect limit parameter', async () => {
      const topArticles = await AnalyticsService.getTopArticles(1);
      
      expect(topArticles).toHaveLength(1);
      expect(topArticles[0].id).toBe(testArticleId);
    });
  });
  
  describe('getArticleAnalytics', () => {
    beforeEach(async () => {
      await AnalyticsService.incrementViewCount(testArticleId, '192.168.1.50');
      await AnalyticsService.toggleLike(testArticleId, '192.168.1.50');
    });
    
    test('should return analytics for specific article', async () => {
      const analytics = await AnalyticsService.getArticleAnalytics(testArticleId);
      
      expect(analytics).toHaveProperty('article');
      expect(analytics).toHaveProperty('trends');
      
      expect(analytics.article.id).toBe(testArticleId);
      expect(analytics.article.view_count).toBe(1);
      expect(analytics.article.like_count).toBe(1);
      
      expect(analytics.trends).toHaveProperty('views');
      expect(analytics.trends).toHaveProperty('likes');
    });
    
    test('should throw error for non-existent article', async () => {
      try {
        await AnalyticsService.getArticleAnalytics(99999);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Article not found');
      }
    });
  });
  
  describe('getEngagementSummary', () => {
    beforeEach(async () => {
      await AnalyticsService.incrementViewCount(testArticleId, '192.168.1.60');
      await AnalyticsService.incrementViewCount(testArticleId, '192.168.1.61');
      await AnalyticsService.toggleLike(testArticleId, '192.168.1.60');
    });
    
    test('should return engagement summary', async () => {
      const summary = await AnalyticsService.getEngagementSummary('7d');
      
      expect(summary).toHaveProperty('period');
      expect(summary).toHaveProperty('articles_viewed');
      expect(summary).toHaveProperty('total_views');
      expect(summary).toHaveProperty('unique_visitors');
      expect(summary).toHaveProperty('total_likes');
      expect(summary).toHaveProperty('avg_views_per_visitor');
      
      expect(summary.period).toBe('7 days');
      expect(summary.articles_viewed).toBe(1);
      expect(summary.total_views).toBe(2);
      expect(summary.unique_visitors).toBe(2);
      expect(summary.total_likes).toBe(1);
      expect(summary.avg_views_per_visitor).toBe(1);
    });
  });
});