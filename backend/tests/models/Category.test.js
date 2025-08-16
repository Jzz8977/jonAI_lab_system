const Category = require('../../models/Category');
const Database = require('better-sqlite3');
const path = require('path');

describe('Category Model', () => {
  let db;
  let category;

  beforeAll(() => {
    // Set up test database
    const dbPath = path.join(__dirname, '../../data/blog_admin.db');
    db = new Database(dbPath);
    category = new Category();
  });

  beforeEach(() => {
    // Clean up tables in correct order to avoid foreign key constraints
    db.prepare('DELETE FROM articles').run();
    db.prepare('DELETE FROM categories').run();
  });

  afterAll(() => {
    db.close();
  });

  describe('create', () => {
    it('should create a new category', () => {
      const categoryData = {
        name: 'AI News',
        description: 'Latest AI developments',
        slug: 'ai-news'
      };

      const result = category.create(categoryData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('AI News');
      expect(result.slug).toBe('ai-news');
      expect(result.description).toBe('Latest AI developments');
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('should throw error for duplicate name', () => {
      const categoryData = {
        name: 'AI News',
        slug: 'ai-news'
      };

      category.create(categoryData);

      expect(() => {
        category.create(categoryData);
      }).toThrow('Category name or slug already exists');
    });

    it('should throw error for duplicate slug', () => {
      category.create({ name: 'AI News', slug: 'ai-news' });

      expect(() => {
        category.create({ name: 'Different Name', slug: 'ai-news' });
      }).toThrow('Category name or slug already exists');
    });
  });

  describe('findById', () => {
    it('should find category by ID', () => {
      const categoryData = {
        name: 'AI News',
        description: 'Latest AI developments',
        slug: 'ai-news'
      };

      const created = category.create(categoryData);
      const found = category.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('AI News');
    });

    it('should return undefined for non-existent ID', () => {
      const found = category.findById(999);
      expect(found).toBeUndefined();
    });
  });

  describe('findBySlug', () => {
    it('should find category by slug', () => {
      const categoryData = {
        name: 'AI News',
        slug: 'ai-news'
      };

      category.create(categoryData);
      const found = category.findBySlug('ai-news');

      expect(found).toBeDefined();
      expect(found.slug).toBe('ai-news');
      expect(found.name).toBe('AI News');
    });

    it('should return undefined for non-existent slug', () => {
      const found = category.findBySlug('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      // Create test categories
      category.create({ name: 'AI News', slug: 'ai-news' });
      category.create({ name: 'Machine Learning', slug: 'machine-learning' });
      category.create({ name: 'Data Science', slug: 'data-science' });
    });

    it('should return all categories', () => {
      const categories = category.findAll();
      expect(categories).toHaveLength(3);
    });

    it('should support pagination', () => {
      const categories = category.findAll({ limit: 2, offset: 1 });
      expect(categories).toHaveLength(2);
    });

    it('should support ordering', () => {
      const categories = category.findAll({ orderBy: 'name', orderDir: 'DESC' });
      expect(categories[0].name).toBe('Machine Learning');
    });
  });

  describe('update', () => {
    it('should update an existing category', () => {
      const created = category.create({
        name: 'AI News',
        description: 'Old description',
        slug: 'ai-news'
      });

      const updateData = {
        name: 'Updated AI News',
        description: 'New description',
        slug: 'updated-ai-news'
      };

      const updated = category.update(created.id, updateData);

      expect(updated.name).toBe('Updated AI News');
      expect(updated.description).toBe('New description');
      expect(updated.slug).toBe('updated-ai-news');
      expect(updated.updated_at).toBeDefined();
      expect(updated.id).toBe(created.id);
    });

    it('should throw error for non-existent category', () => {
      expect(() => {
        category.update(999, { name: 'Test', slug: 'test' });
      }).toThrow('Category not found');
    });

    it('should throw error for duplicate name/slug', () => {
      category.create({ name: 'AI News', slug: 'ai-news' });
      const created2 = category.create({ name: 'ML News', slug: 'ml-news' });

      expect(() => {
        category.update(created2.id, { name: 'AI News', slug: 'ai-news-2' });
      }).toThrow('Category name or slug already exists');
    });
  });

  describe('delete', () => {
    it('should delete a category without associated articles', () => {
      const created = category.create({
        name: 'AI News',
        slug: 'ai-news'
      });

      const result = category.delete(created.id);

      expect(result.success).toBe(true);
      expect(result.deletedId).toBe(created.id);

      const found = category.findById(created.id);
      expect(found).toBeUndefined();
    });

    it('should throw error for non-existent category', () => {
      expect(() => {
        category.delete(999);
      }).toThrow('Category not found');
    });

    it('should prevent deletion of category with associated articles', () => {
      // Create category
      const created = category.create({
        name: 'AI News',
        slug: 'ai-news'
      });

      // Create associated article
      const insertArticle = db.prepare(`
        INSERT INTO articles (title, slug, content, category_id, author_id, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      insertArticle.run('Test Article', 'test-article', 'Content', created.id, 1, 'published');

      expect(() => {
        category.delete(created.id);
      }).toThrow('Cannot delete category with associated articles');
    });
  });

  describe('count', () => {
    it('should return correct count', () => {
      expect(category.count()).toBe(0);

      category.create({ name: 'AI News', slug: 'ai-news' });
      category.create({ name: 'ML News', slug: 'ml-news' });

      expect(category.count()).toBe(2);
    });
  });

  describe('generateSlug', () => {
    it('should generate slug from name', () => {
      expect(Category.generateSlug('AI News')).toBe('ai-news');
      expect(Category.generateSlug('Machine Learning & AI')).toBe('machine-learning-ai');
      expect(Category.generateSlug('  Data Science  ')).toBe('data-science');
      expect(Category.generateSlug('Special!@#$%Characters')).toBe('special-characters');
    });

    it('should handle edge cases', () => {
      expect(Category.generateSlug('')).toBe('');
      expect(Category.generateSlug('123')).toBe('123');
      expect(Category.generateSlug('---test---')).toBe('test');
    });
  });

  describe('validate', () => {
    it('should validate valid category data', () => {
      const categoryData = {
        name: 'AI News',
        description: 'Latest AI developments',
        slug: 'ai-news'
      };

      const errors = Category.validate(categoryData);
      expect(errors).toHaveLength(0);
    });

    it('should require name', () => {
      const errors = Category.validate({ slug: 'test' });
      expect(errors).toContain('Name is required');
    });

    it('should require slug', () => {
      const errors = Category.validate({ name: 'Test' });
      expect(errors).toContain('Slug is required');
    });

    it('should validate name length', () => {
      const longName = 'a'.repeat(101);
      const errors = Category.validate({ name: longName, slug: 'test' });
      expect(errors).toContain('Name must be less than 100 characters');
    });

    it('should validate description length', () => {
      const longDescription = 'a'.repeat(1001);
      const errors = Category.validate({
        name: 'Test',
        slug: 'test',
        description: longDescription
      });
      expect(errors).toContain('Description must be less than 1000 characters');
    });

    it('should validate slug format', () => {
      const errors = Category.validate({
        name: 'Test',
        slug: 'Invalid Slug!'
      });
      expect(errors).toContain('Slug can only contain lowercase letters, numbers, and hyphens');
    });

    it('should validate slug length', () => {
      const longSlug = 'a'.repeat(101);
      const errors = Category.validate({
        name: 'Test',
        slug: longSlug
      });
      expect(errors).toContain('Slug must be less than 100 characters');
    });
  });
});