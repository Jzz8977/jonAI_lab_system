const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const validator = require('validator');

// MongoDB injection protection
const mongoSanitization = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Potential NoSQL injection attempt detected: ${key} in ${req.method} ${req.path}`);
  }
});

// XSS protection middleware
const xssProtection = (req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Recursively sanitize object properties
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key itself
      const cleanKey = sanitizeString(key);
      sanitized[cleanKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  return obj;
};

// Sanitize individual strings
const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return str;
  }

  // Remove potential XSS attacks
  let cleaned = xss(str, {
    whiteList: {
      // Allow basic HTML tags for rich text content
      p: [],
      br: [],
      strong: [],
      b: [],
      em: [],
      i: [],
      u: [],
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      ul: [],
      ol: [],
      li: [],
      blockquote: [],
      code: [],
      pre: [],
      a: ['href', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height']
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });

  // Additional sanitization for specific patterns
  cleaned = cleaned.replace(/javascript:/gi, '');
  cleaned = cleaned.replace(/vbscript:/gi, '');
  cleaned = cleaned.replace(/onload/gi, '');
  cleaned = cleaned.replace(/onerror/gi, '');
  cleaned = cleaned.replace(/onclick/gi, '');
  cleaned = cleaned.replace(/onmouseover/gi, '');

  return cleaned;
};

// Content-specific sanitization for articles
const sanitizeArticleContent = (content) => {
  if (typeof content !== 'string') {
    return content;
  }

  // More permissive XSS filtering for rich text content
  return xss(content, {
    whiteList: {
      p: ['class', 'style'],
      br: [],
      strong: [],
      b: [],
      em: [],
      i: [],
      u: [],
      h1: ['class'],
      h2: ['class'],
      h3: ['class'],
      h4: ['class'],
      h5: ['class'],
      h6: ['class'],
      ul: ['class'],
      ol: ['class'],
      li: ['class'],
      blockquote: ['class'],
      code: ['class'],
      pre: ['class'],
      a: ['href', 'title', 'target'],
      img: ['src', 'alt', 'title', 'width', 'height', 'class'],
      div: ['class'],
      span: ['class', 'style']
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed']
  });
};

// Input validation helpers
const validateInput = {
  email: (email) => {
    return validator.isEmail(email);
  },
  
  url: (url) => {
    return validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true
    });
  },
  
  alphanumeric: (str) => {
    return validator.isAlphanumeric(str);
  },
  
  length: (str, min, max) => {
    return validator.isLength(str, { min, max });
  },
  
  slug: (str) => {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(str);
  },
  
  username: (str) => {
    return /^[a-zA-Z0-9_]{3,50}$/.test(str);
  },
  
  strongPassword: (password) => {
    return validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0
    });
  }
};

module.exports = {
  mongoSanitization,
  xssProtection,
  sanitizeString,
  sanitizeObject,
  sanitizeArticleContent,
  validateInput
};