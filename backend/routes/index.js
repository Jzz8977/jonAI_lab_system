const express = require('express');
const router = express.Router();

// Import middleware
const { 
  authLimiter, 
  contentLimiter, 
  analyticsLimiter, 
  uploadLimiter 
} = require('../middleware/rateLimiting');
const { cacheMiddleware } = require('../middleware/caching');
const cors = require('cors');

// Import route modules
const authRoutes = require('./auth');
const articleRoutes = require('./articles');
const categoryRoutes = require('./categories');
const analyticsRoutes = require('./analytics');
const uploadRoutes = require('./upload');

// Mount routes with specific middleware
router.use('/auth', authLimiter, authRoutes);
router.use('/articles', articleRoutes);
router.use('/categories', categoryRoutes);
router.use('/analytics', analyticsLimiter, cacheMiddleware.analytics, analyticsRoutes);
router.use('/upload', uploadLimiter, uploadRoutes);

// Placeholder route for testing
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'API routes are ready',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;