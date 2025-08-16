-- Create indexes for article_views table for better performance
CREATE INDEX idx_article_views_article_id ON article_views(article_id);
CREATE INDEX idx_article_views_ip_address ON article_views(ip_address);
CREATE INDEX idx_article_views_created_at ON article_views(created_at DESC);
CREATE INDEX idx_article_views_date ON article_views(DATE(created_at));