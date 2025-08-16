-- Create article_likes table for tracking unique likes
CREATE TABLE article_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE(article_id, ip_address)
);

-- Create indexes for better performance
CREATE INDEX idx_article_likes_article_id ON article_likes(article_id);
CREATE INDEX idx_article_likes_ip_address ON article_likes(ip_address);
CREATE INDEX idx_article_likes_created_at ON article_likes(created_at DESC);