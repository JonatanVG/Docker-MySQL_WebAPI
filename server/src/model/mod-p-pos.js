import pool from '../PoolConfig/poolAPIconfig.js';
import { getFromCache, setInCache } from '../PoolConfig/CacheConfig.js';

const gpsDataStruct = (data) => ({
  ID: data.ID,
  LATITUDE: data.LATITUDE,
  LONGITUDE: data.LONGITUDE,
  TOURID: data.TOURID,
  RECORDTIME: data.RECORDTIME
});

async function fetchData(req, res, request) {
  const id = req.params.posID ?? req.params.tourID;
  if (id != null && isNaN(Number(id))) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  const cacheKey = id ?? request;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  try {
    const [rawRows] = await pool.query(request, id != null ? [id] : []);
    if (!rawRows?.length) {
      return res.status(404).json({ error: 'Position not found' });
    }
    const rows = Array.isArray(rawRows) ? rawRows : [rawRows];
    const result = rows.map(data => {
      const gpsData = gpsDataStruct(data);
      setInCache(gpsData);
      return gpsData;
    });
    return res.json(result.length === 1 ? result[0] : result);
  } catch (error) {
    console.error('Pos API error:', error);
    res.status(500).json({ error: 'Failed to fetch Pos data' });
  }
}

async function fetchCurTour(req, res, request) {
  try {
    const curTour = await pool.query(request);
    if (!curTour) {
      return res.status(404).json({ error: 'No previous tour, we are doomed...' });
    }
    return res.json(curTour);
  } catch (error) {
    console.error('Cur Tour ID API error:', error);
    res.status(500).json({ error: 'Failed to get current position ID' });
  }
}

async function postData(req, res) {
   try {
    const { tourID, latitude, longitude, recordTime } = req.body;
    
    if (!tourID || !latitude || !longitude || !recordTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    let query = `
      INSERT INTO PHONE_GPS_TRACKER
      (LATITUDE, LONGITUDE, TOURID, RECORDTIME)
      VALUES (?, ?, ?, ?);
    `;

    const params = [
      Number(latitude),
      Number(longitude),
      Number(tourID),
      recordTime
    ]

    const [result] = await pool.query(query, params);

    return res.status(201).json({
      success: true,
      message: 'GPS data added successfully',
      data: {
        id: result.insertId,
        latitude,
        longitude,
        tourID,
        recordTime: params[3]
      }
    });
  }
  catch (error) {
    console.error('Error processing tracker data:', error);
    return res.status(500).json({ error: 'Failed to process tracker data' });
  }
}

export default {
  fetchData,
  fetchCurTour,
  postData
}