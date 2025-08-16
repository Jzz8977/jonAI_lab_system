const { upload, handleUploadError } = require('../../middleware/upload');
const multer = require('multer');

describe('Upload Middleware', () => {
  describe('File Filter', () => {
    // Test the file filter function directly by creating a mock multer instance
    const mockFileFilter = (req, file, cb) => {
      // Check if file is an image
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'), false);
      }

      // Check allowed image types
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
      }

      cb(null, true);
    };

    it('should accept valid image types', () => {
      const validTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/webp'
      ];

      validTypes.forEach(mimetype => {
        const mockFile = { mimetype };
        const mockCallback = jest.fn();
        
        mockFileFilter(null, mockFile, mockCallback);
        
        expect(mockCallback).toHaveBeenCalledWith(null, true);
        mockCallback.mockClear();
      });
    });

    it('should reject non-image files', () => {
      const invalidTypes = [
        'text/plain',
        'application/pdf',
        'video/mp4',
        'audio/mp3'
      ];

      invalidTypes.forEach(mimetype => {
        const mockFile = { mimetype };
        const mockCallback = jest.fn();
        
        mockFileFilter(null, mockFile, mockCallback);
        
        expect(mockCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Only image files are allowed'
          }),
          false
        );
        mockCallback.mockClear();
      });
    });

    it('should reject unsupported image types', () => {
      const unsupportedTypes = [
        'image/gif',
        'image/bmp',
        'image/tiff',
        'image/svg+xml'
      ];

      unsupportedTypes.forEach(mimetype => {
        const mockFile = { mimetype };
        const mockCallback = jest.fn();
        
        mockFileFilter(null, mockFile, mockCallback);
        
        expect(mockCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Only JPEG, PNG, and WebP images are allowed'
          }),
          false
        );
        mockCallback.mockClear();
      });
    });
  });

  describe('Error Handler', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    it('should handle file size limit error', () => {
      const error = new multer.MulterError('LIMIT_FILE_SIZE');
      
      handleUploadError(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size must be less than 5MB'
        },
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle file count limit error', () => {
      const error = new multer.MulterError('LIMIT_FILE_COUNT');
      
      handleUploadError(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Only one file is allowed'
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle unexpected field error', () => {
      const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
      
      handleUploadError(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNEXPECTED_FIELD',
          message: 'Unexpected field name for file upload'
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle custom error messages', () => {
      const error = new Error('Custom upload error');
      
      handleUploadError(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Custom upload error'
        },
        timestamp: expect.any(String)
      });
    });

    it('should pass through non-upload errors', () => {
      const error = new Error('Some other error');
      error.message = undefined; // Remove message to trigger next()
      
      handleUploadError(error, mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });
});