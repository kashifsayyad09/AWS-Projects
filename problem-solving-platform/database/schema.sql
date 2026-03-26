-- ============================================
-- Problem Solving Platform Database Schema
-- ============================================

-- Drop existing database if exists
DROP DATABASE IF EXISTS problem_solving_platform;

-- Create database
CREATE DATABASE problem_solving_platform;
USE problem_solving_platform;

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    profile_image VARCHAR(255) DEFAULT 'default-avatar.png',
    role ENUM('user', 'admin', 'moderator') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    reputation_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Categories Table
-- ============================================
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    category_slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (category_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default categories
INSERT INTO categories (category_name, category_slug, description, icon, color) VALUES
('DevOps Issue', 'devops-issue', 'Issues related to DevOps, CI/CD, containerization, and deployment', 'fa-code-branch', '#FF6B6B'),
('Developer Issue', 'developer-issue', 'Programming, coding, and software development issues', 'fa-code', '#4ECDC4'),
('Cybersecurity Issue', 'cybersecurity-issue', 'Security vulnerabilities, threats, and protection mechanisms', 'fa-shield-alt', '#FFE66D'),
('Data Science Issue', 'data-science-issue', 'Machine learning, AI, data analysis, and statistical problems', 'fa-chart-line', '#95E1D3'),
('SAP Issue', 'sap-issue', 'SAP system configuration, modules, and integration issues', 'fa-database', '#F38181'),
('Data Analyst Issue', 'data-analyst-issue', 'Data visualization, reporting, and business intelligence', 'fa-chart-pie', '#AA96DA'),
('System Administrator Issue', 'system-administrator-issue', 'Server management, networking, and infrastructure issues', 'fa-server', '#FCBAD3'),
('Cloud Computing Issue', 'cloud-computing-issue', 'AWS, Azure, GCP, and cloud infrastructure problems', 'fa-cloud', '#A8D8EA'),
('Database Issue', 'database-issue', 'SQL, NoSQL, database optimization, and migration issues', 'fa-table', '#FDCB6E'),
('Network Issue', 'network-issue', 'Network configuration, troubleshooting, and connectivity', 'fa-network-wired', '#6C5CE7');

-- ============================================
-- Problems Table
-- ============================================
CREATE TABLE problems (
    problem_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    problem_details LONGTEXT NOT NULL,
    solution TEXT,
    tags VARCHAR(500),
    status ENUM('pending', 'solved', 'in_progress', 'closed') DEFAULT 'pending',
    views INT DEFAULT 0,
    upvotes INT DEFAULT 0,
    downvotes INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    solved_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE,
    INDEX idx_category (category_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    FULLTEXT idx_search (title, description, problem_details, tags)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Solutions Table
-- ============================================
CREATE TABLE solutions (
    solution_id INT AUTO_INCREMENT PRIMARY KEY,
    problem_id INT NOT NULL,
    user_id INT NOT NULL,
    solution_text LONGTEXT NOT NULL,
    code_snippet TEXT,
    is_accepted BOOLEAN DEFAULT FALSE,
    upvotes INT DEFAULT 0,
    downvotes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (problem_id) REFERENCES problems(problem_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_problem (problem_id),
    INDEX idx_user (user_id),
    INDEX idx_accepted (is_accepted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Comments Table
-- ============================================
CREATE TABLE comments (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    problem_id INT,
    solution_id INT,
    user_id INT NOT NULL,
    parent_comment_id INT NULL,
    comment_text TEXT NOT NULL,
    upvotes INT DEFAULT 0,
    downvotes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (problem_id) REFERENCES problems(problem_id) ON DELETE CASCADE,
    FOREIGN KEY (solution_id) REFERENCES solutions(solution_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE,
    INDEX idx_problem (problem_id),
    INDEX idx_solution (solution_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Votes Table
-- ============================================
CREATE TABLE votes (
    vote_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    problem_id INT,
    solution_id INT,
    comment_id INT,
    vote_type ENUM('upvote', 'downvote') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES problems(problem_id) ON DELETE CASCADE,
    FOREIGN KEY (solution_id) REFERENCES solutions(solution_id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE,
    UNIQUE KEY unique_vote (user_id, problem_id, solution_id, comment_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- User Activity Log Table
-- ============================================
CREATE TABLE user_activity_log (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Bookmarks Table
-- ============================================
CREATE TABLE bookmarks (
    bookmark_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    problem_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (problem_id) REFERENCES problems(problem_id) ON DELETE CASCADE,
    UNIQUE KEY unique_bookmark (user_id, problem_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Notifications Table
-- ============================================
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    reference_id INT,
    reference_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Tags Table
-- ============================================
CREATE TABLE tags (
    tag_id INT AUTO_INCREMENT PRIMARY KEY,
    tag_name VARCHAR(50) UNIQUE NOT NULL,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (tag_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Problem Tags Relationship Table
-- ============================================
CREATE TABLE problem_tags (
    problem_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (problem_id, tag_id),
    FOREIGN KEY (problem_id) REFERENCES problems(problem_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE,
    INDEX idx_tag (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Sessions Table (for authentication)
-- ============================================
CREATE TABLE sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    session_data TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Create Views for Analytics
-- ============================================

-- Most Active Users View
CREATE VIEW v_most_active_users AS
SELECT
    u.user_id,
    u.username,
    u.full_name,
    u.reputation_points,
    COUNT(DISTINCT p.problem_id) as problems_posted,
    COUNT(DISTINCT s.solution_id) as solutions_provided,
    COUNT(DISTINCT c.comment_id) as comments_made
FROM users u
LEFT JOIN problems p ON u.user_id = p.user_id
LEFT JOIN solutions s ON u.user_id = s.user_id
LEFT JOIN comments c ON u.user_id = c.user_id
GROUP BY u.user_id, u.username, u.full_name, u.reputation_points;

-- Popular Problems View
CREATE VIEW v_popular_problems AS
SELECT
    p.problem_id,
    p.title,
    p.views,
    p.upvotes,
    p.status,
    c.category_name,
    u.username as author,
    COUNT(DISTINCT s.solution_id) as solution_count,
    p.created_at
FROM problems p
JOIN categories c ON p.category_id = c.category_id
JOIN users u ON p.user_id = u.user_id
LEFT JOIN solutions s ON p.problem_id = s.problem_id
GROUP BY p.problem_id, p.title, p.views, p.upvotes, p.status, c.category_name, u.username, p.created_at;

-- Category Statistics View
CREATE VIEW v_category_statistics AS
SELECT
    c.category_id,
    c.category_name,
    c.category_slug,
    COUNT(p.problem_id) as total_problems,
    SUM(CASE WHEN p.status = 'solved' THEN 1 ELSE 0 END) as solved_problems,
    SUM(p.views) as total_views
FROM categories c
LEFT JOIN problems p ON c.category_id = p.category_id
GROUP BY c.category_id, c.category_name, c.category_slug;

-- ============================================
-- Create Stored Procedures
-- ============================================

DELIMITER //

-- Procedure to update problem view count
CREATE PROCEDURE sp_increment_problem_views(IN p_problem_id INT)
BEGIN
    UPDATE problems
    SET views = views + 1
    WHERE problem_id = p_problem_id;
END //

-- Procedure to get user statistics
CREATE PROCEDURE sp_get_user_statistics(IN p_user_id INT)
BEGIN
    SELECT
        u.user_id,
        u.username,
        u.email,
        u.reputation_points,
        COUNT(DISTINCT p.problem_id) as total_problems,
        COUNT(DISTINCT s.solution_id) as total_solutions,
        COUNT(DISTINCT c.comment_id) as total_comments,
        SUM(CASE WHEN p.status = 'solved' THEN 1 ELSE 0 END) as solved_problems
    FROM users u
    LEFT JOIN problems p ON u.user_id = p.user_id
    LEFT JOIN solutions s ON u.user_id = s.user_id
    LEFT JOIN comments c ON u.user_id = c.user_id
    WHERE u.user_id = p_user_id
    GROUP BY u.user_id, u.username, u.email, u.reputation_points;
END //

DELIMITER ;

-- ============================================
-- Insert Sample Admin User (password: Admin@123)
-- ============================================
INSERT INTO users (username, email, password_hash, full_name, role, is_verified) VALUES
('admin', 'admin@problemsolving.com', '$2b$10$YourHashedPasswordHere', 'System Administrator', 'admin', TRUE);

-- ============================================
-- Create Indexes for Performance
-- ============================================
CREATE INDEX idx_problems_category_status ON problems(category_id, status);
CREATE INDEX idx_problems_user_created ON problems(user_id, created_at);
CREATE INDEX idx_solutions_problem_accepted ON solutions(problem_id, is_accepted);

-- ============================================
-- End of Schema
-- ============================================
