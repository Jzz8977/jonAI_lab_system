# Requirements Document

## Introduction

The JonAI-Lab Blog Admin System is a comprehensive backend management system for an AI news blog website. The system provides administrators with tools to manage content, monitor engagement, and analyze performance through a modern Vue3-based interface backed by a Node.js API with SQLite database. The system enables content creators to publish rich articles with multimedia support while providing insights into user engagement and content performance.

## Requirements

### Requirement 1

**User Story:** As a blog administrator, I want to manage article categories and types, so that I can organize content effectively and help readers find relevant AI news.

#### Acceptance Criteria

1. WHEN an administrator accesses the category management interface THEN the system SHALL display all existing article types with options to create, edit, and delete
2. WHEN creating a new article type THEN the system SHALL require a unique name and optional description
3. WHEN deleting an article type THEN the system SHALL prevent deletion if articles are associated with that type
4. IF an article type is edited THEN the system SHALL update all associated articles automatically

### Requirement 2

**User Story:** As a content creator, I want to create and edit articles with rich text formatting and media uploads, so that I can publish engaging AI news content.

#### Acceptance Criteria

1. WHEN creating a new article THEN the system SHALL provide a rich text editor with formatting options (bold, italic, headers, lists, links, code blocks)
2. WHEN uploading a thumbnail image THEN the system SHALL validate file type (jpg, png, webp) and size (max 5MB)
3. WHEN saving an article THEN the system SHALL require title, content, category, and thumbnail
4. WHEN publishing an article THEN the system SHALL set publication timestamp and make it visible on the frontend
5. IF an article is saved as draft THEN the system SHALL store it without making it publicly visible

### Requirement 3

**User Story:** As a blog administrator, I want to track article engagement metrics, so that I can understand which content resonates with readers.

#### Acceptance Criteria

1. WHEN a user views an article on the frontend THEN the system SHALL increment the view count by 1
2. WHEN a user likes an article THEN the system SHALL increment the like count and prevent duplicate likes from the same IP/session
3. WHEN accessing the admin dashboard THEN the system SHALL display total views, likes, and articles count
4. WHEN viewing article analytics THEN the system SHALL show individual article performance metrics (views, likes, publication date)

### Requirement 4

**User Story:** As a blog administrator, I want to see a dashboard with top-performing content and key metrics, so that I can make data-driven decisions about content strategy.

#### Acceptance Criteria

1. WHEN accessing the main dashboard THEN the system SHALL display overview cards showing total articles, total views, total likes, and recent activity
2. WHEN viewing the top articles ranking THEN the system SHALL show the top 10 articles sorted by view count with thumbnails and metrics
3. WHEN viewing recent activity THEN the system SHALL show the 5 most recently published articles
4. WHEN filtering dashboard data THEN the system SHALL allow filtering by date range (last 7 days, 30 days, all time)

### Requirement 5

**User Story:** As a system administrator, I want secure authentication and authorization, so that only authorized users can access the admin interface.

#### Acceptance Criteria

1. WHEN accessing any admin route THEN the system SHALL require valid authentication credentials
2. WHEN logging in THEN the system SHALL validate username/password and create a secure session
3. WHEN a session expires THEN the system SHALL redirect to login page and clear stored credentials
4. IF login attempts exceed 5 failures THEN the system SHALL temporarily lock the account for 15 minutes

### Requirement 6

**User Story:** As a content creator, I want to manage article visibility and status, so that I can control when content is published and available to readers.

#### Acceptance Criteria

1. WHEN creating an article THEN the system SHALL allow setting status as draft, published, or archived
2. WHEN an article is in draft status THEN the system SHALL not display it on the public website
3. WHEN publishing a draft article THEN the system SHALL update the publication timestamp
4. WHEN archiving an article THEN the system SHALL remove it from public view but maintain it in the admin interface