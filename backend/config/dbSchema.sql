-- Problem Solving Platform Database Schema

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    avatar VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username)
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug)
);

-- Problems Table
CREATE TABLE IF NOT EXISTS problems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    solution TEXT NOT NULL,
    tags VARCHAR(255) DEFAULT NULL,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    is_approved BOOLEAN DEFAULT FALSE,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_category (category_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    FULLTEXT idx_search (title, description, solution, tags)
);

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    problem_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_problem (problem_id)
);

-- Likes Table
CREATE TABLE IF NOT EXISTS problem_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    problem_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_like (problem_id, user_id)
);

-- Insert Default Categories
INSERT IGNORE INTO categories (name, slug, description, icon) VALUES
('DevOps Issue', 'devops-issue', 'DevOps, CI/CD, Deployment, and Infrastructure problems', 'fas fa-server'),
('Developer Issue', 'developer-issue', 'Programming, coding, and software development issues', 'fas fa-code'),
('Cybersecurity Issue', 'cybersecurity-issue', 'Security, vulnerabilities, and protection issues', 'fas fa-shield-alt'),
('Data Science Issue', 'data-science-issue', 'Data analysis, machine learning, and AI problems', 'fas fa-chart-line'),
('SAP Issue', 'sap-issue', 'SAP system configuration and implementation issues', 'fas fa-database'),
('Data Analyst Issue', 'data-analyst-issue', 'Data visualization, reporting, and analytics problems', 'fas fa-chart-bar'),
('System Administrator Issue', 'system-administrator-issue', 'Server administration and system maintenance issues', 'fas fa-cog'),
('Cloud Computing Issue', 'cloud-computing-issue', 'AWS, Azure, GCP, and cloud infrastructure problems', 'fas fa-cloud'),
('Network Issue', 'network-issue', 'Networking, connectivity, and communication problems', 'fas fa-network-wired'),
('Database Issue', 'database-issue', 'Database design, queries, and optimization issues', 'fas fa-database');
