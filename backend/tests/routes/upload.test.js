const request = require('supertest');
const fs = require('fs');
const path = require('path');
const express = require('express');
const uploadRoutes = require('../../routes/upload');
const jwtUtils = require('../../utils/jwt');

// Mock the User model and database
const User = require('../../models/User');
jest.mock('../../models/User');
jest.mock('../../config/database');

// Mock User.findById to return a test user
User.findById = jest.fn().mockReturnValue({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin',
  toJSON: () => ({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'admin'
  })
});

describe('Upload Routes', () => {
  let app;
  let authToken;
  const uploadsDir = path.join(__dirname, '../../uploads');
  
  beforeAll(() => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/uploads', uploadRoutes);
    
    // Generate auth token for testing
    authToken = jwtUtils.generateToken({ 
      id: 1, 
      username: 'testuser',
      email: 'test@example.com',
      role: 'admin'
    });
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up uploaded test files
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => {
        if (file.startsWith('thumbnail-')) {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      });
    }
  });

  describe('POST /api/uploads/thumbnail', () => {
    it('should upload a valid image file', async () => {
      // Create a simple test image buffer (1x1 PNG)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
        0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);

      const response = await request(app)
        .post('/api/uploads/thumbnail')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', testImageBuffer, 'test.png')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('filename');
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data.originalName).toBe('test.png');
      expect(response.body.data.mimetype).toBe('image/png');
      expect(response.body.message).toBe('Thumbnail uploaded successfully');

      // Verify file was actually created
      const filename = response.body.data.filename;
      const filePath = path.join(uploadsDir, filename);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should require authentication', async () => {
      const testImageBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // Minimal PNG header

      const response = await request(app)
        .post('/api/uploads/thumbnail')
        .attach('thumbnail', testImageBuffer, 'test.png')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject non-image files', async () => {
      const textBuffer = Buffer.from('This is not an image');

      const response = await request(app)
        .post('/api/uploads/thumbnail')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', textBuffer, 'test.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UPLOAD_ERROR');
      expect(response.body.error.message).toBe('Only image files are allowed');
    });

    it('should reject files that are too large', async () => {
      // Create a buffer larger than 5MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 0x89); // 6MB

      const response = await request(app)
        .post('/api/uploads/thumbnail')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', largeBuffer, 'large.png')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
      expect(response.body.error.message).toBe('File size must be less than 5MB');
    });

    it('should reject unsupported image types', async () => {
      // Create a simple GIF header (unsupported format)
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

      const response = await request(app)
        .post('/api/uploads/thumbnail')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', gifBuffer, 'test.gif')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UPLOAD_ERROR');
      expect(response.body.error.message).toBe('Only JPEG, PNG, and WebP images are allowed');
    });

    it('should return error when no file is uploaded', async () => {
      const response = await request(app)
        .post('/api/uploads/thumbnail')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE_UPLOADED');
      expect(response.body.error.message).toBe('No file was uploaded');
    });
  });

  describe('GET /api/uploads/:filename', () => {
    let testFilename;

    beforeEach(async () => {
      // Upload a test file first
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
        0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);

      const uploadResponse = await request(app)
        .post('/api/uploads/thumbnail')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', testImageBuffer, 'test.png');

      testFilename = uploadResponse.body.data.filename;
    });

    it('should serve uploaded image files', async () => {
      const response = await request(app)
        .get(`/api/uploads/${testFilename}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('image/png');
      expect(response.headers['cache-control']).toBe('public, max-age=31536000');
    });

    it('should return 404 for non-existent files', async () => {
      const response = await request(app)
        .get('/api/uploads/nonexistent.png')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_NOT_FOUND');
    });

    it('should reject directory traversal attempts', async () => {
      const response = await request(app)
        .get('/api/uploads/..%2Fserver.js')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILENAME');
    });
  });

  describe('DELETE /api/uploads/:filename', () => {
    let testFilename;

    beforeEach(async () => {
      // Upload a test file first
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
        0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);

      const uploadResponse = await request(app)
        .post('/api/uploads/thumbnail')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('thumbnail', testImageBuffer, 'test.png');

      testFilename = uploadResponse.body.data.filename;
    });

    it('should delete uploaded files', async () => {
      // Verify file exists
      const filePath = path.join(uploadsDir, testFilename);
      expect(fs.existsSync(filePath)).toBe(true);

      const response = await request(app)
        .delete(`/api/uploads/${testFilename}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('File deleted successfully');

      // Verify file was deleted
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should require authentication for file deletion', async () => {
      const response = await request(app)
        .delete(`/api/uploads/${testFilename}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 404 when trying to delete non-existent file', async () => {
      const response = await request(app)
        .delete('/api/uploads/nonexistent.png')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_NOT_FOUND');
    });

    it('should reject directory traversal attempts in deletion', async () => {
      const response = await request(app)
        .delete('/api/uploads/..%2Fserver.js')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILENAME');
    });
  });
});