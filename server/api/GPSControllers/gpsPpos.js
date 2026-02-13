import fetchData from "../model/mod-p-pos.js";

const pos_get = async (req, res) => {
  const data = await fetchData(req, res, 'SELECT * FROM PHONE_GPS_TRACKER WHERE ID =?;' );
  return data;
};

const tour_get = async (req, res) => {
  const data = await fetchData(req, res, 'SELECT * FROM PHONE_GPS_TRACKER WHERE TOURID = ?;' );
  return data;
};

const all_get = async (req, res) => {
  const data = await fetchData(req, res, 'SELECT * FROM PHONE_GPS_TRACKER;' );
  return data;
};

const post_pos = async (req, res) => {
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

    res.status(201).json({
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
    res.status(500).json({ error: 'Failed to process tracker data' });
  }
}

export default {
  pos_get,
  tour_get,
  all_get,
  post_pos
};