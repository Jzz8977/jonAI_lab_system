const Database = require('better-sqlite3');
const path = require('path');

class Category {
  constructor() {
    const dbPath = path.join(__dirname, '../data/blog_admin.db');
    this.db = new Database(dbPath);
  }

  // Create a new category
  create(categoryData) {
    const { name, description, slug } = categoryData;
    
    const stmt = this.db.prepare(`
      INSERT INTO categories (name, description, slug, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    try {
      const result = stmt.run(name, description, slug);
      return this.findById(result.lastInsertRowid);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Category name or slug already exists');
      }
      throw error;
    }
  }

  // Find category by ID
  findById(id) {
    const stmt = this.db.prepare('SELECT * FROM categories WHERE id = ?');
    return stmt.get(id);
  }

  // Find category by slug
  findBySlug(slug) {
    const stmt = this.db.prepare('SELECT * FROM categories WHERE slug = ?');
    return stmt.get(slug);
  }

  // Get all categories with optional pagination
  findAll(options = {}) {
    const { limit, offset, orderBy = 'name', orderDir = 'ASC' } = options;
    
    let query = `SELECT * FROM categories ORDER BY ${orderBy} ${orderDir}`;
    const params = [];
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
      
      if (offset) {
        query += ' OFFSET ?';
        params.push(offset);
      }
    }
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  // Update category
  update(id, categoryData) {
    const { name, description, slug } = categoryData;
    
    const stmt = this.db.prepare(`
      UPDATE categories 
      SET name = ?, description = ?, slug = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    
    try {
      const result = stmt.run(name, description, slug, id);
      
      if (result.changes === 0) {
        throw new Error('Category not found');
      }
      
      return this.findById(id);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Category name or slug already exists');
      }
      throw error;
    }
  }

  // Delete category (with check for associated articles)
  delete(id) {
    // First check if category has associated articles
    const articleCheckStmt = this.db.prepare('SELECT COUNT(*) as count FROM articles WHERE category_id = ?');
    const articleCount = articleCheckStmt.get(id);
    
    if (articleCount.count > 0) {
      throw new Error('Cannot delete category with associated articles');
    }
    
    const stmt = this.db.prepare('DELETE FROM categories WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      throw new Error('Category not found');
    }
    
    return { success: true, deletedId: id };
  }

  // Get category count
  count() {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM categories');
    return stmt.get().count;
  }

  // Generate slug from name
  static generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Validate category data
  static validate(categoryData) {
    const errors = [];
    
    if (!categoryData.name || categoryData.name.trim().length === 0) {
      errors.push('Name is required');
    }
    
    if (categoryData.name && categoryData.name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }
    
    if (categoryData.description && categoryData.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }
    
    if (!categoryData.slug || categoryData.slug.trim().length === 0) {
      errors.push('Slug is required');
    }
    
    if (categoryData.slug && categoryData.slug.length > 100) {
      errors.push('Slug must be less than 100 characters');
    }
    
    // Validate slug format (only lowercase letters, numbers, and hyphens)
    if (categoryData.slug && !/^[a-z0-9-]+$/.test(categoryData.slug)) {
      errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
    }
    
    return errors;
  }
}

module.exports = Category;