const { promisePool } = require('../config/database');

// Create new problem
const createProblem = async (req, res) => {
    try {
        const { category_id, title, description, solution, tags } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!category_id || !title || !description || !solution) {
            return res.status(400).json({
                success: false,
                message: 'Category, title, description, and solution are required.'
            });
        }

        // Insert problem
        const [result] = await promisePool.query(
            `INSERT INTO problems (user_id, category_id, title, description, solution, tags, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, category_id, title, description, solution, tags || '', 'pending']
        );

        res.status(201).json({
            success: true,
            message: 'Problem submitted successfully. Pending admin approval.',
            data: {
                problemId: result.insertId
            }
        });
    } catch (error) {
        console.error('Create Problem Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating problem.'
        });
    }
};

// Get all approved problems with pagination and filters
const getProblems = async (req, res) => {
    try {
        const { category, search, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT p.*, u.username, u.full_name, c.name as category_name, c.slug as category_slug
            FROM problems p
            JOIN users u ON p.user_id = u.id
            JOIN categories c ON p.category_id = c.id
            WHERE p.status = 'approved'
        `;
        const params = [];

        // Filter by category
        if (category) {
            query += ' AND c.slug = ?';
            params.push(category);
        }

        // Search functionality
        if (search) {
            query += ' AND MATCH(p.title, p.description, p.solution, p.tags) AGAINST(? IN NATURAL LANGUAGE MODE)';
            params.push(search);
        }

        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [problems] = await promisePool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM problems p JOIN categories c ON p.category_id = c.id WHERE p.status = "approved"';
        const countParams = [];

        if (category) {
            countQuery += ' AND c.slug = ?';
            countParams.push(category);
        }

        if (search) {
            countQuery += ' AND MATCH(p.title, p.description, p.solution, p.tags) AGAINST(? IN NATURAL LANGUAGE MODE)';
            countParams.push(search);
        }

        const [countResult] = await promisePool.query(countQuery, countParams);
        const total = countResult[0].total;

        res.status(200).json({
            success: true,
            data: {
                problems,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get Problems Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching problems.'
        });
    }
};

// Get single problem by ID
const getProblemById = async (req, res) => {
    try {
        const { id } = req.params;

        // Increment view count
        await promisePool.query(
            'UPDATE problems SET views = views + 1 WHERE id = ?',
            [id]
        );

        // Get problem details
        const [problems] = await promisePool.query(
            `SELECT p.*, u.username, u.full_name, c.name as category_name, c.slug as category_slug
             FROM problems p
             JOIN users u ON p.user_id = u.id
             JOIN categories c ON p.category_id = c.id
             WHERE p.id = ? AND p.status = 'approved'`,
            [id]
        );

        if (problems.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found.'
            });
        }

        // Get comments
        const [comments] = await promisePool.query(
            `SELECT c.*, u.username, u.full_name
             FROM comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.problem_id = ? AND c.is_approved = true
             ORDER BY c.created_at DESC`,
            [id]
        );

        res.status(200).json({
            success: true,
            data: {
                problem: problems[0],
                comments
            }
        });
    } catch (error) {
        console.error('Get Problem Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching problem.'
        });
    }
};

// Like a problem
const likeProblem = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if already liked
        const [existing] = await promisePool.query(
            'SELECT id FROM problem_likes WHERE problem_id = ? AND user_id = ?',
            [id, userId]
        );

        if (existing.length > 0) {
            // Unlike
            await promisePool.query(
                'DELETE FROM problem_likes WHERE problem_id = ? AND user_id = ?',
                [id, userId]
            );
            await promisePool.query(
                'UPDATE problems SET likes = likes - 1 WHERE id = ?',
                [id]
            );
            return res.status(200).json({
                success: true,
                message: 'Problem unliked.',
                action: 'unliked'
            });
        } else {
            // Like
            await promisePool.query(
                'INSERT INTO problem_likes (problem_id, user_id) VALUES (?, ?)',
                [id, userId]
            );
            await promisePool.query(
                'UPDATE problems SET likes = likes + 1 WHERE id = ?',
                [id]
            );
            return res.status(200).json({
                success: true,
                message: 'Problem liked.',
                action: 'liked'
            });
        }
    } catch (error) {
        console.error('Like Problem Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error.'
        });
    }
};

// Add comment to problem
const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content || content.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Comment content is required.'
            });
        }

        const [result] = await promisePool.query(
            'INSERT INTO comments (problem_id, user_id, content) VALUES (?, ?, ?)',
            [id, userId, content]
        );

        res.status(201).json({
            success: true,
            message: 'Comment added successfully.',
            data: {
                commentId: result.insertId
            }
        });
    } catch (error) {
        console.error('Add Comment Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error adding comment.'
        });
    }
};

// Get user's own problems
const getMyProblems = async (req, res) => {
    try {
        const userId = req.user.id;

        const [problems] = await promisePool.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug
             FROM problems p
             JOIN categories c ON p.category_id = c.id
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC`,
            [userId]
        );

        res.status(200).json({
            success: true,
            data: problems
        });
    } catch (error) {
        console.error('Get My Problems Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching problems.'
        });
    }
};

module.exports = {
    createProblem,
    getProblems,
    getProblemById,
    likeProblem,
    addComment,
    getMyProblems
};
