# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack blog admin system with Vue3/TypeScript frontend and Node.js/Express backend. The system provides a complete content management interface for blog administration.

## Development Commands

### Backend (Node.js/Express)
```bash
cd backend
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run db:init      # Initialize SQLite database
npm run db:migrate   # Run database migrations
```

### Frontend (Vue3/TypeScript)
```bash
cd frontend
npm run dev                    # Start Vite development server
npm run build                  # Build for production (includes type checking)
npm run preview                # Preview production build
npm test                       # Run Vitest unit tests
npm run test:watch             # Run tests in watch mode
npm run test:integration       # Run integration tests
npm run test:all               # Run both unit and integration tests
npx vue-tsc --noEmit          # Type checking only
```

## Architecture

### Backend Structure
- **Express.js API** with comprehensive security middleware (helmet, rate limiting, CORS)
- **SQLite database** with better-sqlite3 for data persistence
- **JWT authentication** with token-based auth system
- **Modular route structure**: `/api/auth`, `/api/articles`, `/api/categories`, `/api/analytics`, `/api/upload`
- **Comprehensive middleware**: authentication, caching, rate limiting, sanitization, file upload
- **Database models**: User, Article, Category with proper relationships
- **Migration system** for database schema management

### Frontend Structure
- **Vue 3 Composition API** with TypeScript
- **Pinia state management** for auth and application state
- **Vue Router** with authentication guards
- **Element Plus UI library** for components
- **Axios-based API service layer** with interceptors and error handling
- **Modular service architecture**: auth, articles, categories, analytics, notifications
- **Comprehensive error handling** with toast notifications
- **Rich text editing** with Quill.js integration

### Key Integration Patterns
- **Service-based API layer**: Each domain (articles, categories, analytics) has dedicated service files
- **Composables for API calls**: `useApi.ts` provides reusable patterns for loading states and error handling
- **Centralized error handling**: `errorHandler.ts` and `notifications.ts` provide consistent user feedback
- **Authentication flow**: JWT tokens with automatic refresh and session management
- **Type safety**: Full TypeScript coverage with shared type definitions

### Database Schema
- **Users**: Authentication and user management
- **Categories**: Hierarchical category system for content organization
- **Articles**: Rich content with metadata, views, likes, and publication status
- **Analytics tables**: Article views and engagement tracking

### Security Features
- **Helmet.js** with CSP configuration
- **Rate limiting** per endpoint type (auth, content, analytics, upload)
- **Input sanitization** (XSS protection, NoSQL injection prevention)
- **File upload security** with type validation and size limits
- **CORS configuration** with environment-based allowed origins

## Testing

### Backend Testing
- **Jest framework** with supertest for API testing
- **Test database** setup with isolated test environment
- **Coverage reporting** with text, lcov, and html formats
- **Performance and security tests** included

### Frontend Testing
- **Vitest** for unit testing with jsdom environment
- **Vue Test Utils** for component testing
- **Integration tests** covering full user workflows
- **Separate configs**: `vitest.integration.config.ts` for integration tests

## Environment Setup

### Backend Environment Variables
Create `.env` file in backend directory:
```
PORT=3000
JWT_SECRET=your-secret-key
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend Configuration
The frontend uses Vite with environment-based API configuration in `src/config/index.ts`.

## File Upload System
- **Multer middleware** for handling multipart/form-data
- **Thumbnail uploads** via `/api/upload/thumbnail`
- **Static file serving** from `/api/uploads/` endpoint
- **File type and size validation**

## Analytics System
The system includes comprehensive analytics tracking:
- **Article view tracking** with unique visitor detection
- **Like/unlike functionality** for articles
- **Dashboard metrics** with engagement summaries
- **Top articles ranking** based on views and likes
- **Real-time analytics** updates via API integration