const fs = require('fs');
const path = require('path');

class MigrationManager {
  constructor(database) {
    this.db = database;
    this.migrationsDir = path.join(__dirname, 'files');
    this.init();
  }

  init() {
    // Create migrations table if it doesn't exist
    const db = this.db.getDatabase ? this.db.getDatabase() : this.db;
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async runMigrations() {
    console.log('🔄 Running database migrations...');
    
    try {
      // Get all migration files
      const migrationFiles = this.getMigrationFiles();
      
      if (migrationFiles.length === 0) {
        console.log('📋 No migration files found');
        return;
      }
      
      // Get database instance
      const db = this.db.getDatabase ? this.db.getDatabase() : this.db;
      
      // Get executed migrations
      const executedMigrations = db.prepare('SELECT filename FROM migrations ORDER BY filename').all();
      const executedFilenames = executedMigrations.map(m => m.filename);
      
      // Find pending migrations
      const pendingMigrations = migrationFiles.filter(file => !executedFilenames.includes(file));
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }
      
      console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
      
      // Execute pending migrations in transaction
      const transaction = db.transaction(() => {
        for (const filename of pendingMigrations) {
          console.log(`⚡ Executing migration: ${filename}`);
          
          const migrationPath = path.join(this.migrationsDir, filename);
          
          if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${filename}`);
          }
          
          const migrationSql = fs.readFileSync(migrationPath, 'utf8');
          
          if (!migrationSql.trim()) {
            console.log(`⚠️  Warning: Empty migration file: ${filename}`);
            continue;
          }
          
          // Split by semicolon and execute each statement
          const statements = migrationSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
          
          for (const statement of statements) {
            try {
              db.exec(statement);
            } catch (error) {
              console.error(`❌ Error executing statement in ${filename}:`, statement);
              throw error;
            }
          }
          
          // Record migration as executed
          db.prepare('INSERT INTO migrations (filename) VALUES (?)').run(filename);
          
          console.log(`✅ Migration completed: ${filename}`);
        }
      });
      
      transaction();
      console.log('🎉 All migrations completed successfully');
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  getMigrationFiles() {
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
      return [];
    }
    
    return fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure chronological order
  }

  verifySchema() {
    console.log('🔍 Verifying database schema...');
    
    const db = this.db.getDatabase ? this.db.getDatabase() : this.db;
    
    // Check if all required tables exist
    const requiredTables = ['users', 'categories', 'articles', 'article_likes'];
    const existingTables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'migrations'
      ORDER BY name
    `).all().map(row => row.name);
    
    console.log('📋 Existing tables:', existingTables.join(', '));
    
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.error('❌ Missing tables:', missingTables.join(', '));
      return false;
    }
    
    // Verify table structures
    for (const table of requiredTables) {
      const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
      console.log(`📊 Table ${table} has ${tableInfo.length} columns`);
    }
    
    // Check foreign key constraints
    const foreignKeys = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND sql LIKE '%FOREIGN KEY%'
    `).all();
    
    console.log(`🔗 Found ${foreignKeys.length} tables with foreign key constraints`);
    
    console.log('✅ Schema verification completed');
    return true;
  }

  async rollback(steps = 1) {
    console.log(`🔄 Rolling back ${steps} migration(s)...`);
    
    const db = this.db.getDatabase ? this.db.getDatabase() : this.db;
    const executedMigrations = db.prepare(
      'SELECT filename FROM migrations ORDER BY executed_at DESC LIMIT ?'
    ).all(steps);
    
    if (executedMigrations.length === 0) {
      console.log('❌ No migrations to rollback');
      return;
    }
    
    // Note: This is a basic rollback - in production you'd want proper down migrations
    console.log('⚠️  Warning: Rollback functionality requires manual intervention');
    console.log('Migrations to rollback:', executedMigrations.map(m => m.filename));
  }
}

module.exports = MigrationManager;