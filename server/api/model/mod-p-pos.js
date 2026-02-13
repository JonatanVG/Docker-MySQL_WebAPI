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

export default fetchData;