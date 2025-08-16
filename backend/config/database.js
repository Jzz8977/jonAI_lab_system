const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'blog_admin.db');
    this.migrationManager = null;
    this.init();
  }

  init() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Initialize database connection
      this.db = new Database(this.dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : null
      });

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Set journal mode to WAL for better performance
      this.db.pragma('journal_mode = WAL');

      console.log('✅ Database connection established');
      console.log(`📁 Database file: ${this.dbPath}`);
      
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async initializeSchema() {
    // Initialize migration manager and run migrations
    if (!this.migrationManager) {
      const MigrationManager = require('../migrations');
      this.migrationManager = new MigrationManager(this.db);
    }
    
    await this.migrationManager.runMigrations();
  }

  getDatabase() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('🔒 Database connection closed');
    }
  }

  // Execute a query with error handling
  query(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(params);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Execute a single row query
  queryOne(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(params);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Execute an insert/update/delete query
  run(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.run(params);
    } catch (error) {
      console.error('Database run error:', error);
      throw error;
    }
  }

  // Begin transaction
  transaction(callback) {
    const transaction = this.db.transaction(callback);
    return transaction;
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

// Graceful shutdown
process.on('SIGINT', () => {
  dbManager.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  dbManager.close();
  process.exit(0);
});

module.exports = dbManager;