const { promisePool } = require('../../config/database');

// Get all problems with filtering and search
exports.getAllProblems = async (req, res) => {
    try {
        const {
            category,
            status,
            search,
            page = 1,
            limit = 10,
            sort = 'created_at',
            order = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        let whereConditions = ['p.is_approved = 1'];
        let queryParams = [];

        // Filter by category
        if (category) {
            whereConditions.push('c.category_slug = ?');
            queryParams.push(category);
        }

        // Filter by status
        if (status) {
            whereConditions.push('p.status = ?');
            queryParams.push(status);
        }

        // Search functionality
        if (search) {
            whereConditions.push('(p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get total count
        const [countResult] = await promisePool.query(
            `SELECT COUNT(*) as total
             FROM problems p
             JOIN categories c ON p.category_id = c.category_id
             ${whereClause}`,
            queryParams
        );

        // Get problems
        const validSortColumns = ['created_at', 'views', 'upvotes', 'title'];
        const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const [problems] = await promisePool.query(
            `SELECT p.*, c.category_name, c.category_slug, c.color,
             u.username, u.profile_image,
             COUNT(DISTINCT s.solution_id) as solution_count
             FROM problems p
             JOIN categories c ON p.category_id = c.category_id
             JOIN users u ON p.user_id = u.user_id
             LEFT JOIN solutions s ON p.problem_id = s.problem_id
             ${whereClause}
             GROUP BY p.problem_id
             ORDER BY p.${sortColumn} ${sortOrder}
             LIMIT ? OFFSET ?`,
            [...queryParams, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            data: problems,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Get problems error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching problems',
            error: error.message
        });
    }
};

// Get single problem by ID
exports.getProblemById = async (req, res) => {
    try {
        const { id } = req.params;

        // Increment view count
        await promisePool.query('CALL sp_increment_problem_views(?)', [id]);

        // Get problem details
        const [problems] = await promisePool.query(
            `SELECT p.*, c.category_name, c.category_slug, c.color,
             u.username, u.full_name, u.profile_image, u.reputation_points
             FROM problems p
             JOIN categories c ON p.category_id = c.category_id
             JOIN users u ON p.user_id = u.user_id
             WHERE p.problem_id = ?`,
            [id]
        );

        if (problems.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found'
            });
        }

        // Get solutions for this problem
        const [solutions] = await promisePool.query(
            `SELECT s.*, u.username, u.full_name, u.profile_image, u.reputation_points
             FROM solutions s
             JOIN users u ON s.user_id = u.user_id
             WHERE s.problem_id = ?
             ORDER BY s.is_accepted DESC, s.upvotes DESC, s.created_at ASC`,
            [id]
        );

        res.json({
            success: true,
            data: {
                problem: problems[0],
                solutions: solutions
            }
        });
    } catch (error) {
        console.error('Get problem error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching problem',
            error: error.message
        });
    }
};

// Create new problem
exports.createProblem = async (req, res) => {
    try {
        const { category_id, title, description, problem_details, tags } = req.body;
        const user_id = req.user.user_id;

        // Validate input
        if (!category_id || !title || !description || !problem_details) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Create problem
        const [result] = await promisePool.query(
            `INSERT INTO problems (user_id, category_id, title, description, problem_details, tags)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user_id, category_id, title, description, problem_details, tags || '']
        );

        res.status(201).json({
            success: true,
            message: 'Problem created successfully',
            problem_id: result.insertId
        });
    } catch (error) {
        console.error('Create problem error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating problem',
            error: error.message
        });
    }
};

// Update problem
exports.updateProblem = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, problem_details, tags, status, solution } = req.body;
        const user_id = req.user.user_id;

        // Check if user owns the problem or is admin
        const [problems] = await promisePool.query(
            'SELECT user_id FROM problems WHERE problem_id = ?',
            [id]
        );

        if (problems.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found'
            });
        }

        if (problems[0].user_id !== user_id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Build update query
        let updateFields = [];
        let updateValues = [];

        if (title) {
            updateFields.push('title = ?');
            updateValues.push(title);
        }
        if (description) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }
        if (problem_details) {
            updateFields.push('problem_details = ?');
            updateValues.push(problem_details);
        }
        if (tags !== undefined) {
            updateFields.push('tags = ?');
            updateValues.push(tags);
        }
        if (status) {
            updateFields.push('status = ?');
            updateValues.push(status);
            if (status === 'solved') {
                updateFields.push('solved_at = CURRENT_TIMESTAMP');
            }
        }
        if (solution !== undefined) {
            updateFields.push('solution = ?');
            updateValues.push(solution);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updateValues.push(id);

        await promisePool.query(
            `UPDATE problems SET ${updateFields.join(', ')} WHERE problem_id = ?`,
            updateValues
        );

        res.json({
            success: true,
            message: 'Problem updated successfully'
        });
    } catch (error) {
        console.error('Update problem error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating problem',
            error: error.message
        });
    }
};

// Delete problem
exports.deleteProblem = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.user_id;

        // Check if user owns the problem or is admin
        const [problems] = await promisePool.query(
            'SELECT user_id FROM problems WHERE problem_id = ?',
            [id]
        );

        if (problems.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found'
            });
        }

        if (problems[0].user_id !== user_id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await promisePool.query('DELETE FROM problems WHERE problem_id = ?', [id]);

        res.json({
            success: true,
            message: 'Problem deleted successfully'
        });
    } catch (error) {
        console.error('Delete problem error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting problem',
            error: error.message
        });
    }
};

// Get problems by category
exports.getProblemsByCategory = async (req, res) => {
    try {
        const { slug } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const [problems] = await promisePool.query(
            `SELECT p.*, c.category_name, c.category_slug, c.color,
             u.username, u.profile_image,
             COUNT(DISTINCT s.solution_id) as solution_count
             FROM problems p
             JOIN categories c ON p.category_id = c.category_id
             JOIN users u ON p.user_id = u.user_id
             LEFT JOIN solutions s ON p.problem_id = s.problem_id
             WHERE c.category_slug = ? AND p.is_approved = 1
             GROUP BY p.problem_id
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            [slug, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            data: problems
        });
    } catch (error) {
        console.error('Get problems by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching problems',
            error: error.message
        });
    }
};
