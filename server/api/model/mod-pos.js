import pool from '../PoolConfig/poolAPIconfig.js';
import { getFromCache, setInCache } from '../PoolConfig/CacheConfig.js';

const gpsDataStruct = (data) => ({
  posID: data.posID,
  recordTime: data.recordTime,
  latitude: data.latitude,
  longitude: data.longitude,
  speed: data.speed,
  heart_rate: data.heart_rate,
  tourID: data.tourID
});
/*
the GPS data structure is defined as an object with the following properties:
- posID: A unique identifier for the GPS position.
- recordTime: The timestamp when the GPS data was recorded.
- latitude: The latitude coordinate of the GPS position.
- longitude: The longitude coordinate of the GPS position.
- speed: The speed at which the object was moving at the time of recording.
- heart_rate: The heart rate of the individual at the time of recording (if applicable).
- tourID: An identifier for the tour or activity associated with this GPS data.
*/

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

export default fetchData;