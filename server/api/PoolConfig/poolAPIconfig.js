import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: 'root',
  password: process.env.DB_ROOT_PASSWORD,
  database: 'GPS_Database',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Retry function for database connection
async function connectWithRetry(pool, retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('api: Database connection established successfully.');
      connection.release();
      return;
    } catch (err) {
      console.warn(`api: Database not ready, retrying in ${delay}ms... (${i + 1}/${retries})`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  console.error('Api failed to connect to database after retries.');
}

// Attempt to connect at startup
await connectWithRetry(pool);

export default pool;