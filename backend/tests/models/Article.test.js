const Article = require('../../models/Article');
const User = require('../../models/User');
const Category = require('../../models/Category');
const dbManager = require('../../config/database');

describe('Article Model', () => {
  let testUser;
  let testCategory;
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
      username: 'testauthor',
      email: 'author@test.com',
      password: 'TestPass123'
    });

    // Create test category directly using database
    const result = db.prepare(`
      INSERT INTO categories (name, description, slug, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run('Test Category', 'Test category description', 'test-category');
    
    testCategory = {
      id: result.lastInsertRowid,
      name: 'Test Category',
      description: 'Test category description',
      slug: 'test-category'
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

  describe('generateSlug', () => {
    test('should generate slug from title', () => {
      const title = 'This is a Test Article Title';
      const slug = Article.generateSlug(title);
      expect(slug).toBe('this-is-a-test-article-title');
    });

    test('should handle special characters', () => {
      const title = 'Article with Special Characters! @#$%';
      const slug = Article.generateSlug(title);
      expect(slug).toBe('article-with-special-characters');
    });

    test('should handle multiple spaces and hyphens', () => {
      const title = 'Article   with    multiple   spaces';
      const slug = Article.generateSlug(title);
      expect(slug).toBe('article-with-multiple-spaces');
    });

    test('should handle empty title', () => {
      const title = '';
      const slug = Article.generateSlug(title);
      expect(slug).toBe('');
    });
  });

  describe('ensureUniqueSlug', () => {
    test('should return original slug if unique', async () => {
      const slug = await Article.ensureUniqueSlug('unique-test-slug');
      expect(slug).toBe('unique-test-slug');
    });

    test('should append number if slug exists', async () => {
      // Create article with base slug
      await Article.create({
        title: 'Test Article',
        content: 'Test content',
        category_id: testCategory.id,
        author_id: testUser.id
      });

      const slug = await Article.ensureUniqueSlug('test-article');
      expect(slug).toBe('test-article-1');
    });

    test('should increment number for multiple duplicates', async () => {
      // Create articles with base slug and first increment
      await Article.create({
        title: 'Test Article',
        content: 'Test content',
        category_id: testCategory.id,
        author_id: testUser.id
      });

      await Article.create({
        title: 'Test Article 1',
        content: 'Test content',
        category_id: testCategory.id,
        author_id: testUser.id
      });

      const slug = await Article.ensureUniqueSlug('test-article');
      expect(slug).toBe('test-article-2');
    });
  });

  describe('create', () => {
    test('should create article with valid data', async () => {
      const articleData = {
        title: 'Test Article',
        content: 'This is test content for the article.',
        excerpt: 'Test excerpt',
        thumbnail_url: 'https://example.com/image.jpg',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'draft'
      };

      const article = await Article.create(articleData);

      expect(article).toBeDefined();
      expect(article.id).toBeDefined();
      expect(article.title).toBe(articleData.title);
      expect(article.slug).toBe('test-article');
      expect(article.content).toBe(articleData.content);
      expect(article.status).toBe('draft');
      expect(article.published_at).toBeNull();
    });

    test('should set published_at when status is published', async () => {
      const articleData = {
        title: 'Published Article',
        content: 'This is published content.',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'published'
      };

      const article = await Article.create(articleData);

      expect(article.status).toBe('published');
      expect(article.published_at).toBeDefined();
      expect(article.published_at).not.toBeNull();
    });

    test('should throw error for missing required fields', async () => {
      const articleData = {
        title: 'Test Article'
        // Missing content, category_id, author_id
      };

      await expect(Article.create(articleData)).rejects.toThrow(
        'Title, content, category_id, and author_id are required'
      );
    });

    test('should throw error for invalid category_id', async () => {
      const articleData = {
        title: 'Test Article',
        content: 'Test content',
        category_id: 99999, // Non-existent category
        author_id: testUser.id
      };

      await expect(Article.create(articleData)).rejects.toThrow(
        'Invalid category_id or author_id'
      );
    });

    test('should generate unique slug for duplicate titles', async () => {
      const articleData1 = {
        title: 'Duplicate Title',
        content: 'First article content',
        category_id: testCategory.id,
        author_id: testUser.id
      };

      const articleData2 = {
        title: 'Duplicate Title',
        content: 'Second article content',
        category_id: testCategory.id,
        author_id: testUser.id
      };

      const article1 = await Article.create(articleData1);
      const article2 = await Article.create(articleData2);

      expect(article1.slug).toBe('duplicate-title');
      expect(article2.slug).toBe('duplicate-title-1');
    });
  });

  describe('findById', () => {
    test('should find article by ID', async () => {
      const createdArticle = await Article.create({
        title: 'Find By ID Test',
        content: 'Test content',
        category_id: testCategory.id,
        author_id: testUser.id
      });

      const foundArticle = Article.findById(createdArticle.id);

      expect(foundArticle).toBeDefined();
      expect(foundArticle.id).toBe(createdArticle.id);
      expect(foundArticle.title).toBe('Find By ID Test');
    });

    test('should return null for non-existent ID', () => {
      const article = Article.findById(99999);
      expect(article).toBeNull();
    });

    test('should include relations when requested', async () => {
      const createdArticle = await Article.create({
        title: 'Relations Test',
        content: 'Test content',
        category_id: testCategory.id,
        author_id: testUser.id
      });

      const foundArticle = Article.findById(createdArticle.id, true);

      expect(foundArticle.category).toBeDefined();
      expect(foundArticle.category.name).toBe(testCategory.name);
      expect(foundArticle.author).toBeDefined();
      expect(foundArticle.author.username).toBe(testUser.username);
    });
  });

  describe('findBySlug', () => {
    test('should find article by slug', async () => {
      const createdArticle = await Article.create({
        title: 'Find By Slug Test',
        content: 'Test content',
        category_id: testCategory.id,
        author_id: testUser.id
      });

      const foundArticle = Article.findBySlug('find-by-slug-test');

      expect(foundArticle).toBeDefined();
      expect(foundArticle.id).toBe(createdArticle.id);
      expect(foundArticle.slug).toBe('find-by-slug-test');
    });

    test('should return null for non-existent slug', () => {
      const article = Article.findBySlug('non-existent-slug');
      expect(article).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Create test articles
      await Article.create({
        title: 'Draft Article',
        content: 'Draft content',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'draft'
      });

      await Article.create({
        title: 'Published Article',
        content: 'Published content',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'published'
      });
    });

    test('should return all articles', () => {
      const articles = Article.findAll();
      expect(articles.length).toBeGreaterThanOrEqual(2);
    });

    test('should filter by status', () => {
      const draftArticles = Article.findAll({ status: 'draft' });
      const publishedArticles = Article.findAll({ status: 'published' });

      expect(draftArticles.length).toBeGreaterThanOrEqual(1);
      expect(publishedArticles.length).toBeGreaterThanOrEqual(1);
      expect(draftArticles.every(a => a.status === 'draft')).toBe(true);
      expect(publishedArticles.every(a => a.status === 'published')).toBe(true);
    });

    test('should filter by category_id', () => {
      const articles = Article.findAll({ category_id: testCategory.id });
      expect(articles.length).toBeGreaterThanOrEqual(2);
      expect(articles.every(a => a.category_id === testCategory.id)).toBe(true);
    });

    test('should apply pagination', () => {
      const articles = Article.findAll({ limit: 1, offset: 0 });
      expect(articles.length).toBe(1);
    });

    test('should apply ordering', () => {
      const articles = Article.findAll({ 
        orderBy: 'title', 
        orderDir: 'ASC' 
      });
      
      expect(articles.length).toBeGreaterThanOrEqual(2);
      // Check if sorted by title ascending
      for (let i = 1; i < articles.length; i++) {
        expect(articles[i].title >= articles[i-1].title).toBe(true);
      }
    });
  });

  describe('update', () => {
    test('should update article fields', async () => {
      const article = await Article.create({
        title: 'Original Title',
        content: 'Original content',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'draft'
      });

      const updatedArticle = await article.update({
        title: 'Updated Title',
        content: 'Updated content',
        status: 'published'
      });

      expect(updatedArticle.title).toBe('Updated Title');
      expect(updatedArticle.content).toBe('Updated content');
      expect(updatedArticle.status).toBe('published');
      expect(updatedArticle.slug).toBe('updated-title');
      expect(updatedArticle.published_at).toBeDefined();
    });

    test('should not update invalid fields', async () => {
      const article = await Article.create({
        title: 'Test Article',
        content: 'Test content',
        category_id: testCategory.id,
        author_id: testUser.id
      });

      const originalId = article.id;
      const originalTitle = article.title;
      
      // Try to update with only invalid fields - should throw error
      await expect(article.update({
        id: 99999, // Should not update ID
        invalid_field: 'should not be updated'
      })).rejects.toThrow('No valid fields to update');

      // Verify original values are unchanged
      expect(article.id).toBe(originalId);
      expect(article.title).toBe(originalTitle);
    });

    test('should throw error for non-existent article', async () => {
      const article = new Article({ id: 99999 });
      
      await expect(article.update({ title: 'New Title' })).rejects.toThrow(
        'Article not found'
      );
    });
  });

  describe('delete', () => {
    test('should delete article', async () => {
      const article = await Article.create({
        title: 'To Delete',
        content: 'Delete content',
        category_id: testCategory.id,
        author_id: testUser.id
      });

      const deleted = Article.delete(article.id);
      expect(deleted).toBe(true);

      const foundArticle = Article.findById(article.id);
      expect(foundArticle).toBeNull();
    });

    test('should return false for non-existent article', () => {
      const deleted = Article.delete(99999);
      expect(deleted).toBe(false);
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await Article.create({
        title: 'Count Test 1',
        content: 'Content 1',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'draft'
      });

      await Article.create({
        title: 'Count Test 2',
        content: 'Content 2',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'published'
      });
    });

    test('should count all articles', () => {
      const count = Article.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('should count articles by status', () => {
      const draftCount = Article.count({ status: 'draft' });
      const publishedCount = Article.count({ status: 'published' });

      expect(draftCount).toBeGreaterThanOrEqual(1);
      expect(publishedCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('publish', () => {
    test('should publish draft article', async () => {
      const article = await Article.create({
        title: 'Draft to Publish',
        content: 'Draft content',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'draft'
      });

      const publishedArticle = await article.publish();

      expect(publishedArticle.status).toBe('published');
      expect(publishedArticle.published_at).toBeDefined();
      expect(publishedArticle.published_at).not.toBeNull();
    });

    test('should throw error for already published article', async () => {
      const article = await Article.create({
        title: 'Already Published',
        content: 'Published content',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'published'
      });

      await expect(article.publish()).rejects.toThrow(
        'Article is already published'
      );
    });
  });

  describe('archive', () => {
    test('should archive article', async () => {
      const article = await Article.create({
        title: 'To Archive',
        content: 'Archive content',
        category_id: testCategory.id,
        author_id: testUser.id,
        status: 'published'
      });

      const archivedArticle = await article.archive();

      expect(archivedArticle.status).toBe('archived');
    });
  });

  describe('validateArticleData', () => {
    test('should return no errors for valid data', () => {
      const validData = {
        title: 'Valid Title',
        content: 'Valid content',
        category_id: 1,
        author_id: 1,
        status: 'draft'
      };

      const errors = Article.validateArticleData(validData);
      expect(errors).toHaveLength(0);
    });

    test('should return errors for missing required fields', () => {
      const invalidData = {};

      const errors = Article.validateArticleData(invalidData);
      expect(errors).toContain('Title is required');
      expect(errors).toContain('Content is required');
      expect(errors).toContain('Category is required');
      expect(errors).toContain('Author is required');
    });

    test('should return errors for invalid field lengths', () => {
      const invalidData = {
        title: 'a'.repeat(256), // Too long
        content: 'Valid content',
        category_id: 1,
        author_id: 1,
        excerpt: 'a'.repeat(501) // Too long
      };

      const errors = Article.validateArticleData(invalidData);
      expect(errors).toContain('Title must be less than 255 characters');
      expect(errors).toContain('Excerpt must be less than 500 characters');
    });

    test('should return errors for invalid status', () => {
      const invalidData = {
        title: 'Valid Title',
        content: 'Valid content',
        category_id: 1,
        author_id: 1,
        status: 'invalid_status'
      };

      const errors = Article.validateArticleData(invalidData);
      expect(errors).toContain('Status must be one of: draft, published, archived');
    });
  });

  describe('toJSON', () => {
    test('should return clean JSON without internal fields', async () => {
      const article = await Article.create({
        title: 'JSON Test',
        content: 'JSON content',
        category_id: testCategory.id,
        author_id: testUser.id
      });

      const foundArticle = Article.findById(article.id, true);
      const json = foundArticle.toJSON();

      expect(json.category_name).toBeUndefined();
      expect(json.category_slug).toBeUndefined();
      expect(json.author_username).toBeUndefined();
      expect(json.title).toBe('JSON Test');
      expect(json.category).toBeDefined();
      expect(json.author).toBeDefined();
    });
  });
});