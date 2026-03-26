const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(verifyToken);
router.use(isAdmin);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/role', adminController.updateUserRole);
router.put('/users/:userId/toggle-status', adminController.toggleUserStatus);

// Problem management
router.get('/problems', adminController.getAllProblemsAdmin);
router.put('/problems/:problemId/approve', adminController.approveProblem);
router.delete('/problems/:problemId', adminController.deleteProblemAdmin);

// Category management
router.post('/categories', adminController.createCategory);
router.put('/categories/:categoryId', adminController.updateCategory);

// Activity logs
router.get('/activity-logs', adminController.getActivityLogs);

module.exports = router;
