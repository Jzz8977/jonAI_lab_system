const bcrypt = require('bcrypt');
const dbManager = require('../config/database');

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.role = data.role || 'admin';
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Hash password before storing
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Verify password against hash
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password_hash);
  }

  // Create a new user
  static async create(userData) {
    const { username, email, password, role = 'admin' } = userData;
    
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required');
    }

    // Hash the password
    const password_hash = await this.hashPassword(password);
    
    const db = dbManager.getDatabase();
    
    try {
      const result = db.prepare(`
        INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(username, email, password_hash, role);

      return this.findById(result.lastInsertRowid);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Username or email already exists');
      }
      throw error;
    }
  }

  // Find user by ID
  static findById(id) {
    const db = dbManager.getDatabase();
    const userData = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    
    return userData ? new User(userData) : null;
  }

  // Find user by username
  static findByUsername(username) {
    const db = dbManager.getDatabase();
    const userData = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    return userData ? new User(userData) : null;
  }

  // Find user by email
  static findByEmail(email) {
    const db = dbManager.getDatabase();
    const userData = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    return userData ? new User(userData) : null;
  }

  // Update user
  async update(updateData) {
    const db = dbManager.getDatabase();
    const allowedFields = ['username', 'email', 'role'];
    const updates = [];
    const values = [];

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

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    
    try {
      const result = db.prepare(sql).run(...values);
      
      if (result.changes === 0) {
        throw new Error('User not found');
      }

      // Refresh the instance with updated data
      const updatedUser = User.findById(this.id);
      Object.assign(this, updatedUser);
      
      return this;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Username or email already exists');
      }
      throw error;
    }
  }

  // Change password
  async changePassword(newPassword) {
    if (!newPassword) {
      throw new Error('New password is required');
    }

    const password_hash = await User.hashPassword(newPassword);
    const db = dbManager.getDatabase();
    
    const result = db.prepare(`
      UPDATE users 
      SET password_hash = ?, updated_at = datetime('now') 
      WHERE id = ?
    `).run(password_hash, this.id);

    if (result.changes === 0) {
      throw new Error('User not found');
    }

    this.password_hash = password_hash;
    return this;
  }

  // Delete user
  static delete(id) {
    const db = dbManager.getDatabase();
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    
    return result.changes > 0;
  }

  // Get all users (for admin purposes)
  static findAll(limit = 50, offset = 0) {
    const db = dbManager.getDatabase();
    const users = db.prepare(`
      SELECT * FROM users 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    return users.map(userData => new User(userData));
  }

  // Count total users
  static count() {
    const db = dbManager.getDatabase();
    const result = db.prepare('SELECT COUNT(*) as count FROM users').get();
    return result.count;
  }

  // Convert to JSON (exclude password hash)
  toJSON() {
    const { password_hash, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }

  // Validate user data
  static validateUserData(userData) {
    const errors = [];
    const { username, email, password } = userData;

    // Username validation
    if (!username || username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (username && username.length > 50) {
      errors.push('Username must be less than 50 characters');
    }
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    // Email validation
    if (!email) {
      errors.push('Email is required');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
    }

    // Password validation
    if (!password) {
      errors.push('Password is required');
    }
    if (password && password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one lowercase letter, one uppercase letter, and one number');
    }

    return errors;
  }
}

module.exports = User;