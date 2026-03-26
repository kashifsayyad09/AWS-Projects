const { promisePool } = require('../config/database');

// Get all active categories
const getCategories = async (req, res) => {
    try {
        const [categories] = await promisePool.query(
            'SELECT * FROM categories WHERE is_active = true ORDER BY name ASC'
        );

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Get Categories Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching categories.'
        });
    }
};

// Get category by slug with problem count
const getCategoryBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const [categories] = await promisePool.query(
            `SELECT c.*, COUNT(p.id) as problem_count
             FROM categories c
             LEFT JOIN problems p ON c.id = p.category_id AND p.status = 'approved'
             WHERE c.slug = ? AND c.is_active = true
             GROUP BY c.id`,
            [slug]
        );

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found.'
            });
        }

        res.status(200).json({
            success: true,
            data: categories[0]
        });
    } catch (error) {
        console.error('Get Category Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching category.'
        });
    }
};

module.exports = {
    getCategories,
    getCategoryBySlug
};
