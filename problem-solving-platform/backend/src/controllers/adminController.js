const { promisePool } = require('../../config/database');
const bcrypt = require('bcryptjs');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
    try {
        // Get total counts
        const [totalUsers] = await promisePool.query(
            'SELECT COUNT(*) as count FROM users'
        );
        const [totalProblems] = await promisePool.query(
            'SELECT COUNT(*) as count FROM problems'
        );
        const [totalSolutions] = await promisePool.query(
            'SELECT COUNT(*) as count FROM solutions'
        );
        const [solvedProblems] = await promisePool.query(
            "SELECT COUNT(*) as count FROM problems WHERE status = 'solved'"
        );

        // Get recent activities
        const [recentActivities] = await promisePool.query(
            `SELECT * FROM user_activity_log
             ORDER BY created_at DESC
             LIMIT 20`
        );

        // Get popular categories
        const [popularCategories] = await promisePool.query(
            `SELECT * FROM v_category_statistics
             ORDER BY total_problems DESC
             LIMIT 10`
        );

        // Get active users
        const [activeUsers] = await promisePool.query(
            `SELECT * FROM v_most_active_users
             ORDER BY reputation_points DESC
             LIMIT 10`
        );

        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers: totalUsers[0].count,
                    totalProblems: totalProblems[0].count,
                    totalSolutions: totalSolutions[0].count,
                    solvedProblems: solvedProblems[0].count
                },
                recentActivities,
                popularCategories,
                activeUsers
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics',
            error: error.message
        });
    }
};

// Get all users (admin)
exports.getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let queryParams = [];

        if (search) {
            whereClause = 'WHERE u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?';
            const searchTerm = `%${search}%`;
            queryParams = [searchTerm, searchTerm, searchTerm];
        }

        const [users] = await promisePool.query(
            `SELECT u.user_id, u.username, u.email, u.full_name, u.role,
             u.is_active, u.reputation_points, u.created_at, u.last_login,
             COUNT(DISTINCT p.problem_id) as total_problems,
             COUNT(DISTINCT s.solution_id) as total_solutions
             FROM users u
             LEFT JOIN problems p ON u.user_id = p.user_id
             LEFT JOIN solutions s ON u.user_id = s.user_id
             ${whereClause}
             GROUP BY u.user_id
             ORDER BY u.created_at DESC
             LIMIT ? OFFSET ?`,
            [...queryParams, parseInt(limit), parseInt(offset)]
        );

        const [countResult] = await promisePool.query(
            `SELECT COUNT(*) as total FROM users u ${whereClause}`,
            queryParams
        );

        res.json({
            success: true,
            data: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
};

// Update user role
exports.updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['user', 'admin', 'moderator'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role'
            });
        }

        await promisePool.query(
            'UPDATE users SET role = ? WHERE user_id = ?',
            [role, userId]
        );

        res.json({
            success: true,
            message: 'User role updated successfully'
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user role',
            error: error.message
        });
    }
};

// Toggle user active status
exports.toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        await promisePool.query(
            'UPDATE users SET is_active = NOT is_active WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: 'User status updated successfully'
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user status',
            error: error.message
        });
    }
};

// Get all problems (admin)
exports.getAllProblemsAdmin = async (req, res) => {
    try {
        const { page = 1, limit = 20, status = '', is_approved = '' } = req.query;
        const offset = (page - 1) * limit;

        let whereConditions = [];
        let queryParams = [];

        if (status) {
            whereConditions.push('p.status = ?');
            queryParams.push(status);
        }

        if (is_approved !== '') {
            whereConditions.push('p.is_approved = ?');
            queryParams.push(is_approved === 'true' ? 1 : 0);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const [problems] = await promisePool.query(
            `SELECT p.*, c.category_name, u.username
             FROM problems p
             JOIN categories c ON p.category_id = c.category_id
             JOIN users u ON p.user_id = u.user_id
             ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            [...queryParams, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            data: problems
        });
    } catch (error) {
        console.error('Get all problems admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching problems',
            error: error.message
        });
    }
};

// Approve/reject problem
exports.approveProblem = async (req, res) => {
    try {
        const { problemId } = req.params;
        const { is_approved } = req.body;

        await promisePool.query(
            'UPDATE problems SET is_approved = ? WHERE problem_id = ?',
            [is_approved ? 1 : 0, problemId]
        );

        res.json({
            success: true,
            message: `Problem ${is_approved ? 'approved' : 'rejected'} successfully`
        });
    } catch (error) {
        console.error('Approve problem error:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving problem',
            error: error.message
        });
    }
};

// Delete problem (admin)
exports.deleteProblemAdmin = async (req, res) => {
    try {
        const { problemId } = req.params;

        await promisePool.query('DELETE FROM problems WHERE problem_id = ?', [problemId]);

        res.json({
            success: true,
            message: 'Problem deleted successfully'
        });
    } catch (error) {
        console.error('Delete problem admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting problem',
            error: error.message
        });
    }
};

// Get activity logs
exports.getActivityLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const [logs] = await promisePool.query(
            `SELECT l.*, u.username, u.email
             FROM user_activity_log l
             JOIN users u ON l.user_id = u.user_id
             ORDER BY l.created_at DESC
             LIMIT ? OFFSET ?`,
            [parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('Get activity logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching activity logs',
            error: error.message
        });
    }
};

// Create new category
exports.createCategory = async (req, res) => {
    try {
        const { category_name, category_slug, description, icon, color } = req.body;

        const [result] = await promisePool.query(
            `INSERT INTO categories (category_name, category_slug, description, icon, color)
             VALUES (?, ?, ?, ?, ?)`,
            [category_name, category_slug, description, icon, color]
        );

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category_id: result.insertId
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating category',
            error: error.message
        });
    }
};

// Update category
exports.updateCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { category_name, description, icon, color, is_active } = req.body;

        let updateFields = [];
        let updateValues = [];

        if (category_name) {
            updateFields.push('category_name = ?');
            updateValues.push(category_name);
        }
        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }
        if (icon) {
            updateFields.push('icon = ?');
            updateValues.push(icon);
        }
        if (color) {
            updateFields.push('color = ?');
            updateValues.push(color);
        }
        if (is_active !== undefined) {
            updateFields.push('is_active = ?');
            updateValues.push(is_active ? 1 : 0);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updateValues.push(categoryId);

        await promisePool.query(
            `UPDATE categories SET ${updateFields.join(', ')} WHERE category_id = ?`,
            updateValues
        );

        res.json({
            success: true,
            message: 'Category updated successfully'
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating category',
            error: error.message
        });
    }
};
