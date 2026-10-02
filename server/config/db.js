// server/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'villagemart',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10
});

// Test database connection
db.getConnection()
  .then((conn) => {
    console.log('Connected to MySQL Database!');
    conn.release();
  })
  .catch((err) => {
    console.error('MySQL connection error:', err.message);
  });

module.exports = db;