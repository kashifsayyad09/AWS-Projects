const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { promisePool } = require('../../config/database');

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

// User registration
exports.register = async (req, res) => {
    try {
        const { username, email, password, full_name } = req.body;

        // Validate input
        if (!username || !email || !password || !full_name) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if user already exists
        const [existingUsers] = await promisePool.query(
            'SELECT user_id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or username already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create user
        const [result] = await promisePool.query(
            'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
            [username, email, password_hash, full_name]
        );

        // Log activity
        await promisePool.query(
            'INSERT INTO user_activity_log (user_id, activity_type, activity_description, ip_address) VALUES (?, ?, ?, ?)',
            [result.insertId, 'registration', 'User registered successfully', req.ip]
        );

        // Generate token
        const token = generateToken(result.insertId);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                user_id: result.insertId,
                username,
                email,
                full_name
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during registration',
            error: error.message
        });
    }
};

// User login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Find user
        const [users] = await promisePool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is disabled'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        await promisePool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
            [user.user_id]
        );

        // Log activity
        await promisePool.query(
            'INSERT INTO user_activity_log (user_id, activity_type, activity_description, ip_address) VALUES (?, ?, ?, ?)',
            [user.user_id, 'login', 'User logged in successfully', req.ip]
        );

        // Generate token
        const token = generateToken(user.user_id);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                reputation_points: user.reputation_points,
                profile_image: user.profile_image
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during login',
            error: error.message
        });
    }
};

// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [users] = await promisePool.query(
            `SELECT u.user_id, u.username, u.email, u.full_name, u.profile_image,
             u.role, u.reputation_points, u.created_at, u.last_login,
             COUNT(DISTINCT p.problem_id) as total_problems,
             COUNT(DISTINCT s.solution_id) as total_solutions
             FROM users u
             LEFT JOIN problems p ON u.user_id = p.user_id
             LEFT JOIN solutions s ON u.user_id = s.user_id
             WHERE u.user_id = ?
             GROUP BY u.user_id`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: users[0]
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message
        });
    }
};

// Logout
exports.logout = async (req, res) => {
    try {
        // Log activity
        await promisePool.query(
            'INSERT INTO user_activity_log (user_id, activity_type, activity_description, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.user_id, 'logout', 'User logged out', req.ip]
        );

        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout',
            error: error.message
        });
    }
};
