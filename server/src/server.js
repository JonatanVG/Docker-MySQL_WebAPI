import mysql from 'mysql2/promise';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import cors from 'cors';
import PosApi from '../api/weatherApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// MySQL connection pool. Used to create connections on demand.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Retry function for database connection.
async function connectWithRetry(pool, retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('server: Database connection established successfully.');
      connection.release();
      return;
    } catch (err) {
      console.warn(`server: Database not ready, retrying in ${delay}ms... (${i + 1}/${retries})`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  console.error('Server failed to connect to database after retries.');
}

// Attempt to connect at startup
await connectWithRetry(pool);

// Express configuration. Allows trust proxy for deployments behind proxies.
app.set('trust proxy', 1);

// Middleware
app.use(express.static(path.join(__dirname, '../public'))); // Serve static files (inactive as fastapi is used for frontend)
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})); // Enable CORS for all origins

// Use imported router for MySQL /api/v1 routes
app.use('/api/v1', PosApi);

/// Routes

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as healthy');
    res.json({
      status: 'healthy',
      db: rows[0].healthy === 1 ? 'connected' : 'error'
    }); // Simple query to check DB connection
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      db: 'disconnected',
      error: error.message
    });
  }
});

// User management endpoints. Creates a 'users' table if it doesn't exist.
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

// Create a new user. Expects JSON body with 'name' and 'email'. You can test with:
// curl -X POST http://10.0.0.124:3015/api/v1/users -H "Content-Type: application/json" -d '{"name":"John Doe","email":"
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
  console.log(`Server running on http://10.0.0.124:${PORT}`);
  console.log(`Health check at http://10.0.0.124:${PORT}/health`);
});
