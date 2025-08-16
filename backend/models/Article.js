const dbManager = require('../config/database');

class Article {
  constructor(data = {}) {
    this.id = data.id;
    this.title = data.title;
    this.slug = data.slug;
    this.content = data.content;
    this.excerpt = data.excerpt;
    this.thumbnail_url = data.thumbnail_url;
    this.category_id = data.category_id;
    this.author_id = data.author_id;
    this.status = data.status || 'draft';
    this.view_count = data.view_count || 0;
    this.like_count = data.like_count || 0;
    this.published_at = data.published_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Generate SEO-friendly slug from title
  static generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  // Ensure unique slug by appending number if needed
  static async ensureUniqueSlug(baseSlug, excludeId = null) {
    const db = dbManager.getDatabase();
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      let query = 'SELECT id FROM articles WHERE slug = ?';
      let params = [slug];

      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }

      const existing = db.prepare(query).get(...params);
      
      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  // Create a new article
  static async create(articleData) {
    const { 
      title, 
      content, 
      excerpt, 
      thumbnail_url, 
      category_id, 
      author_id, 
      status = 'draft' 
    } = articleData;
    
    // Validate required fields
    if (!title || !content || !category_id || !author_id) {
      throw new Error('Title, content, category_id, and author_id are required');
    }

    // Generate and ensure unique slug
    const baseSlug = this.generateSlug(title);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const db = dbManager.getDatabase();
    
    try {
      const published_at = status === 'published' ? new Date().toISOString() : null;
      
      const result = db.prepare(`
        INSERT INTO articles (
          title, slug, content, excerpt, thumbnail_url, 
          category_id, author_id, status, published_at,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        title, slug, content, excerpt, thumbnail_url,
        category_id, author_id, status, published_at
      );

      return this.findById(result.lastInsertRowid);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Article slug already exists');
      }
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        throw new Error('Invalid category_id or author_id');
      }
      throw error;
    }
  }

  // Find article by ID with related data
  static findById(id, includeRelations = true) {
    const db = dbManager.getDatabase();
    
    let query = 'SELECT * FROM articles WHERE id = ?';
    
    if (includeRelations) {
      query = `
        SELECT 
          a.*,
          c.name as category_name,
          c.slug as category_slug,
          u.username as author_username
        FROM articles a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.id = ?
      `;
    }
    
    const articleData = db.prepare(query).get(id);
    
    if (!articleData) return null;

    const article = new Article(articleData);
    
    if (includeRelations && articleData.category_name) {
      article.category = {
        id: articleData.category_id,
        name: articleData.category_name,
        slug: articleData.category_slug
      };
      article.author = {
        id: articleData.author_id,
        username: articleData.author_username
      };
    }
    
    return article;
  }

  // Find article by slug with related data
  static findBySlug(slug, includeRelations = true) {
    const db = dbManager.getDatabase();
    
    let query = 'SELECT * FROM articles WHERE slug = ?';
    
    if (includeRelations) {
      query = `
        SELECT 
          a.*,
          c.name as category_name,
          c.slug as category_slug,
          u.username as author_username
        FROM articles a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.slug = ?
      `;
    }
    
    const articleData = db.prepare(query).get(slug);
    
    if (!articleData) return null;

    const article = new Article(articleData);
    
    if (includeRelations && articleData.category_name) {
      article.category = {
        id: articleData.category_id,
        name: articleData.category_name,
        slug: articleData.category_slug
      };
      article.author = {
        id: articleData.author_id,
        username: articleData.author_username
      };
    }
    
    return article;
  }

  // Find all articles with filtering and pagination
  static findAll(options = {}) {
    const {
      status,
      category_id,
      author_id,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDir = 'DESC',
      includeRelations = true
    } = options;

    const db = dbManager.getDatabase();
    const conditions = [];
    const params = [];

    // Build WHERE conditions
    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }
    
    if (category_id) {
      conditions.push('a.category_id = ?');
      params.push(category_id);
    }
    
    if (author_id) {
      conditions.push('a.author_id = ?');
      params.push(author_id);
    }

    let query;
    if (includeRelations) {
      query = `
        SELECT 
          a.*,
          c.name as category_name,
          c.slug as category_slug,
          u.username as author_username
        FROM articles a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN users u ON a.author_id = u.id
      `;
    } else {
      query = 'SELECT * FROM articles a';
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY a.${orderBy} ${orderDir} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const articles = db.prepare(query).all(...params);
    
    return articles.map(articleData => {
      const article = new Article(articleData);
      
      if (includeRelations && articleData.category_name) {
        article.category = {
          id: articleData.category_id,
          name: articleData.category_name,
          slug: articleData.category_slug
        };
        article.author = {
          id: articleData.author_id,
          username: articleData.author_username
        };
      }
      
      return article;
    });
  }

  // Update article
  async update(updateData) {
    const db = dbManager.getDatabase();
    const allowedFields = [
      'title', 'content', 'excerpt', 'thumbnail_url', 
      'category_id', 'status'
    ];
    const updates = [];
    const values = [];

    // Handle title update with slug regeneration
    if (updateData.title && updateData.title !== this.title) {
      const baseSlug = Article.generateSlug(updateData.title);
      const uniqueSlug = await Article.ensureUniqueSlug(baseSlug, this.id);
      updateData.slug = uniqueSlug;
      allowedFields.push('slug');
    }

    // Handle status change to published
    if (updateData.status === 'published' && this.status !== 'published') {
      updateData.published_at = new Date().toISOString();
      allowedFields.push('published_at');
    }

    // Build dynamic update query
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add updated_at timestamp
    updates.push('updated_at = datetime(\'now\')');
    values.push(this.id);

    const sql = `UPDATE articles SET ${updates.join(', ')} WHERE id = ?`;
    
    try {
      const result = db.prepare(sql).run(...values);
      
      if (result.changes === 0) {
        throw new Error('Article not found');
      }

      // Refresh the instance with updated data
      const updatedArticle = Article.findById(this.id);
      Object.assign(this, updatedArticle);
      
      return this;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Article slug already exists');
      }
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        throw new Error('Invalid category_id');
      }
      throw error;
    }
  }

  // Delete article
  static delete(id) {
    const db = dbManager.getDatabase();
    const result = db.prepare('DELETE FROM articles WHERE id = ?').run(id);
    
    return result.changes > 0;
  }

  // Count articles with optional filtering
  static count(options = {}) {
    const { status, category_id, author_id } = options;
    const db = dbManager.getDatabase();
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    
    if (category_id) {
      conditions.push('category_id = ?');
      params.push(category_id);
    }
    
    if (author_id) {
      conditions.push('author_id = ?');
      params.push(author_id);
    }

    let query = 'SELECT COUNT(*) as count FROM articles';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = db.prepare(query).get(...params);
    return result.count;
  }

  // Publish article (change status from draft to published)
  async publish() {
    if (this.status === 'published') {
      throw new Error('Article is already published');
    }

    return await this.update({
      status: 'published',
      published_at: new Date().toISOString()
    });
  }

  // Archive article
  async archive() {
    return await this.update({ status: 'archived' });
  }

  // Convert to JSON (clean output)
  toJSON() {
    const json = { ...this };
    
    // Remove internal database fields from related data
    if (json.category_name) {
      delete json.category_name;
      delete json.category_slug;
    }
    if (json.author_username) {
      delete json.author_username;
    }
    
    return json;
  }

  // Validate article data
  static validateArticleData(articleData) {
    const errors = [];
    const { title, content, category_id, author_id, status } = articleData;

    // Title validation
    if (!title || title.trim().length === 0) {
      errors.push('Title is required');
    }
    if (title && title.length > 255) {
      errors.push('Title must be less than 255 characters');
    }

    // Content validation
    if (!content || content.trim().length === 0) {
      errors.push('Content is required');
    }

    // Category validation
    if (!category_id) {
      errors.push('Category is required');
    }
    if (category_id && !Number.isInteger(Number(category_id))) {
      errors.push('Category ID must be a valid integer');
    }

    // Author validation
    if (!author_id) {
      errors.push('Author is required');
    }
    if (author_id && !Number.isInteger(Number(author_id))) {
      errors.push('Author ID must be a valid integer');
    }

    // Status validation
    const validStatuses = ['draft', 'published', 'archived'];
    if (status && !validStatuses.includes(status)) {
      errors.push('Status must be one of: draft, published, archived');
    }

    // Excerpt validation
    if (articleData.excerpt && articleData.excerpt.length > 500) {
      errors.push('Excerpt must be less than 500 characters');
    }

    return errors;
  }
}

module.exports = Article;