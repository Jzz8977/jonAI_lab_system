const express = require('express');
const path = require('path');
const fs = require('fs');
const { upload, handleUploadError } = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Upload thumbnail endpoint
router.post('/thumbnail', authenticate, upload.single('thumbnail'), handleUploadError, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No file was uploaded'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Generate URL for the uploaded file
    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(201).json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl
      },
      message: 'Thumbnail uploaded successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: 'Failed to process uploaded file'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Serve uploaded files
router.get('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILENAME',
          message: 'Invalid filename'
        },
        timestamp: new Date().toISOString()
      });
    }

    const filePath = path.join(__dirname, '../uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Send file
    res.sendFile(filePath);

  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FILE_SERVE_ERROR',
        message: 'Failed to serve file'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Delete uploaded file endpoint (for cleanup)
router.delete('/:filename', authenticate, (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Validate filename
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILENAME',
          message: 'Invalid filename'
        },
        timestamp: new Date().toISOString()
      });
    }

    const filePath = path.join(__dirname, '../uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Delete file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FILE_DELETE_ERROR',
        message: 'Failed to delete file'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;