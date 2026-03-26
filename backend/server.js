const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const problemRoutes = require('./routes/problemRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Problem Solving Platform API is running',
        timestamp: new Date().toISOString()
    });
});

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/signup.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/admin.html'));
});

app.get('/submit-problem', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/submit-problem.html'));
});

app.get('/problem/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/problem-detail.html'));
});

app.get('/category/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/category.html'));
});

app.get('/my-problems', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/my-problems.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
        console.error('Failed to connect to database. Please check your configuration.');
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🚀 Problem Solving Platform Server`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📡 Server running on port ${PORT}`);
        console.log(`🌐 API URL: http://localhost:${PORT}/api`);
        console.log(`🏠 Frontend: http://localhost:${PORT}`);
        console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    });
};

startServer();

module.exports = app;
