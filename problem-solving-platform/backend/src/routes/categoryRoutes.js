const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/statistics', categoryController.getCategoryStatistics);
router.get('/:slug', categoryController.getCategoryBySlug);

module.exports = router;
