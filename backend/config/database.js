const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Get promise-based connection
const promisePool = pool.promise();

// Test connection
const testConnection = async () => {
    try {
        const connection = await promisePool.getConnection();
        console.log('✓ MySQL Database Connected Successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('✗ MySQL Connection Error:', error.message);
        return false;
    }
};

module.exports = { pool, promisePool, testConnection };
