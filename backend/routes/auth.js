const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const jwtUtils = require('../utils/jwt');
const { authenticate, loginRateLimit, authRateLimit } = require('../middleware/auth');

const router = express.Router();

// Validation middleware for login
const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
];

// Validation middleware for user registration (if needed)
const registerValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Helper function to handle validation errors
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

// POST /api/auth/login - User login
router.post('/login', loginRateLimit, loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = User.findByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Verify password
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Generate tokens
    const accessToken = jwtUtils.generateToken(user);
    const refreshToken = jwtUtils.generateRefreshToken(user);

    // Return success response with tokens
    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: process.env.JWT_EXPIRES_IN || '1h'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: 'An error occurred during login'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', authRateLimit, async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Verify refresh token
    const decoded = jwtUtils.verifyRefreshToken(refresh_token);
    
    // Get user from database
    const user = User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with refresh token no longer exists'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Generate new access token
    const accessToken = jwtUtils.generateToken(user);

    res.json({
      success: true,
      data: {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: process.env.JWT_EXPIRES_IN || '1h'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    let errorCode = 'TOKEN_REFRESH_ERROR';
    let statusCode = 500;

    if (error.message.includes('expired') || error.message.includes('Invalid')) {
      errorCode = 'INVALID_REFRESH_TOKEN';
      statusCode = 401;
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/auth/logout - User logout (optional - mainly for client-side cleanup)
router.post('/logout', authenticate, (req, res) => {
  // In a stateless JWT system, logout is mainly handled client-side
  // by removing the token. This endpoint is for consistency and 
  // potential future token blacklisting implementation.
  
  res.json({
    success: true,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString()
  });
});

// GET /api/auth/verify - Verify current token and get user info
router.get('/verify', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      token_valid: true
    },
    timestamp: new Date().toISOString()
  });
});

// GET /api/auth/profile - Get current user profile
router.get('/profile', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    },
    timestamp: new Date().toISOString()
  });
});

// PUT /api/auth/profile - Update current user profile
router.put('/profile', authenticate, [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
], handleValidationErrors, async (req, res) => {
  try {
    const { username, email } = req.body;
    const user = User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_UPDATE_DATA',
          message: 'No valid fields to update'
        },
        timestamp: new Date().toISOString()
      });
    }

    const updatedUser = await user.update(updateData);

    res.json({
      success: true,
      data: {
        user: updatedUser.toJSON()
      },
      message: 'Profile updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Profile update error:', error);
    
    let errorCode = 'PROFILE_UPDATE_ERROR';
    let statusCode = 500;

    if (error.message.includes('already exists')) {
      errorCode = 'DUPLICATE_DATA';
      statusCode = 409;
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/auth/change-password - Change user password
router.put('/change-password', authenticate, [
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  body('new_password')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
], handleValidationErrors, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Verify current password
    const isValidPassword = await user.verifyPassword(current_password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Change password
    await user.changePassword(new_password);

    res.json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_ERROR',
        message: 'An error occurred while changing password'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;