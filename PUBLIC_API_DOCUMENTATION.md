# Public API Documentation

This document describes the public API endpoints for the JonAI-Lab Blog Admin System. These endpoints are designed for external systems to consume published content and **do not require authentication**.

## Base URL

```
http://localhost:3000/api/public
```

## Response Format

All endpoints return JSON responses in the following format:

```json
{
  "success": true|false,
  "data": {
    // Response data
  },
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  },
  "timestamp": "2025-08-16T05:46:02.303Z"
}
```

## Articles Endpoints

### List Published Articles

Retrieve a list of published articles with optional filtering and pagination.

**Endpoint:** `GET /api/public/articles`

**Query Parameters:**
- `limit` (integer, optional) - Number of articles to return (default: 50)
- `offset` (integer, optional) - Number of articles to skip (default: 0)
- `orderBy` (string, optional) - Field to order by (default: "created_at")
- `orderDir` (string, optional) - Order direction: "ASC" or "DESC" (default: "DESC")
- `category_id` (integer, optional) - Filter by category ID
- `search` (string, optional) - Search in article title and content

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/public/articles?limit=10&category_id=78&search=machine+learning"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": 1,
        "title": "Introduction to Machine Learning",
        "slug": "introduction-to-machine-learning",
        "content": "<p>Full article content...</p>",
        "excerpt": "Brief summary of the article",
        "thumbnail_url": "http://localhost:3000/api/uploads/image.jpg",
        "category_name": "AI News",
        "category_slug": "ai-news",
        "author_username": "admin",
        "status": "published",
        "view_count": 150,
        "like_count": 25,
        "published_at": "2025-08-15T10:00:00.000Z",
        "created_at": "2025-08-15T09:30:00.000Z",
        "updated_at": "2025-08-15T10:00:00.000Z"
      }
    ],
    "total": 1,
    "limit": 10,
    "offset": 0
  },
  "timestamp": "2025-08-16T05:46:02.303Z"
}
```

### Get Article by ID

Retrieve a specific published article by its ID.

**Endpoint:** `GET /api/public/articles/:id`

**Parameters:**
- `id` (integer, required) - Article ID

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/public/articles/1"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "article": {
      "id": 1,
      "title": "Introduction to Machine Learning",
      "slug": "introduction-to-machine-learning",
      "content": "<p>Full article content...</p>",
      "excerpt": "Brief summary of the article",
      "thumbnail_url": "http://localhost:3000/api/uploads/image.jpg",
      "category_name": "AI News",
      "category_slug": "ai-news",
      "author_username": "admin",
      "status": "published",
      "view_count": 150,
      "like_count": 25,
      "published_at": "2025-08-15T10:00:00.000Z",
      "created_at": "2025-08-15T09:30:00.000Z",
      "updated_at": "2025-08-15T10:00:00.000Z"
    }
  },
  "timestamp": "2025-08-16T05:46:02.303Z"
}
```

### Get Article by Slug

Retrieve a specific published article by its slug (URL-friendly identifier).

**Endpoint:** `GET /api/public/articles/slug/:slug`

**Parameters:**
- `slug` (string, required) - Article slug

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/public/articles/slug/introduction-to-machine-learning"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "article": {
      // Same structure as Get Article by ID
    }
  },
  "timestamp": "2025-08-16T05:46:02.303Z"
}
```

## Categories Endpoints

### List All Categories

Retrieve a list of all categories with optional pagination.

**Endpoint:** `GET /api/public/categories`

**Query Parameters:**
- `limit` (integer, optional) - Number of categories to return
- `offset` (integer, optional) - Number of categories to skip
- `orderBy` (string, optional) - Field to order by (default: "created_at")
- `orderDir` (string, optional) - Order direction: "ASC" or "DESC" (default: "DESC")

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/public/categories?limit=10"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": 78,
        "name": "AI News",
        "description": "Latest news and developments in AI",
        "slug": "ai-news",
        "created_at": "2025-08-13 16:22:42",
        "updated_at": "2025-08-13 16:22:42"
      },
      {
        "id": 80,
        "name": "Machine Learning",
        "description": "Articles about ML algorithms and techniques",
        "slug": "machine-learning",
        "created_at": "2025-08-13 16:36:12",
        "updated_at": "2025-08-13 16:36:12"
      }
    ],
    "total": 2,
    "limit": 10,
    "offset": 0
  },
  "timestamp": "2025-08-16T05:46:02.303Z"
}
```

