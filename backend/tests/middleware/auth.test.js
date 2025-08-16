const request = require('supertest');
const express = require('express');
const { authenticate, authorize, optionalAuth, loginRateLimit } = require('../../middleware/auth');
const jwtUtils = require('../../utils/jwt');
const User = require('../../models/User');

// Mock dependencies
jest.mock('../../utils/jwt');
jest.mock('../../models/User');

// Set up test environment
process.env.JWT_SECRET = 'test-secret-key';

describe('Auth Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    beforeEach(() => {
      app.get('/protected', authenticate, (req, res) => {
        res.json({ success: true, user: req.user });
      });
    });

    it('should authenticate valid token', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
      };

      const mockToken = 'valid.jwt.token';
      const mockDecoded = { id: 1, username: 'testuser' };

      jwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      jwtUtils.verifyToken.mockReturnValue(mockDecoded);
      User.findById.mockReturnValue({ toJSON: () => mockUser });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toEqual(mockUser);
    });

    it('should reject request without token', async () => {
      jwtUtils.extractTokenFromHeader.mockReturnValue(null);

      const response = await request(app)
        .get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject invalid token', async () => {
      const mockToken = 'invalid.jwt.token';

      jwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      jwtUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired token', async () => {
      const mockToken = 'expired.jwt.token';

      jwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      jwtUtils.verifyToken.mockImplementation(() => {
        throw new Error('Token has expired');
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject token for non-existent user', async () => {
      const mockToken = 'valid.jwt.token';
      const mockDecoded = { id: 999, username: 'nonexistent' };

      jwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      jwtUtils.verifyToken.mockReturnValue(mockDecoded);
      User.findById.mockReturnValue(null);

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('authorize middleware', () => {
    beforeEach(() => {
      // Mock authenticate middleware to set req.user
      app.use((req, res, next) => {
        req.user = {
          id: 1,
          username: 'testuser',
          role: 'admin'
        };
        next();
      });
    });

    it('should allow access with correct role', async () => {
      app.get('/admin-only', authorize(['admin']), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/admin-only');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny access with incorrect role', async () => {
      app.use((req, res, next) => {
        req.user = {
          id: 1,
          username: 'testuser',
          role: 'user'
        };
        next();
      });

      app.get('/admin-only', authorize(['admin']), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/admin-only');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow access when no roles specified', async () => {
      app.get('/authenticated-only', authorize(), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/authenticated-only');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny access when user not authenticated', async () => {
      app.use((req, res, next) => {
        req.user = null;
        next();
      });

      app.get('/authenticated-only', authorize(), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/authenticated-only');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('optionalAuth middleware', () => {
    beforeEach(() => {
      app.get('/optional-auth', optionalAuth, (req, res) => {
        res.json({ 
          success: true, 
          authenticated: !!req.user,
          user: req.user || null
        });
      });
    });

    it('should set user when valid token provided', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        role: 'admin'
      };

      const mockToken = 'valid.jwt.token';
      const mockDecoded = { id: 1, username: 'testuser' };

      jwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      jwtUtils.verifyToken.mockReturnValue(mockDecoded);
      User.findById.mockReturnValue({ toJSON: () => mockUser });

      const response = await request(app)
        .get('/optional-auth')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.user).toEqual(mockUser);
    });

    it('should continue without user when no token provided', async () => {
      jwtUtils.extractTokenFromHeader.mockReturnValue(null);

      const response = await request(app).get('/optional-auth');

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(false);
      expect(response.body.user).toBeNull();
    });

    it('should continue without user when invalid token provided', async () => {
      const mockToken = 'invalid.jwt.token';

      jwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      jwtUtils.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/optional-auth')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(false);
      expect(response.body.user).toBeNull();
    });
  });

  describe('loginRateLimit middleware', () => {
    beforeEach(() => {
      app.post('/login', loginRateLimit, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow requests within rate limit', async () => {
      const response = await request(app).post('/login');
      expect(response.status).toBe(200);
    });

    // Note: Testing actual rate limiting behavior would require multiple requests
    // and is better suited for integration tests
  });
});