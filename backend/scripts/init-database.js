const dbManager = require('../config/database');
const MigrationManager = require('../migrations');
const bcrypt = require('bcrypt');

class DatabaseInitializer {
  constructor() {
    this.db = dbManager;
    this.migrationManager = new MigrationManager(dbManager);
  }

  async initialize() {
    try {
      console.log('🚀 Initializing database...');
      
      // Run migrations
      await this.migrationManager.runMigrations();
      
      // Verify schema
      this.migrationManager.verifySchema();
      
      // Seed initial data
      await this.seedData();
      
      // Test database integrity
      await this.testDatabaseIntegrity();
      
      console.log('🎉 Database initialization completed successfully');
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async seedData() {
    console.log('🌱 Seeding initial data...');
    
    // Check if data already exists
    const existingUsers = this.db.queryOne('SELECT COUNT(*) as count FROM users');
    const existingCategories = this.db.queryOne('SELECT COUNT(*) as count FROM categories');
    
    if (existingUsers.count > 0 && existingCategories.count > 0) {
      console.log('✅ Data already exists, skipping seed');
      return;
    }
    
    const transaction = this.db.transaction(() => {
      // Seed admin user if no users exist
      if (existingUsers.count === 0) {
        console.log('👤 Creating admin user...');
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        
        this.db.run(`
          INSERT INTO users (username, email, password_hash, role)
          VALUES (?, ?, ?, ?)
        `, ['admin', 'admin@jonai-lab.com', hashedPassword, 'admin']);
        
        console.log('✅ Admin user created (username: admin, password: admin123)');
      }
      
      // Seed categories if none exist
      if (existingCategories.count === 0) {
        console.log('📂 Creating sample categories...');
        
        const categories = [
          {
            name: 'Machine Learning',
            description: 'Articles about machine learning algorithms, techniques, and applications',
            slug: 'machine-learning'
          },
          {
            name: 'Natural Language Processing',
            description: 'Content focused on NLP, language models, and text processing',
            slug: 'natural-language-processing'
          },
          {
            name: 'Computer Vision',
            description: 'Image processing, object detection, and visual AI technologies',
            slug: 'computer-vision'
          },
          {
            name: 'AI Ethics',
            description: 'Discussions on responsible AI, bias, and ethical considerations',
            slug: 'ai-ethics'
          },
          {
            name: 'Industry News',
            description: 'Latest news and developments in the AI industry',
            slug: 'industry-news'
          },
          {
            name: 'Research Papers',
            description: 'Analysis and summaries of important AI research papers',
            slug: 'research-papers'
          }
        ];
        
        for (const category of categories) {
          this.db.run(`
            INSERT INTO categories (name, description, slug)
            VALUES (?, ?, ?)
          `, [category.name, category.description, category.slug]);
        }
        
        console.log(`✅ Created ${categories.length} sample categories`);
      }
    });
    
    transaction();
    console.log('🌱 Seed data completed');
  }

  async createSampleArticle() {
    // This method can be used to create a sample article for testing
    const adminUser = this.db.queryOne('SELECT id FROM users WHERE username = ?', ['admin']);
    const category = this.db.queryOne('SELECT id FROM categories WHERE slug = ?', ['machine-learning']);
    
    if (adminUser && category) {
      const sampleArticle = {
        title: 'Welcome to JonAI-Lab Blog',
        slug: 'welcome-to-jonai-lab-blog',
        content: `<h2>Welcome to JonAI-Lab Blog</h2>
        <p>This is a sample article to demonstrate the blog admin system. Here you can manage your AI-focused content with ease.</p>
        <h3>Features</h3>
        <ul>
          <li>Rich text editing</li>
          <li>Category management</li>
          <li>Analytics tracking</li>
          <li>User engagement metrics</li>
        </ul>
        <p>Start creating amazing AI content today!</p>`,
        excerpt: 'Welcome to the JonAI-Lab blog admin system. This sample article demonstrates the key features of our content management platform.',
        category_id: category.id,
        author_id: adminUser.id,
        status: 'published',
        published_at: new Date().toISOString()
      };
      
      this.db.run(`
        INSERT INTO articles (title, slug, content, excerpt, category_id, author_id, status, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        sampleArticle.title,
        sampleArticle.slug,
        sampleArticle.content,
        sampleArticle.excerpt,
        sampleArticle.category_id,
        sampleArticle.author_id,
        sampleArticle.status,
        sampleArticle.published_at
      ]);
      
      console.log('✅ Sample article created');
    }
  }

  async testDatabaseIntegrity() {
    console.log('🧪 Testing database integrity...');
    
    try {
      // Test foreign key constraints
      const adminUser = this.db.queryOne('SELECT id FROM users WHERE username = ?', ['admin']);
      const category = this.db.queryOne('SELECT id FROM categories LIMIT 1');
      
      if (adminUser && category) {
        // Test valid article creation
        const testArticle = this.db.run(`
          INSERT INTO articles (title, slug, content, category_id, author_id, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `, ['Test Article', 'test-article-' + Date.now(), 'Test content', category.id, adminUser.id, 'draft']);
        
        console.log('✅ Article creation test passed');
        
        // Test article likes constraint
        const testLike = this.db.run(`
          INSERT INTO article_likes (article_id, ip_address)
          VALUES (?, ?)
        `, [testArticle.lastInsertRowid, '127.0.0.1']);
        
        console.log('✅ Article like creation test passed');
        
        // Test unique constraint on article likes
        try {
          this.db.run(`
            INSERT INTO article_likes (article_id, ip_address)
            VALUES (?, ?)
          `, [testArticle.lastInsertRowid, '127.0.0.1']);
          console.log('❌ Unique constraint test failed - duplicate like was allowed');
        } catch (error) {
          console.log('✅ Unique constraint test passed - duplicate like prevented');
        }
        
        // Clean up test data
        this.db.run('DELETE FROM article_likes WHERE article_id = ?', [testArticle.lastInsertRowid]);
        this.db.run('DELETE FROM articles WHERE id = ?', [testArticle.lastInsertRowid]);
        
        console.log('🧹 Test data cleaned up');
      }
      
      console.log('✅ Database integrity tests completed');
      
    } catch (error) {
      console.error('❌ Database integrity test failed:', error.message);
      throw error;
    }
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  const initializer = new DatabaseInitializer();
  initializer.initialize()
    .then(() => {
      console.log('Database initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseInitializer;