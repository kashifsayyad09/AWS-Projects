const jwt = require('jsonwebtoken');
const { promisePool } = require('../../config/database');

// Verify JWT token
const verifyToken = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

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
            'SELECT user_id, username, email, role, is_active FROM users WHERE user_id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found.'
            });
        }

        if (!users[0].is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is disabled.'
            });
        }

        req.user = users[0];
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired.'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid token.'
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

// Check if user is moderator or admin
const isModerator = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'moderator')) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Moderator privileges required.'
        });
    }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const [users] = await promisePool.query(
                'SELECT user_id, username, email, role, is_active FROM users WHERE user_id = ?',
                [decoded.userId]
            );

            if (users.length > 0 && users[0].is_active) {
                req.user = users[0];
            }
        }
        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    verifyToken,
    isAdmin,
    isModerator,
    optionalAuth
};
