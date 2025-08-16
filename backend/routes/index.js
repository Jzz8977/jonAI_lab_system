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
const publicRoutes = require('./public');

// Mount routes with specific middleware
router.use('/auth', authLimiter, authRoutes);
router.use('/articles', contentLimiter, articleRoutes);
router.use('/categories', contentLimiter, categoryRoutes);
router.use('/analytics', analyticsLimiter, cacheMiddleware.analytics, analyticsRoutes);
router.use('/upload', uploadLimiter, uploadRoutes);

// Mount public routes with permissive CORS (allow all origins)
const publicCorsOptions = {
  origin: true, // Allow all origins
  credentials: false, // No need for credentials on public endpoints
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

router.use('/public', cors(publicCorsOptions), publicRoutes);

// Placeholder route for testing
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'API routes are ready',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;