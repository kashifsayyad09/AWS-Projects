const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');

// Verify JWT Token
const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const [users] = await promisePool.query(
            'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found.'
            });
        }

        if (!users[0].is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated.'
            });
        }

        req.user = users[0];
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.'
        });
    }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
};

module.exports = { authMiddleware, isAdmin };
