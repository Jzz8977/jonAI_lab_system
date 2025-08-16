const jwt = require('jsonwebtoken');

class JWTUtils {
  constructor() {
    this.expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  }

  get secret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
  }

  // Generate JWT token
  generateToken(payload) {
    try {
      // Remove sensitive data from payload
      const tokenPayload = {
        id: payload.id,
        username: payload.username,
        email: payload.email,
        role: payload.role
      };

      return jwt.sign(tokenPayload, this.secret, {
        expiresIn: this.expiresIn,
        issuer: 'blog-admin-api',
        audience: 'blog-admin-client'
      });
    } catch (error) {
      throw new Error('Failed to generate token: ' + error.message);
    }
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret, {
        issuer: 'blog-admin-api',
        audience: 'blog-admin-client'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else if (error.name === 'NotBeforeError') {
        throw new Error('Token not active yet');
      } else {
        throw new Error('Token verification failed: ' + error.message);
      }
    }
  }

  // Decode token without verification (for debugging)
  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      throw new Error('Failed to decode token: ' + error.message);
    }
  }

  // Extract token from Authorization header
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  // Generate refresh token (longer expiration)
  generateRefreshToken(payload) {
    try {
      const tokenPayload = {
        id: payload.id,
        username: payload.username,
        type: 'refresh'
      };

      return jwt.sign(tokenPayload, this.secret, {
        expiresIn: '7d', // 7 days for refresh token
        issuer: 'blog-admin-api',
        audience: 'blog-admin-client'
      });
    } catch (error) {
      throw new Error('Failed to generate refresh token: ' + error.message);
    }
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: 'blog-admin-api',
        audience: 'blog-admin-client'
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      } else {
        throw new Error('Refresh token verification failed: ' + error.message);
      }
    }
  }

  // Get token expiration time
  getTokenExpiration(token) {
    try {
      const decoded = this.decodeToken(token);
      return new Date(decoded.payload.exp * 1000);
    } catch (error) {
      throw new Error('Failed to get token expiration: ' + error.message);
    }
  }

  // Check if token is expired
  isTokenExpired(token) {
    try {
      const expiration = this.getTokenExpiration(token);
      return new Date() >= expiration;
    } catch (error) {
      return true; // Consider invalid tokens as expired
    }
  }
}

// Create singleton instance
const jwtUtils = new JWTUtils();

module.exports = jwtUtils;