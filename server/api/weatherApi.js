// weatherApi.js (Express backend)
import express from 'express';
import NodeCache from 'node-cache';
import mysql from 'mysql2/promise';

const router = express.Router();
const gps_cache = new NodeCache({ stdTTL: 600 }); // 10 minute cache

// MySQL connection pool
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

const normalizeRows = (rows) => {
    if (!rows) return [];
    return Array.isArray(rows) ? rows : [rows];
};

async function fetchData(req, res, request, id = null) {    
    const hasId = id !== null && id != undefined;

    if (hasId && Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    const cacheKey = hasId ? id : request;
    
    if (gps_cache.has(cacheKey)) {
        const cachedData = gps_cache.get(cacheKey);
        return res.json(cachedData);
    }
    
    try {
        const queryArgs = hasId ? [id] : [];
        const [rawRows] = await pool.query(request, queryArgs);
        console.log("Raw Rows:", rawRows)

        const rows = Array.isArray(rawRows) ? rawRows : [rawRows];
        console.log("Rows:", rows)
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Position not found' });
        }
        
        const result = rows.map(data => {
            const gpsData = {
                posID: data.posID,
                recordTime: data.recordTime,
                latitude: data.latitude,
                longitude: data.longitude,
                speed: data.speed,
                heart_rate: data.heart_rate,
                tourID: data.tourID
            };

            if (gpsData.posID !== undefined) {
                gps_cache.set(gpsData.posID, gpsData);
            }

            console.log("GPS data:", gpsData)
            return gpsData;
        });
        
        gps_cache.set(cacheKey, result.length === 1 ? result[0] : result);
        console.log(`Cache success, GPS Cache '${id}': ${result}`)
        return res.json(result.length === 1 ? result[0] : result);
    } catch (error) {
        console.error('Pos API error:', error);
        res.status(500).json({ error: 'Failed to fetch Pos data' });
    }
}

router.get('/gps/pos/:posID', async (req, res) => {
    const relPos = Number(req.params.posID);
    
    const data = await fetchData(req, res,
        'SELECT * FROM gps_tracking WHERE posID =?;',
        relPos
    );

    return data;
});

router.get('/gps/pos', async (req, res) => {
    // Fallback to default city
    const posRel = Number(req.query.posID ?? 1514);
    res.redirect(`/api/v1/gps/pos/${posRel}`);
});

router.get('/gps/:tourID', async (req, res) => {
    const relTour = Number(req.params.tourID);
    
    const data = await fetchData(req, res,
        'SELECT * FROM gps_tracking WHERE tourID = ?;',
        relTour
    );

    return data;
});

router.get('/gps', async (req, res) => {
    // Fallback to default city
    const data = await fetchData(req, res,
        'SELECT * FROM gps_tracking;'
    )

    return data;
});

// In Express - test route
router.get('/debug/gps/:posID', (req, res) => {
    res.json({
        debug: true,
        posID: req.params.posID,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Gå til /api/v1/test for å se om api-et funker uten å bruker weather apiet.
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Express API is working',
        timestamp: new Date().toISOString() 
    });
});

export default router;