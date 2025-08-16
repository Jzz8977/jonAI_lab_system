const jwtUtils = require('../../utils/jwt');
const jwt = require('jsonwebtoken');

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

describe('JWT Utils', () => {
  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'admin'
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = jwtUtils.generateToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include user data in token payload', () => {
      const token = jwtUtils.generateToken(mockUser);
      const decoded = jwt.decode(token);
      
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.username).toBe(mockUser.username);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });

    it('should set correct issuer and audience', () => {
      const token = jwtUtils.generateToken(mockUser);
      const decoded = jwt.decode(token);
      
      expect(decoded.iss).toBe('blog-admin-api');
      expect(decoded.aud).toBe('blog-admin-client');
    });

    it('should exclude sensitive data from payload', () => {
      const userWithSensitiveData = {
        ...mockUser,
        password_hash: 'hashedpassword',
        sensitive_field: 'sensitive_value'
      };
      
      const token = jwtUtils.generateToken(userWithSensitiveData);
      const decoded = jwt.decode(token);
      
      expect(decoded.password_hash).toBeUndefined();
      expect(decoded.sensitive_field).toBeUndefined();
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = jwtUtils.generateToken(mockUser);
      const decoded = jwtUtils.verifyToken(token);
      
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.username).toBe(mockUser.username);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        jwtUtils.verifyToken(invalidToken);
      }).toThrow('Invalid token');
    });

    it('should throw error for expired token', () => {
      // Create a token that's already expired (1 second ago)
      const expiredToken = jwt.sign(
        { id: 1, username: 'test', exp: Math.floor(Date.now() / 1000) - 1 },
        process.env.JWT_SECRET,
        { issuer: 'blog-admin-api', audience: 'blog-admin-client' }
      );
      
      expect(() => {
        jwtUtils.verifyToken(expiredToken);
      }).toThrow(/expired|invalid/i);
    });

    it('should throw error for token with wrong issuer', () => {
      const tokenWithWrongIssuer = jwt.sign(
        { id: 1, username: 'test' },
        process.env.JWT_SECRET,
        { issuer: 'wrong-issuer', audience: 'blog-admin-client' }
      );
      
      expect(() => {
        jwtUtils.verifyToken(tokenWithWrongIssuer);
      }).toThrow('Invalid token');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'valid.jwt.token';
      const authHeader = `Bearer ${token}`;
      
      const extractedToken = jwtUtils.extractTokenFromHeader(authHeader);
      expect(extractedToken).toBe(token);
    });

    it('should return null for missing header', () => {
      const extractedToken = jwtUtils.extractTokenFromHeader(null);
      expect(extractedToken).toBeNull();
    });

    it('should return null for invalid header format', () => {
      const invalidHeaders = [
        'InvalidFormat token',
        'Bearer',
        'Bearer token extra',
        'token'
      ];
      
      invalidHeaders.forEach(header => {
        const extractedToken = jwtUtils.extractTokenFromHeader(header);
        expect(extractedToken).toBeNull();
      });
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token', () => {
      const refreshToken = jwtUtils.generateRefreshToken(mockUser);
      
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.')).toHaveLength(3);
    });

    it('should include type field in refresh token', () => {
      const refreshToken = jwtUtils.generateRefreshToken(mockUser);
      const decoded = jwt.decode(refreshToken);
      
      expect(decoded.type).toBe('refresh');
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.username).toBe(mockUser.username);
    });

    it('should have longer expiration than access token', () => {
      const accessToken = jwtUtils.generateToken(mockUser);
      const refreshToken = jwtUtils.generateRefreshToken(mockUser);
      
      const accessDecoded = jwt.decode(accessToken);
      const refreshDecoded = jwt.decode(refreshToken);
      
      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const refreshToken = jwtUtils.generateRefreshToken(mockUser);
      const decoded = jwtUtils.verifyRefreshToken(refreshToken);
      
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.type).toBe('refresh');
    });

    it('should throw error for access token used as refresh token', () => {
      const accessToken = jwtUtils.generateToken(mockUser);
      
      expect(() => {
        jwtUtils.verifyRefreshToken(accessToken);
      }).toThrow('Invalid refresh token type');
    });

    it('should throw error for invalid refresh token', () => {
      const invalidToken = 'invalid.refresh.token';
      
      expect(() => {
        jwtUtils.verifyRefreshToken(invalidToken);
      }).toThrow('Invalid refresh token');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = jwtUtils.generateToken(mockUser);
      const decoded = jwtUtils.decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.header).toBeDefined();
      expect(decoded.payload).toBeDefined();
      expect(decoded.signature).toBeDefined();
    });

    it('should decode even expired tokens', () => {
      const expiredToken = jwt.sign(
        { id: 1, username: 'test' },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );
      
      const decoded = jwtUtils.decodeToken(expiredToken);
      expect(decoded.payload.id).toBe(1);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return correct expiration date', () => {
      const token = jwtUtils.generateToken(mockUser);
      const expiration = jwtUtils.getTokenExpiration(token);
      
      expect(expiration).toBeInstanceOf(Date);
      expect(expiration.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const token = jwtUtils.generateToken(mockUser);
      const isExpired = jwtUtils.isTokenExpired(token);
      
      expect(isExpired).toBe(false);
    });

    it('should return true for expired token', () => {
      // Create a token that's already expired (1 second ago)
      const expiredToken = jwt.sign(
        { id: 1, username: 'test', exp: Math.floor(Date.now() / 1000) - 1 },
        process.env.JWT_SECRET
      );
      
      const isExpired = jwtUtils.isTokenExpired(expiredToken);
      expect(isExpired).toBe(true);
    });

    it('should return true for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const isExpired = jwtUtils.isTokenExpired(invalidToken);
      
      expect(isExpired).toBe(true);
    });
  });
});