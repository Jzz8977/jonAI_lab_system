const dbManager = require('../config/database');

class AnalyticsService {
  /**
   * Increment view count for an article with IP-based deduplication
   * Only counts unique views per IP address per day
   */
  static incrementViewCount(articleId, ipAddress, userAgent = null) {
    const db = dbManager.getDatabase();
    
    try {
      // Check if this IP has already viewed this article today
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const existingView = db.prepare(`
        SELECT id FROM article_views 
        WHERE article_id = ? AND ip_address = ? AND DATE(created_at) = ?
      `).get(articleId, ipAddress, today);
      
      if (existingView) {
        return { viewed: false, message: 'Already viewed today' };
      }
      
      // Start transaction
      const transaction = db.transaction(() => {
        // Record the view
        db.prepare(`
          INSERT INTO article_views (article_id, ip_address, user_agent, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `).run(articleId, ipAddress, userAgent);
        
        // Increment view count on article
        const result = db.prepare(`
          UPDATE articles 
          SET view_count = view_count + 1, updated_at = datetime('now')
          WHERE id = ?
        `).run(articleId);
        
        if (result.changes === 0) {
          throw new Error('Article not found');
        }
      });
      
      transaction();
      
      return { viewed: true, message: 'View count incremented' };
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        throw new Error('Article not found');
      }
      throw error;
    }
  }
  
  /**
   * Toggle like status for an article by IP address
   * Returns whether the article is now liked or unliked
   */
  static toggleLike(articleId, ipAddress, userAgent = null) {
    const db = dbManager.getDatabase();
    
    try {
      // Check if this IP has already liked this article
      const existingLike = db.prepare(`
        SELECT id FROM article_likes 
        WHERE article_id = ? AND ip_address = ?
      `).get(articleId, ipAddress);
      
      let isLiked;
      
      // Start transaction
      const transaction = db.transaction(() => {
        if (existingLike) {
          // Unlike: Remove the like record
          db.prepare(`
            DELETE FROM article_likes 
            WHERE article_id = ? AND ip_address = ?
          `).run(articleId, ipAddress);
          
          // Decrement like count
          const result = db.prepare(`
            UPDATE articles 
            SET like_count = like_count - 1, updated_at = datetime('now')
            WHERE id = ?
          `).run(articleId);
          
          if (result.changes === 0) {
            throw new Error('Article not found');
          }
          
          isLiked = false;
        } else {
          // Like: Add the like record
          db.prepare(`
            INSERT INTO article_likes (article_id, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, datetime('now'))
          `).run(articleId, ipAddress, userAgent);
          
          // Increment like count
          const result = db.prepare(`
            UPDATE articles 
            SET like_count = like_count + 1, updated_at = datetime('now')
            WHERE id = ?
          `).run(articleId);
          
          if (result.changes === 0) {
            throw new Error('Article not found');
          }
          
          isLiked = true;
        }
      });
      
      transaction();
      
      return { 
        liked: isLiked, 
        message: isLiked ? 'Article liked' : 'Article unliked' 
      };
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        throw new Error('Article not found');
      }
      throw error;
    }
  }
  
  /**
   * Get dashboard metrics including totals and trends
   */
  static getDashboardMetrics(dateRange = 'all') {
    const db = dbManager.getDatabase();
    
    try {
      // Calculate date filter based on range
      let dateFilter = '';
      let dateParams = [];
      
      if (dateRange !== 'all') {
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : null;
        if (days) {
          dateFilter = 'WHERE created_at >= datetime(\'now\', \'-' + days + ' days\')';
        }
      }
      
      // Get total counts
      const totalArticles = db.prepare('SELECT COUNT(*) as count FROM articles WHERE status = \'published\'').get().count;
      
      const totalViews = db.prepare('SELECT COALESCE(SUM(view_count), 0) as total FROM articles WHERE status = \'published\'').get().total;
      
      const totalLikes = db.prepare('SELECT COALESCE(SUM(like_count), 0) as total FROM articles WHERE status = \'published\'').get().total;
      
      // Get recent articles (last 5 published)
      const recentArticles = db.prepare(`
        SELECT 
          a.id, a.title, a.slug, a.view_count, a.like_count, 
          a.published_at, a.thumbnail_url,
          c.name as category_name, c.slug as category_slug
        FROM articles a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.status = 'published'
        ORDER BY a.published_at DESC
        LIMIT 5
      `).all();
      
      // Get top articles by views (last 10)
      const topArticles = this.getTopArticles(10);
      
      // Get view trends for the last 7 days
      const viewTrends = db.prepare(`
        SELECT 
          DATE(av.created_at) as date,
          COUNT(*) as views
        FROM article_views av
        WHERE av.created_at >= datetime('now', '-7 days')
        GROUP BY DATE(av.created_at)
        ORDER BY date ASC
      `).all();
      
      return {
        totals: {
          articles: totalArticles,
          views: totalViews,
          likes: totalLikes
        },
        recent_articles: recentArticles.map(article => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          view_count: article.view_count,
          like_count: article.like_count,
          published_at: article.published_at,
          thumbnail_url: article.thumbnail_url,
          category: {
            name: article.category_name,
            slug: article.category_slug
          }
        })),
        top_articles: topArticles,
        view_trends: viewTrends
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard metrics: ${error.message}`);
    }
  }
  
  /**
   * Get top articles by view count with performance optimization
   */
  static getTopArticles(limit = 10, dateRange = 'all') {
    const db = dbManager.getDatabase();
    
    try {
      let dateFilter = '';
      let params = [limit];
      
      // Add date filtering if specified
      if (dateRange !== 'all') {
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : null;
        if (days) {
          dateFilter = 'AND a.published_at >= datetime(\'now\', \'-' + days + ' days\')';
        }
      }
      
      const query = `
        SELECT 
          a.id, a.title, a.slug, a.excerpt, a.thumbnail_url,
          a.view_count, a.like_count, a.published_at,
          c.name as category_name, c.slug as category_slug,
          u.username as author_username
        FROM articles a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.status = 'published' ${dateFilter}
        ORDER BY a.view_count DESC, a.like_count DESC
        LIMIT ?
      `;
      
      const articles = db.prepare(query).all(...params);
      
      return articles.map(article => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        thumbnail_url: article.thumbnail_url,
        view_count: article.view_count,
        like_count: article.like_count,
        published_at: article.published_at,
        category: {
          name: article.category_name,
          slug: article.category_slug
        },
        author: {
          username: article.author_username
        }
      }));
    } catch (error) {
      throw new Error(`Failed to get top articles: ${error.message}`);
    }
  }
  
  /**
   * Get article analytics for a specific article
   */
  static getArticleAnalytics(articleId) {
    const db = dbManager.getDatabase();
    
    try {
      // Get article basic info
      const article = db.prepare(`
        SELECT id, title, slug, view_count, like_count, published_at
        FROM articles 
        WHERE id = ?
      `).get(articleId);
      
      if (!article) {
        throw new Error('Article not found');
      }
      
      // Get daily view trends for last 30 days
      const viewTrends = db.prepare(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as views
        FROM article_views
        WHERE article_id = ? AND created_at >= datetime('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `).get(articleId);
      
      // Get like trends for last 30 days
      const likeTrends = db.prepare(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as likes
        FROM article_likes
        WHERE article_id = ? AND created_at >= datetime('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `).all(articleId);
      
      return {
        article: {
          id: article.id,
          title: article.title,
          slug: article.slug,
          view_count: article.view_count,
          like_count: article.like_count,
          published_at: article.published_at
        },
        trends: {
          views: viewTrends || [],
          likes: likeTrends || []
        }
      };
    } catch (error) {
      throw new Error(`Failed to get article analytics: ${error.message}`);
    }
  }
  
  /**
   * Check if an IP address has liked a specific article
   */
  static hasLiked(articleId, ipAddress) {
    const db = dbManager.getDatabase();
    
    const like = db.prepare(`
      SELECT id FROM article_likes 
      WHERE article_id = ? AND ip_address = ?
    `).get(articleId, ipAddress);
    
    return !!like;
  }
  
  /**
   * Get engagement summary for date range
   */
  static getEngagementSummary(dateRange = '7d') {
    const db = dbManager.getDatabase();
    
    try {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 7;
      
      const summary = db.prepare(`
        SELECT 
          COUNT(DISTINCT av.article_id) as articles_viewed,
          COUNT(av.id) as total_views,
          COUNT(DISTINCT av.ip_address) as unique_visitors,
          (
            SELECT COUNT(*) 
            FROM article_likes al 
            WHERE al.created_at >= datetime('now', '-${days} days')
          ) as total_likes
        FROM article_views av
        WHERE av.created_at >= datetime('now', '-${days} days')
      `).get();
      
      return {
        period: `${days} days`,
        articles_viewed: summary.articles_viewed || 0,
        total_views: summary.total_views || 0,
        unique_visitors: summary.unique_visitors || 0,
        total_likes: summary.total_likes || 0,
        avg_views_per_visitor: summary.unique_visitors > 0 
          ? Math.round((summary.total_views || 0) / summary.unique_visitors * 100) / 100 
          : 0
      };
    } catch (error) {
      throw new Error(`Failed to get engagement summary: ${error.message}`);
    }
  }
}

module.exports = AnalyticsService;