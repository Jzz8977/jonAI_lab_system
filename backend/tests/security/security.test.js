const request = require('supertest');
const app = require('../../server');

describe('Security Tests', () => {
  describe('Rate Limiting', () => {
    test('should enforce rate limits on API endpoints', async () => {
      const promises = [];
      
      // Make 101 requests to exceed the general API limit (100 per 15 minutes)
      for (let i = 0; i < 101; i++) {
        promises.push(request(app).get('/api/status'));
      }
      
      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 30000);

    test('should enforce stricter rate limits on auth endpoints', async () => {
      const promises = [];
      
      // Make 6 requests to exceed the auth limit (5 per 15 minutes)
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({ username: 'test', password: 'test' })
        );
      }
      
      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Input Sanitization', () => {
    test('should sanitize XSS attempts in request body', async () => {
      const maliciousPayload = {
        title: '<script>alert("xss")</script>Test Title',
        content: '<img src="x" onerror="alert(\'xss\')" />Content'
      };

      const response = await request(app)
        .post('/api/articles')
        .send(maliciousPayload);

      // Should not contain script tags or event handlers
      if (response.body.data) {
        expect(response.body.data.title).not.toContain('<script>');
        expect(response.body.data.content).not.toContain('onerror');
      }
    });

    test('should sanitize NoSQL injection attempts', async () => {
      const maliciousQuery = {
        username: { $ne: null },
        password: { $regex: '.*' }
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousQuery);

      // Should receive validation error, not process the malicious query
      expect(response.status).toBe(400);
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    test('should include CSP headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('CORS Configuration', () => {
    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/status')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    test('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/status')
        .set('Origin', 'http://malicious-site.com');

      // Should either reject or not include CORS headers
      expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
    });
  });

  describe('Authentication Security', () => {
    test('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'wrong' });

      expect(response.status).toBe(401);
      expect(response.body.error.message).not.toContain('user not found');
      expect(response.body.error.message).toBe('Invalid username or password');
    });

    test('should require strong passwords', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer invalid-token')
        .send({ 
          current_password: 'old', 
          new_password: 'weak' 
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toBeDefined();
    });
  });

  describe('File Upload Security', () => {
    test('should validate file types', async () => {
      const response = await request(app)
        .post('/api/upload/thumbnail')
        .attach('thumbnail', Buffer.from('fake-exe-content'), 'malicious.exe');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Invalid file type');
    });

    test('should enforce file size limits', async () => {
      // Create a buffer larger than 5MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
      
      const response = await request(app)
        .post('/api/upload/thumbnail')
        .attach('thumbnail', largeBuffer, 'large-image.jpg');

      expect(response.status).toBe(400);
    });
  });

  describe('SQL Injection Protection', () => {
    test('should prevent SQL injection in article queries', async () => {
      const maliciousId = "1; DROP TABLE articles; --";
      
      const response = await request(app)
        .get(`/api/articles/${maliciousId}`);

      // Should return 404 or 400, not execute the malicious SQL
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Information Disclosure', () => {
    test('should not expose stack traces in production', async () => {
      // Force an error by accessing non-existent endpoint
      const response = await request(app)
        .get('/api/nonexistent/endpoint');

      expect(response.status).toBe(404);
      expect(response.body.error.message).not.toContain('Error:');
      expect(response.body.error.message).not.toContain('at ');
    });

    test('should not expose sensitive server information', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });
});