import mysql from 'mysql2/promise';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';
import PosApi from '../api/weatherApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Load database password from secrets or env
export let password = process.env.DB_APP_PASSWORD || 'KokoPeak';
try {
  if (fs.existsSync('/run/secrets/db-password')) {
    password = fs.readFileSync('/run/secrets/db-password', 'utf8');
  }
} catch (err) {
  console.warn('Could not read database password from secrets. Using environment variable if available.');
}

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'jvgdb',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: password.trim(),
  database: process.env.DB_NAME || 'example',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Retry function for database connection
async function connectWithRetry(pool, retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('Database connection established successfully.');
      connection.release();
      return;
    } catch (err) {
      console.warn(`Database not ready, retrying in ${delay}ms... (${i + 1}/${retries})`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  console.error('Failed to connect to database after retries.');
}

// Attempt to connect at startup
await connectWithRetry(pool);

// Express configuration
app.set('trust proxy', 1);

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use('/api/v1', PosApi); // Imported router from weatherApi.js

// Routes
app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as healthy');
    res.json({
      status: 'healthy',
      db: rows[0].healthy === 1 ? 'connected' : 'error'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      db: 'disconnected',
      error: error.message
    });
  }
});

app.get('/api/v1/users', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  
      )
    `);

    const [users] = await pool.query('SELECT * FROM users;');
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [name, email]
    );

    res.status(201).json({ message: 'Users created successfully', id: result.insertId });
  } catch (error) {
    console.error('Error creating user:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/users/:id', async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check at http://localhost:${PORT}/health`);
});
