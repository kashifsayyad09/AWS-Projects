const express = require('express');
const router = express.Router();
const problemController = require('../controllers/problemController');
const { verifyToken, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/', optionalAuth, problemController.getAllProblems);
router.get('/category/:slug', problemController.getProblemsByCategory);
router.get('/:id', optionalAuth, problemController.getProblemById);

// Protected routes
router.post('/', verifyToken, problemController.createProblem);
router.put('/:id', verifyToken, problemController.updateProblem);
router.delete('/:id', verifyToken, problemController.deleteProblem);

module.exports = router;
