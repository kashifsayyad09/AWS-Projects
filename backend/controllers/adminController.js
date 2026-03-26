const { promisePool } = require('../config/database');
const { hashPassword } = require('../utils/helpers');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
    try {
        // Get total users
        const [totalUsers] = await promisePool.query(
            'SELECT COUNT(*) as count FROM users WHERE role = "user"'
        );

        // Get total problems
        const [totalProblems] = await promisePool.query(
            'SELECT COUNT(*) as count FROM problems'
        );

        // Get pending problems
        const [pendingProblems] = await promisePool.query(
            'SELECT COUNT(*) as count FROM problems WHERE status = "pending"'
        );

        // Get approved problems
        const [approvedProblems] = await promisePool.query(
            'SELECT COUNT(*) as count FROM problems WHERE status = "approved"'
        );

        // Get total categories
        const [totalCategories] = await promisePool.query(
            'SELECT COUNT(*) as count FROM categories WHERE is_active = true'
        );

        // Get recent problems
        const [recentProblems] = await promisePool.query(
            `SELECT p.*, u.username, c.name as category_name
             FROM problems p
             JOIN users u ON p.user_id = u.id
             JOIN categories c ON p.category_id = c.id
             ORDER BY p.created_at DESC
             LIMIT 10`
        );

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalUsers: totalUsers[0].count,
                    totalProblems: totalProblems[0].count,
                    pendingProblems: pendingProblems[0].count,
                    approvedProblems: approvedProblems[0].count,
                    totalCategories: totalCategories[0].count
                },
                recentProblems
            }
        });
    } catch (error) {
        console.error('Get Dashboard Stats Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching dashboard statistics.'
        });
    }
};

// Get all problems (including pending)
const getAllProblems = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT p.*, u.username, u.full_name, c.name as category_name
            FROM problems p
            JOIN users u ON p.user_id = u.id
            JOIN categories c ON p.category_id = c.id
        `;
        const params = [];

        if (status) {
            query += ' WHERE p.status = ?';
            params.push(status);
        }

        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [problems] = await promisePool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM problems';
        if (status) {
            countQuery += ' WHERE status = ?';
        }
        const [countResult] = await promisePool.query(countQuery, status ? [status] : []);

        res.status(200).json({
            success: true,
            data: {
                problems,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(countResult[0].total / limit),
                    totalItems: countResult[0].total
                }
            }
        });
    } catch (error) {
        console.error('Get All Problems Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching problems.'
        });
    }
};

// Approve or reject problem
const updateProblemStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "approved" or "rejected".'
            });
        }

        await promisePool.query(
            'UPDATE problems SET status = ?, is_approved = ? WHERE id = ?',
            [status, status === 'approved', id]
        );

        res.status(200).json({
            success: true,
            message: `Problem ${status} successfully.`
        });
    } catch (error) {
        console.error('Update Problem Status Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating problem status.'
        });
    }
};

// Delete problem
const deleteProblem = async (req, res) => {
    try {
        const { id } = req.params;

        await promisePool.query('DELETE FROM problems WHERE id = ?', [id]);

        res.status(200).json({
            success: true,
            message: 'Problem deleted successfully.'
        });
    } catch (error) {
        console.error('Delete Problem Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting problem.'
        });
    }
};

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const [users] = await promisePool.query(
            `SELECT id, username, email, full_name, role, is_active, created_at
             FROM users
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [parseInt(limit), parseInt(offset)]
        );

        const [countResult] = await promisePool.query('SELECT COUNT(*) as total FROM users');

        res.status(200).json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(countResult[0].total / limit),
                    totalItems: countResult[0].total
                }
            }
        });
    } catch (error) {
        console.error('Get All Users Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching users.'
        });
    }
};

// Toggle user active status
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;

        // Don't allow deactivating own account
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account.'
            });
        }

        await promisePool.query(
            'UPDATE users SET is_active = NOT is_active WHERE id = ?',
            [id]
        );

        res.status(200).json({
            success: true,
            message: 'User status updated successfully.'
        });
    } catch (error) {
        console.error('Toggle User Status Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating user status.'
        });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Don't allow deleting own account
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account.'
            });
        }

        await promisePool.query('DELETE FROM users WHERE id = ?', [id]);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully.'
        });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting user.'
        });
    }
};

// Manage categories
const createCategory = async (req, res) => {
    try {
        const { name, slug, description, icon } = req.body;

        if (!name || !slug) {
            return res.status(400).json({
                success: false,
                message: 'Name and slug are required.'
            });
        }

        const [result] = await promisePool.query(
            'INSERT INTO categories (name, slug, description, icon) VALUES (?, ?, ?, ?)',
            [name, slug, description, icon]
        );

        res.status(201).json({
            success: true,
            message: 'Category created successfully.',
            data: {
                categoryId: result.insertId
            }
        });
    } catch (error) {
        console.error('Create Category Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating category.'
        });
    }
};

// Delete comment
const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;

        await promisePool.query('DELETE FROM comments WHERE id = ?', [id]);

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully.'
        });
    } catch (error) {
        console.error('Delete Comment Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting comment.'
        });
    }
};

module.exports = {
    getDashboardStats,
    getAllProblems,
    updateProblemStatus,
    deleteProblem,
    getAllUsers,
    toggleUserStatus,
    deleteUser,
    createCategory,
    deleteComment
};
