-- Add additional performance indexes for articles table
-- This migration demonstrates adding new indexes to improve query performance

-- Index for filtering articles by status and publication date
CREATE INDEX IF NOT EXISTS idx_articles_status_published_at ON articles(status, published_at DESC);

-- Index for searching articles by title
CREATE INDEX IF NOT EXISTS idx_articles_title ON articles(title);

-- Composite index for category and status filtering
CREATE INDEX IF NOT EXISTS idx_articles_category_status ON articles(category_id, status);

-- Index for analytics queries (view count and like count combined)
CREATE INDEX IF NOT EXISTS idx_articles_engagement ON articles(view_count DESC, like_count DESC);