### Get Category by ID

Retrieve a specific category by its ID.

**Endpoint:** `GET /api/public/categories/:id`

**Parameters:**
- `id` (integer, required) - Category ID

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/public/categories/78"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "category": {
      "id": 78,
      "name": "AI News",
      "description": "Latest news and developments in AI",
      "slug": "ai-news",
      "created_at": "2025-08-13 16:22:42",
      "updated_at": "2025-08-13 16:22:42"
    }
  },
  "timestamp": "2025-08-16T05:46:02.303Z"
}
```

### Get Category by Slug

Retrieve a specific category by its slug.

**Endpoint:** `GET /api/public/categories/slug/:slug`

**Parameters:**
- `slug` (string, required) - Category slug

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/public/categories/slug/ai-news"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "category": {
      // Same structure as Get Category by ID
    }
  },
  "timestamp": "2025-08-16T05:46:02.303Z"
}
```

## Error Responses

When an error occurs, the API returns an error response with appropriate HTTP status codes:

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_ARTICLE_ID` | Invalid or non-numeric article ID |
| 400 | `INVALID_CATEGORY_ID` | Invalid or non-numeric category ID |
| 400 | `INVALID_SLUG` | Invalid or empty slug parameter |
| 404 | `ARTICLE_NOT_FOUND` | Article not found or not published |
| 404 | `CATEGORY_NOT_FOUND` | Category not found |
| 500 | `ARTICLES_FETCH_ERROR` | Internal server error fetching articles |
| 500 | `CATEGORY_FETCH_ERROR` | Internal server error fetching categories |

### Example Error Response

```json
{
  "success": false,
  "error": {
    "code": "ARTICLE_NOT_FOUND",
    "message": "Article not found"
  },
  "timestamp": "2025-08-16T05:46:02.303Z"
}
```

## Security Considerations

1. **Published Content Only**: Article endpoints only return articles with `status = 'published'`
2. **No Authentication Required**: These endpoints are public and do not require API keys or tokens
3. **Rate Limiting**: Standard rate limiting applies to prevent abuse
4. **CORS**: Configure CORS settings as needed for your external systems

## Integration Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

// Get all published articles
async function getArticles() {
  try {
    const response = await axios.get('http://localhost:3000/api/public/articles');
    return response.data.data.articles;
  } catch (error) {
    console.error('Error fetching articles:', error.response.data);
  }
}

// Get articles by category
async function getArticlesByCategory(categoryId) {
  try {
    const response = await axios.get(`http://localhost:3000/api/public/articles?category_id=${categoryId}`);
    return response.data.data.articles;
  } catch (error) {
    console.error('Error fetching articles:', error.response.data);
  }
}
```

### Python

```python
import requests

def get_articles():
    """Get all published articles"""
    try:
        response = requests.get('http://localhost:3000/api/public/articles')
        response.raise_for_status()
        return response.json()['data']['articles']
    except requests.RequestException as e:
        print(f"Error fetching articles: {e}")
        return []

def get_article_by_slug(slug):
    """Get a specific article by slug"""
    try:
        response = requests.get(f'http://localhost:3000/api/public/articles/slug/{slug}')
        response.raise_for_status()
        return response.json()['data']['article']
    except requests.RequestException as e:
        print(f"Error fetching article: {e}")
        return None
```

### cURL Examples

```bash
# Get all categories
curl -X GET "http://localhost:3000/api/public/categories"

# Get articles with pagination
curl -X GET "http://localhost:3000/api/public/articles?limit=5&offset=10"

# Search articles
curl -X GET "http://localhost:3000/api/public/articles?search=machine+learning"

# Get articles by category and search
curl -X GET "http://localhost:3000/api/public/articles?category_id=78&search=AI&limit=20"

# Get specific article by ID
curl -X GET "http://localhost:3000/api/public/articles/1"

# Get specific category by slug
curl -X GET "http://localhost:3000/api/public/categories/slug/ai-news"
```

## Contact

For questions or support regarding the public API, please contact the development team.

---

**Last Updated:** August 16, 2025  
**API Version:** 1.0  
**Base URL:** `http://localhost:3000/api/public`