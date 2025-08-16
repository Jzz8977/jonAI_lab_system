const jwtUtils = require('../utils/jwt');
const User = require('../models/User');

// Authentication middleware - verifies JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Verify the token
    const decoded = jwtUtils.verifyToken(token);
    
    // Get user from database to ensure they still exist
    const user = User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with token no longer exists'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Add user info to request object
    req.user = user.toJSON ? user.toJSON() : user;
    req.token = token;
    
    next();
  } catch (error) {
    let errorCode = 'INVALID_TOKEN';
    let statusCode = 401;

    if (error.message.includes('expired')) {
      errorCode = 'TOKEN_EXPIRED';
    } else if (error.message.includes('Invalid token')) {
      errorCode = 'INVALID_TOKEN';
    }

    return res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
};

// Authorization middleware - checks user role
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // If no roles specified, just check if user is authenticated
    if (roles.length === 0) {
      return next();
    }

    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions to access this resource'
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Optional authentication middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtUtils.extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = jwtUtils.verifyToken(token);
      const user = User.findById(decoded.id);
      
      if (user) {
        req.user = user.toJSON();
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    next();
  }
};

// Middleware to check if user owns resource or is admin
const requireOwnershipOrAdmin = (getUserIdFromResource) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Get user ID from resource (could be from params, body, etc.)
    const resourceUserId = getUserIdFromResource(req);
    
    if (req.user.id !== resourceUserId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own resources'
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Rate limiting for authentication endpoints
const rateLimit = require('express-rate-limit');

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later'
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests
  skipSuccessfulRequests: true
});

// Strict rate limiting for login attempts
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: {
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts, please try again in 15 minutes'
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Don't skip any requests for login
  skipSuccessfulRequests: false
});

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  requireOwnershipOrAdmin,
  authRateLimit,
  loginRateLimit
};