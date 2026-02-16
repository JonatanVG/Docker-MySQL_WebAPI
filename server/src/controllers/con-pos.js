import fetchData from '../model/mod-pos.js';

const pos_get = async (req, res) => {
  const data = await fetchData(req, res, 'SELECT * FROM gps_tracking WHERE posID =?;' );
  return data;
};

const tour_get = async (req, res) => {
  const data = await fetchData(req, res, 'SELECT * FROM gps_tracking WHERE tourID = ?;' );
  return data;
};

const all_get = async (req, res) => {
  const data = await fetchData(req, res, 'SELECT * FROM gps_tracking;' );
  return data;
};

export default {
  pos_get,
  tour_get,
  all_get
};