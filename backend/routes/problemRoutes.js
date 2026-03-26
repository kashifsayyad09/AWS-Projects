const express = require('express');
const router = express.Router();
const {
    createProblem,
    getProblems,
    getProblemById,
    likeProblem,
    addComment,
    getMyProblems
} = require('../controllers/problemController');
const { authMiddleware } = require('../middleware/auth');

// Public routes
router.get('/', getProblems);
router.get('/:id', getProblemById);

// Protected routes
router.post('/', authMiddleware, createProblem);
router.post('/:id/like', authMiddleware, likeProblem);
router.post('/:id/comment', authMiddleware, addComment);
router.get('/user/my-problems', authMiddleware, getMyProblems);

module.exports = router;
