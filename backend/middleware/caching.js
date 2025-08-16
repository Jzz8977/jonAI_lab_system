const NodeCache = require('node-cache');

// Create cache instances with different TTL settings
const shortCache = new NodeCache({ stdTTL: 300 }); // 5 minutes
const mediumCache = new NodeCache({ stdTTL: 1800 }); // 30 minutes
const longCache = new NodeCache({ stdTTL: 3600 }); // 1 hour

// Cache middleware factory
const createCacheMiddleware = (cache, keyGenerator, ttl) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator ? keyGenerator(req) : `${req.method}:${req.originalUrl}`;
    
    // Try to get cached response
    const cachedResponse = cache.get(cacheKey);
    
    if (cachedResponse) {
      // Set cache headers
      res.set({
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${ttl || cache.options.stdTTL}`,
        'ETag': cachedResponse.etag
      });
      
      return res.status(cachedResponse.status).json(cachedResponse.data);
    }

    // Store original res.json method
    const originalJson = res.json;
    
    // Override res.json to cache the response
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const etag = generateETag(data);
        const cacheData = {
          status: res.statusCode,
          data: data,
          etag: etag,
          timestamp: new Date().toISOString()
        };
        
        cache.set(cacheKey, cacheData, ttl);
        
        // Set cache headers
        res.set({
          'X-Cache': 'MISS',
          'Cache-Control': `public, max-age=${ttl || cache.options.stdTTL}`,
          'ETag': etag
        });
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

// Generate ETag for response data
const generateETag = (data) => {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
};

// Cache key generators for different endpoints
const cacheKeyGenerators = {
  articles: (req) => {
    const { status, category_id, author_id, page, limit, orderBy, orderDir } = req.query;
    return `articles:${status || 'all'}:${category_id || 'all'}:${author_id || 'all'}:${page || 1}:${limit || 10}:${orderBy || 'created_at'}:${orderDir || 'DESC'}`;
  },
  
  categories: (req) => {
    return 'categories:all';
  },
  
  analytics: (req) => {
    const { range } = req.query;
    return `analytics:dashboard:${range || 'all'}`;
  },
  
  topArticles: (req) => {
    const { limit, range } = req.query;
    return `analytics:top-articles:${limit || 10}:${range || 'all'}`;
  },
  
  articleById: (req) => {
    return `article:${req.params.id}`;
  },
  
  articleBySlug: (req) => {
    return `article:slug:${req.params.slug}`;
  }
};

// Pre-configured cache middleware for different use cases
const cacheMiddleware = {
  // Short-term caching for frequently changing data
  short: createCacheMiddleware(shortCache, null, 300),
  
  // Medium-term caching for moderately changing data
  medium: createCacheMiddleware(mediumCache, null, 1800),
  
  // Long-term caching for rarely changing data
  long: createCacheMiddleware(longCache, null, 3600),
  
  // Specific caching for articles list
  articles: createCacheMiddleware(shortCache, cacheKeyGenerators.articles, 300),
  
  // Specific caching for categories (rarely change)
  categories: createCacheMiddleware(longCache, cacheKeyGenerators.categories, 3600),
  
  // Specific caching for analytics dashboard
  analytics: createCacheMiddleware(mediumCache, cacheKeyGenerators.analytics, 1800),
  
  // Specific caching for top articles
  topArticles: createCacheMiddleware(mediumCache, cacheKeyGenerators.topArticles, 1800),
  
  // Specific caching for individual articles
  articleById: createCacheMiddleware(mediumCache, cacheKeyGenerators.articleById, 1800),
  
  // Specific caching for articles by slug
  articleBySlug: createCacheMiddleware(mediumCache, cacheKeyGenerators.articleBySlug, 1800)
};

// Cache invalidation helpers
const invalidateCache = {
  articles: () => {
    shortCache.flushAll();
    mediumCache.flushAll();
  },
  
  categories: () => {
    longCache.del('categories:all');
  },
  
  analytics: () => {
    mediumCache.keys().forEach(key => {
      if (key.startsWith('analytics:')) {
        mediumCache.del(key);
      }
    });
  },
  
  articleById: (id) => {
    mediumCache.del(`article:${id}`);
  },
  
  articleBySlug: (slug) => {
    mediumCache.del(`article:slug:${slug}`);
  },
  
  all: () => {
    shortCache.flushAll();
    mediumCache.flushAll();
    longCache.flushAll();
  }
};

// Middleware to handle conditional requests (ETag)
const conditionalRequest = (req, res, next) => {
  const ifNoneMatch = req.headers['if-none-match'];
  
  if (ifNoneMatch) {
    // Store the ETag for comparison after response is generated
    res.locals.clientETag = ifNoneMatch;
  }
  
  // Override res.json to check ETag
  const originalJson = res.json;
  res.json = function(data) {
    const etag = generateETag(data);
    
    if (res.locals.clientETag === etag) {
      return res.status(304).end();
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  conditionalRequest,
  shortCache,
  mediumCache,
  longCache
};