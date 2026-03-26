const { promisePool } = require('../config/database');
const { hashPassword, comparePassword, generateToken, isValidEmail, isValidPassword } = require('../utils/helpers');

// Register new user
const register = async (req, res) => {
    try {
        const { username, email, password, full_name } = req.body;

        // Validate input
        if (!username || !email || !password || !full_name) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required.'
            });
        }

        // Validate email
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format.'
            });
        }

        // Validate password
        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long.'
            });
        }

        // Check if user already exists
        const [existingUsers] = await promisePool.query(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or username already exists.'
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Insert user
        const [result] = await promisePool.query(
            'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, full_name, 'user']
        );

        // Generate token
        const token = generateToken(result.insertId, 'user');

        res.status(201).json({
            success: true,
            message: 'User registered successfully.',
            data: {
                userId: result.insertId,
                username,
                email,
                full_name,
                role: 'user',
                token
            }
        });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration.'
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        // Get user from database
        const [users] = await promisePool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const user = users[0];

        // Check if account is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated. Please contact support.'
            });
        }

        // Compare password
        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Generate token
        const token = generateToken(user.id, user.role);

        res.status(200).json({
            success: true,
            message: 'Login successful.',
            data: {
                userId: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                token
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login.'
        });
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            data: {
                userId: req.user.id,
                username: req.user.username,
                email: req.user.email,
                full_name: req.user.full_name,
                role: req.user.role
            }
        });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching profile.'
        });
    }
};

module.exports = { register, login, getProfile };
