const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/analytics');
const { body, param, query, validationResult } = require('express-validator');

// Middleware to get client IP address
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         '127.0.0.1';
};

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array()
      },
      timestamp: new Date().toISOString()
    });
  }
  next();
};

/**
 * POST /api/analytics/articles/:id/view
 * Increment view count for an article
 */
router.post('/articles/:id/view', [
  param('id').isInt({ min: 1 }).withMessage('Article ID must be a positive integer'),
  handleValidationErrors
], async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    const result = await AnalyticsService.incrementViewCount(articleId, ipAddress, userAgent);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    
    const statusCode = error.message === 'Article not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'ARTICLE_NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/analytics/articles/:id/like
 * Toggle like status for an article
 */
router.post('/articles/:id/like', [
  param('id').isInt({ min: 1 }).withMessage('Article ID must be a positive integer'),
  handleValidationErrors
], async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    const result = await AnalyticsService.toggleLike(articleId, ipAddress, userAgent);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    
    const statusCode = error.message === 'Article not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'ARTICLE_NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/analytics/articles/:id/status
 * Check if current IP has liked an article
 */
router.get('/articles/:id/status', [
  param('id').isInt({ min: 1 }).withMessage('Article ID must be a positive integer'),
  handleValidationErrors
], async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    const ipAddress = getClientIP(req);
    
    const hasLiked = await AnalyticsService.hasLiked(articleId, ipAddress);
    
    res.json({
      success: true,
      data: {
        article_id: articleId,
        has_liked: hasLiked,
        ip_address: ipAddress.substring(0, 8) + '...' // Partial IP for privacy
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking like status:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/analytics/dashboard
 * Get dashboard metrics and analytics
 */
router.get('/dashboard', [
  query('range').optional().isIn(['7d', '30d', 'all']).withMessage('Range must be 7d, 30d, or all'),
  handleValidationErrors
], async (req, res) => {
  try {
    const dateRange = req.query.range || 'all';
    
    const metrics = await AnalyticsService.getDashboardMetrics(dateRange);
    
    res.json({
      success: true,
      data: {
        ...metrics,
        date_range: dateRange,
        generated_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/analytics/articles/top
 * Get top performing articles
 */
router.get('/articles/top', [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('range').optional().isIn(['7d', '30d', 'all']).withMessage('Range must be 7d, 30d, or all'),
  handleValidationErrors
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const dateRange = req.query.range || 'all';
    
    const topArticles = await AnalyticsService.getTopArticles(limit, dateRange);
    
    res.json({
      success: true,
      data: {
        articles: topArticles,
        limit: limit,
        date_range: dateRange
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting top articles:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/analytics/articles/:id
 * Get analytics for a specific article
 */
router.get('/articles/:id', [
  param('id').isInt({ min: 1 }).withMessage('Article ID must be a positive integer'),
  handleValidationErrors
], async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    
    const analytics = await AnalyticsService.getArticleAnalytics(articleId);
    
    res.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting article analytics:', error);
    
    const statusCode = error.message === 'Article not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'ARTICLE_NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/analytics/engagement
 * Get engagement summary for specified date range
 */
router.get('/engagement', [
  query('range').optional().isIn(['7d', '30d']).withMessage('Range must be 7d or 30d'),
  handleValidationErrors
], async (req, res) => {
  try {
    const dateRange = req.query.range || '7d';
    
    const engagement = await AnalyticsService.getEngagementSummary(dateRange);
    
    res.json({
      success: true,
      data: engagement,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting engagement summary:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;