const { promisePool } = require('../../config/database');

// Get all categories
exports.getAllCategories = async (req, res) => {
    try {
        const [categories] = await promisePool.query(
            `SELECT c.*,
             COUNT(p.problem_id) as problem_count
             FROM categories c
             LEFT JOIN problems p ON c.category_id = p.category_id AND p.is_approved = 1
             WHERE c.is_active = 1
             GROUP BY c.category_id
             ORDER BY c.category_name ASC`
        );

        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message
        });
    }
};

// Get category statistics
exports.getCategoryStatistics = async (req, res) => {
    try {
        const [stats] = await promisePool.query(
            'SELECT * FROM v_category_statistics ORDER BY total_problems DESC'
        );

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get category statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching category statistics',
            error: error.message
        });
    }
};

// Get category by slug
exports.getCategoryBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const [categories] = await promisePool.query(
            `SELECT c.*,
             COUNT(p.problem_id) as problem_count,
             SUM(CASE WHEN p.status = 'solved' THEN 1 ELSE 0 END) as solved_count
             FROM categories c
             LEFT JOIN problems p ON c.category_id = p.category_id AND p.is_approved = 1
             WHERE c.category_slug = ?
             GROUP BY c.category_id`,
            [slug]
        );

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            data: categories[0]
        });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching category',
            error: error.message
        });
    }
};
