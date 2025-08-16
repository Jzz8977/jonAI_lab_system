const request = require('supertest');
const express = require('express');
const authRoutes = require('../../routes/auth');
const User = require('../../models/User');
const jwtUtils = require('../../utils/jwt');

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../utils/jwt');

// Set up test environment
process.env.JWT_SECRET = 'test-secret-key';

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    const validLoginData = {
      username: 'testuser',
      password: 'TestPassword123'
    };

    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        verifyPassword: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'admin'
        })
      };

      const mockAccessToken = 'access.jwt.token';
      const mockRefreshToken = 'refresh.jwt.token';

      User.findByUsername.mockReturnValue(mockUser);
      jwtUtils.generateToken.mockReturnValue(mockAccessToken);
      jwtUtils.generateRefreshToken.mockReturnValue(mockRefreshToken);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens.access_token).toBe(mockAccessToken);
      expect(response.body.data.tokens.refresh_token).toBe(mockRefreshToken);
      expect(User.findByUsername).toHaveBeenCalledWith('testuser');
      expect(mockUser.verifyPassword).toHaveBeenCalledWith('TestPassword123');
    });

    it('should reject login with invalid username', async () => {
      User.findByUsername.mockReturnValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with invalid password', async () => {
      const mockUser = {
        verifyPassword: jest.fn().mockResolvedValue(false)
      };

      User.findByUsername.mockReturnValue(mockUser);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        username: '', // empty username
        password: 'short' // too short password
      };

      const response = await request(app)
        .post('/auth/login')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });

    it('should handle server errors gracefully', async () => {
      User.findByUsername.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LOGIN_ERROR');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
      };

      const mockRefreshToken = 'valid.refresh.token';
      const mockNewAccessToken = 'new.access.token';
      const mockDecoded = { id: 1, username: 'testuser', type: 'refresh' };

      jwtUtils.verifyRefreshToken.mockReturnValue(mockDecoded);
      User.findById.mockReturnValue(mockUser);
      jwtUtils.generateToken.mockReturnValue(mockNewAccessToken);

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refresh_token: mockRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBe(mockNewAccessToken);
      expect(jwtUtils.verifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
    });

    it('should reject request without refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_REFRESH_TOKEN');
    });

    it('should reject invalid refresh token', async () => {
      const mockRefreshToken = 'invalid.refresh.token';

      jwtUtils.verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid refresh token');
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refresh_token: mockRefreshToken });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should reject refresh token for non-existent user', async () => {
      const mockRefreshToken = 'valid.refresh.token';
      const mockDecoded = { id: 999, username: 'nonexistent', type: 'refresh' };

      jwtUtils.verifyRefreshToken.mockReturnValue(mockDecoded);
      User.findById.mockReturnValue(null);

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refresh_token: mockRefreshToken });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('GET /auth/verify', () => {
    it('should verify valid token and return user info', async () => {
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
        .get('/auth/verify')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token_valid).toBe(true);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
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
        .post('/auth/logout')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('PUT /auth/change-password', () => {
    it('should change password with valid data', async () => {
      const mockUser = {
        id: 1,
        verifyPassword: jest.fn().mockResolvedValue(true),
        changePassword: jest.fn().mockResolvedValue(true)
      };

      const mockAuthUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
      };

      const mockToken = 'valid.jwt.token';
      const mockDecoded = { id: 1, username: 'testuser' };

      jwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      jwtUtils.verifyToken.mockReturnValue(mockDecoded);
      User.findById.mockReturnValueOnce({ toJSON: () => mockAuthUser }); // For auth middleware
      User.findById.mockReturnValueOnce(mockUser); // For the route handler

      const response = await request(app)
        .put('/auth/change-password')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          current_password: 'OldPassword123',
          new_password: 'NewPassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');
      expect(mockUser.verifyPassword).toHaveBeenCalledWith('OldPassword123');
      expect(mockUser.changePassword).toHaveBeenCalledWith('NewPassword123');
    });

    it('should reject password change with incorrect current password', async () => {
      const mockUser = {
        id: 1,
        verifyPassword: jest.fn().mockResolvedValue(false)
      };

      const mockAuthUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
      };

      const mockToken = 'valid.jwt.token';
      const mockDecoded = { id: 1, username: 'testuser' };

      jwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      jwtUtils.verifyToken.mockReturnValue(mockDecoded);
      User.findById.mockReturnValueOnce({ toJSON: () => mockAuthUser }); // For auth middleware
      User.findById.mockReturnValueOnce(mockUser); // For the route handler

      const response = await request(app)
        .put('/auth/change-password')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          current_password: 'WrongPassword123',
          new_password: 'NewPassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('should validate new password requirements', async () => {
      const mockAuthUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
      };

      const mockToken = 'valid.jwt.token';
      const mockDecoded = { id: 1, username: 'testuser' };

      jwtUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      jwtUtils.verifyToken.mockReturnValue(mockDecoded);
      User.findById.mockReturnValue({ toJSON: () => mockAuthUser });

      const response = await request(app)
        .put('/auth/change-password')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          current_password: 'OldPassword123',
          new_password: 'weak' // weak password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});