const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getAllProblems,
    updateProblemStatus,
    deleteProblem,
    getAllUsers,
    toggleUserStatus,
    deleteUser,
    createCategory,
    deleteComment
} = require('../controllers/adminController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authMiddleware, isAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Problems management
router.get('/problems', getAllProblems);
router.put('/problems/:id/status', updateProblemStatus);
router.delete('/problems/:id', deleteProblem);

// Users management
router.get('/users', getAllUsers);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.delete('/users/:id', deleteUser);

// Categories management
router.post('/categories', createCategory);

// Comments management
router.delete('/comments/:id', deleteComment);

module.exports = router;
