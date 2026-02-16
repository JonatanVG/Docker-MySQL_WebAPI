import NodeCache from 'node-cache';

const gps_cache = new NodeCache({ stdTTL: 600 }); // 10 minute cache
const longTTLCache = new NodeCache({ stdTTL: 7*86400 }); // 7 day cache

gps_cache.on('set', (key, value) => {
  console.log(`GPS Cache set: ${key} -> ${JSON.stringify(value)}`);
});

longTTLCache.on('set', (key, value) => {
  console.log(`Long TTL Cache set: ${key} -> ${JSON.stringify(value)}`);
});

const getFromCache = (key) => {
  return gps_cache.get(key) ?? longTTLCache.get(key) ?? null;
}

const setInCache = (data) => {
  if (data.posID === undefined) return;

  const cache = data.posID < 1500 ? longTTLCache : gps_cache;
  cache.set(data.posID, data);
  console.log(`Cache set: ${cache === longTTLCache ? 'Long TTL Cache' : 'GPS Cache'} '${data.posID}': ${JSON.stringify(data)}`);
}

export { getFromCache, setInCache };